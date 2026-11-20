const prisma = require("../lib/prisma");

function cleanTypeName(name) {
  return String(name || "").trim();
}

async function listAssetTypes(siteFilter) {
  const types = await prisma.assetType.findMany({
    where: siteFilter,
    include: { site: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  if (types.length === 0) return [];

  const counts = await prisma.asset.groupBy({
    by: ["siteId", "assetType"],
    where: {
      OR: types.map((type) => ({ siteId: type.siteId, assetType: type.name })),
    },
    _count: { _all: true },
  });
  const countByKey = new Map(counts.map((row) => [`${row.siteId}:${row.assetType}`, row._count._all]));

  return types.map((type) => ({
    ...type,
    assetCount: countByKey.get(`${type.siteId}:${type.name}`) || 0,
  }));
}

async function ensureAssetType(siteId, name) {
  const trimmed = cleanTypeName(name);
  if (!trimmed || trimmed.toLowerCase() === "uncategorized") return null;

  const existing = await prisma.assetType.findFirst({
    where: { siteId, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;

  const last = await prisma.assetType.findFirst({
    where: { siteId },
    orderBy: { sortOrder: "desc" },
  });

  return prisma.assetType.create({
    data: { siteId, name: trimmed, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
}

async function createAssetType(siteId, name) {
  const trimmed = cleanTypeName(name);
  if (!trimmed || trimmed.length > 80) {
    throw Object.assign(new Error("Type name is required"), { status: 400 });
  }
  const duplicate = await prisma.assetType.findFirst({
    where: { siteId, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (duplicate) {
    throw Object.assign(new Error("That type already exists at this site"), { status: 409 });
  }
  return ensureAssetType(siteId, trimmed);
}

async function renameAssetType(type, name) {
  const trimmed = cleanTypeName(name);
  if (!trimmed || trimmed.length > 80) {
    throw Object.assign(new Error("Type name is required"), { status: 400 });
  }
  if (trimmed.toLowerCase() === "uncategorized") {
    throw Object.assign(new Error("Uncategorized is reserved"), { status: 400 });
  }
  const duplicate = await prisma.assetType.findFirst({
    where: {
      siteId: type.siteId,
      id: { not: type.id },
      name: { equals: trimmed, mode: "insensitive" },
    },
  });
  if (duplicate) {
    throw Object.assign(new Error("That type already exists at this site"), { status: 409 });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.assetType.update({
      where: { id: type.id },
      data: { name: trimmed },
    });
    await tx.asset.updateMany({
      where: { siteId: type.siteId, assetType: type.name },
      data: { assetType: trimmed },
    });
    return updated;
  });
}

async function reorderAssetTypes(siteId, orderedIds) {
  const existing = await prisma.assetType.findMany({ where: { siteId }, select: { id: true } });
  const known = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== known.size || orderedIds.some((id) => !known.has(id))) {
    throw Object.assign(new Error("Type order must include every type for this site"), { status: 400 });
  }
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.assetType.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  return listAssetTypes({ siteId });
}

async function deleteAssetType(type, reassignTo) {
  const count = await prisma.asset.count({
    where: { siteId: type.siteId, assetType: type.name },
  });
  const destination = cleanTypeName(reassignTo);
  if (count > 0 && !destination) {
    throw Object.assign(new Error("Move the assets to another type before removing this one"), {
      status: 409,
    });
  }

  await prisma.$transaction(async (tx) => {
    if (count > 0) {
      await tx.asset.updateMany({
        where: { siteId: type.siteId, assetType: type.name },
        data: { assetType: destination },
      });
    }
    await tx.assetType.delete({ where: { id: type.id } });
  });

  if (destination && destination.toLowerCase() !== "uncategorized") {
    await ensureAssetType(type.siteId, destination);
  }
}

module.exports = {
  listAssetTypes,
  ensureAssetType,
  createAssetType,
  renameAssetType,
  reorderAssetTypes,
  deleteAssetType,
};
