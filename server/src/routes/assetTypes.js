const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const validate = require("../middleware/validate");
const { assetsRead, assetTypesManage } = require("../middleware/routeGuards");
const { getAccessibleSiteIds, buildSiteIdFilter, assertSiteAccess } = require("../services/siteAccessService");
const {
  listAssetTypes,
  createAssetType,
  renameAssetType,
  reorderAssetTypes,
  deleteAssetType,
} = require("../services/assetTypeService");
const { recordAudit } = require("../services/auditService");

const router = express.Router();

const createSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const reorderSchema = z.object({
  siteId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

function sendServiceError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

router.get("/", ...assetsRead, async (req, res, next) => {
  try {
    const siteIds = await getAccessibleSiteIds(req.user);
    const siteId = String(req.query.siteId || "").trim();
    if (siteId) {
      await assertSiteAccess(req.user, siteId);
    }
    const siteFilter = siteId ? { siteId } : buildSiteIdFilter(siteIds);
    res.json(await listAssetTypes(siteFilter));
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.post("/", ...assetTypesManage, validate(createSchema), async (req, res, next) => {
  try {
    await assertSiteAccess(req.user, req.validated.siteId);
    const type = await createAssetType(req.validated.siteId, req.validated.name);
    await recordAudit({
      action: "asset-type.created",
      entityType: "assetType",
      entityId: type.id,
      actorId: req.user.id,
      metadata: { name: type.name, siteId: type.siteId },
    });
    res.status(201).json(type);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.patch("/reorder", ...assetTypesManage, validate(reorderSchema), async (req, res, next) => {
  try {
    await assertSiteAccess(req.user, req.validated.siteId);
    const types = await reorderAssetTypes(req.validated.siteId, req.validated.orderedIds);
    res.json(types);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.patch("/:id", ...assetTypesManage, validate(renameSchema), async (req, res, next) => {
  try {
    const existing = await prisma.assetType.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Asset type not found" });
    await assertSiteAccess(req.user, existing.siteId);
    const updated = await renameAssetType(existing, req.validated.name);
    await recordAudit({
      action: "asset-type.renamed",
      entityType: "assetType",
      entityId: updated.id,
      actorId: req.user.id,
      metadata: { from: existing.name, to: updated.name, siteId: existing.siteId },
    });
    res.json(updated);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.delete("/:id", ...assetTypesManage, async (req, res, next) => {
  try {
    const existing = await prisma.assetType.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Asset type not found" });
    await assertSiteAccess(req.user, existing.siteId);
    await deleteAssetType(existing, req.body?.reassignTo);
    await recordAudit({
      action: "asset-type.deleted",
      entityType: "assetType",
      entityId: existing.id,
      actorId: req.user.id,
      metadata: { name: existing.name, siteId: existing.siteId, reassignTo: req.body?.reassignTo || null },
    });
    res.status(204).send();
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

module.exports = router;
