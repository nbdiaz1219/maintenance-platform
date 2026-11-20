const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const validate = require("../middleware/validate");
const { assetsRead, assetsWrite, assetsDelete } = require("../middleware/routeGuards");
const { getAccessibleSiteIds, buildSiteIdFilter, assertSiteAccess } = require("../services/siteAccessService");
const { recordAudit } = require("../services/auditService");

const router = express.Router();

const caseInclude = {
  site: { select: { id: true, name: true } },
  assets: {
    select: { id: true, name: true, serialNumber: true, assetType: true, operationalStatus: true },
    orderBy: { name: "asc" },
  },
};

const createSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().trim().max(120).optional(),
  serialNumber: z.string().trim().min(1).max(80),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  serialNumber: z.string().trim().min(1).max(80).optional(),
  assetIds: z.array(z.string().min(1)).optional(),
});

const shipSchema = z.object({
  siteId: z.string().min(1),
});

function sendServiceError(error, res, next) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.code === "P2002") return res.status(409).json({ error: "That case serial number is already in use" });
  return next(error);
}

router.get("/", ...assetsRead, async (req, res, next) => {
  try {
    const siteIds = await getAccessibleSiteIds(req.user);
    const siteId = String(req.query.siteId || "").trim();
    if (siteId) await assertSiteAccess(req.user, siteId);
    const cases = await prisma.travelCase.findMany({
      where: siteId ? { siteId } : buildSiteIdFilter(siteIds),
      include: caseInclude,
      orderBy: [{ serialNumber: "asc" }],
    });
    res.json(cases);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.post("/", ...assetsWrite, validate(createSchema), async (req, res, next) => {
  try {
    await assertSiteAccess(req.user, req.validated.siteId);
    const serialNumber = req.validated.serialNumber;
    const travelCase = await prisma.travelCase.create({
      data: {
        siteId: req.validated.siteId,
        serialNumber,
        name: req.validated.name || `Case ${serialNumber}`,
      },
      include: caseInclude,
    });
    await recordAudit({
      action: "case.created",
      entityType: "travelCase",
      entityId: travelCase.id,
      actorId: req.user.id,
      metadata: { serialNumber, siteId: travelCase.siteId },
    });
    res.status(201).json(travelCase);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.patch("/:id", ...assetsWrite, validate(updateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.travelCase.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Case not found" });
    await assertSiteAccess(req.user, existing.siteId);

    const travelCase = await prisma.$transaction(async (tx) => {
      if (req.validated.assetIds) {
        const assets = await tx.asset.findMany({
          where: { id: { in: req.validated.assetIds } },
          select: { id: true, siteId: true },
        });
        if (assets.length !== req.validated.assetIds.length) {
          throw Object.assign(new Error("One or more assets were not found"), { status: 400 });
        }
        if (assets.some((asset) => asset.siteId !== existing.siteId)) {
          throw Object.assign(new Error("Pack only equipment that is at this case's site"), { status: 400 });
        }
        await tx.asset.updateMany({
          where: { caseId: existing.id, id: { notIn: req.validated.assetIds } },
          data: { caseId: null },
        });
        if (req.validated.assetIds.length > 0) {
          await tx.asset.updateMany({
            where: { id: { in: req.validated.assetIds } },
            data: { caseId: existing.id },
          });
        }
      }

      return tx.travelCase.update({
        where: { id: existing.id },
        data: {
          name: req.validated.name,
          serialNumber: req.validated.serialNumber,
        },
        include: caseInclude,
      });
    });

    await recordAudit({
      action: "case.updated",
      entityType: "travelCase",
      entityId: travelCase.id,
      actorId: req.user.id,
      metadata: { serialNumber: travelCase.serialNumber, assetCount: travelCase.assets.length },
    });
    res.json(travelCase);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.post("/:id/ship", ...assetsWrite, validate(shipSchema), async (req, res, next) => {
  try {
    const existing = await prisma.travelCase.findUnique({
      where: { id: req.params.id },
      include: { assets: { select: { id: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Case not found" });
    await assertSiteAccess(req.user, existing.siteId);
    await assertSiteAccess(req.user, req.validated.siteId);
    if (req.validated.siteId === existing.siteId) {
      return res.status(400).json({ error: "Choose the site this case is shipping to" });
    }
    if (existing.assets.length === 0) {
      return res.status(400).json({ error: "Pack equipment into the case before shipping it" });
    }

    const destination = await prisma.site.findUnique({ where: { id: req.validated.siteId } });
    if (!destination) return res.status(404).json({ error: "Destination site not found" });

    const travelCase = await prisma.$transaction(async (tx) => {
      await tx.asset.updateMany({
        where: { caseId: existing.id },
        data: { siteId: destination.id },
      });
      return tx.travelCase.update({
        where: { id: existing.id },
        data: { siteId: destination.id, shippedAt: new Date() },
        include: caseInclude,
      });
    });

    await recordAudit({
      action: "case.shipped",
      entityType: "travelCase",
      entityId: travelCase.id,
      actorId: req.user.id,
      metadata: {
        serialNumber: travelCase.serialNumber,
        fromSiteId: existing.siteId,
        toSiteId: destination.id,
        assetCount: travelCase.assets.length,
      },
    });
    res.json(travelCase);
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

router.delete("/:id", ...assetsDelete, async (req, res, next) => {
  try {
    const existing = await prisma.travelCase.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Case not found" });
    await assertSiteAccess(req.user, existing.siteId);
    await prisma.$transaction(async (tx) => {
      await tx.asset.updateMany({ where: { caseId: existing.id }, data: { caseId: null } });
      await tx.travelCase.delete({ where: { id: existing.id } });
    });
    await recordAudit({
      action: "case.deleted",
      entityType: "travelCase",
      entityId: existing.id,
      actorId: req.user.id,
      metadata: { serialNumber: existing.serialNumber },
    });
    res.status(204).send();
  } catch (error) {
    sendServiceError(error, res, next);
  }
});

module.exports = router;
