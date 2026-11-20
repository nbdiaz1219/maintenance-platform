const express = require("express");
const prisma = require("../lib/prisma");
const { workOrdersRead } = require("../middleware/routeGuards");
const { getAccessibleSiteIds, buildSiteIdFilter } = require("../services/siteAccessService");
const { USER_PUBLIC_SELECT } = require("../lib/userSelect");

const router = express.Router();

/**
 * Work-orders list for reporting.
 * GET /api/reports/work-orders?search=&status=&priority=&siteId=&assetId=&assigneeId=
 * Site-scoped like GET /api/workorders; each row carries its logged hours.
 */
router.get("/", ...workOrdersRead, async (req, res, next) => {
  try {
    const siteIds = await getAccessibleSiteIds(req.user);
    const siteFilter = buildSiteIdFilter(siteIds);
    const { search, status, priority, siteId, assetId, assigneeId } = req.query;

    if (siteId && siteFilter.siteId?.in && !siteFilter.siteId.in.includes(siteId)) {
      return res.status(403).json({ error: "Forbidden", message: "Site not in your access" });
    }

    const workOrders = await prisma.workOrder.findMany({
      where: {
        ...(siteId ? { siteId } : siteFilter),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assetId ? { assetId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { asset: { name: { contains: search, mode: "insensitive" } } },
                { site: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        asset: true,
        assignee: { select: USER_PUBLIC_SELECT },
        requester: { select: USER_PUBLIC_SELECT },
        site: true,
        timeEntries: { include: { user: { select: USER_PUBLIC_SELECT } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = workOrders.map((order) => {
      const totalHours = order.timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
      return { ...order, totalHours: Math.round(totalHours * 100) / 100 };
    });

    res.json({
      workOrders: rows,
      totals: {
        workOrders: rows.length,
        open: rows.filter((order) => order.status === "OPEN" || order.status === "ON_HOLD").length,
        inProgress: rows.filter((order) => order.status === "IN_PROGRESS").length,
        completed: rows.filter((order) => order.status === "COMPLETED").length,
        hours: Math.round(rows.reduce((sum, order) => sum + order.totalHours, 0) * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
