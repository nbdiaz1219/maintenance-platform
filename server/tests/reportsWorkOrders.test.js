const request = require("supertest");
const {
  describeIfDb,
  getApp,
  registerUser,
  createSite,
  createAsset,
  setupDbHooks,
  authHeader,
} = require("./helpers");

describeIfDb("work orders report", () => {
  let app;
  let token;
  let siteId;
  let assetId;
  let workOrderId;

  beforeAll(() => {
    app = getApp();
  });

  setupDbHooks();

  beforeEach(async () => {
    const { response } = await registerUser(app);
    token = response.body.token;

    const { response: siteResponse } = await createSite(app, token);
    siteId = siteResponse.body.id;

    const { response: assetResponse } = await createAsset(app, token, siteId);
    assetId = assetResponse.body.id;

    const workOrderResponse = await request(app)
      .post("/api/workorders")
      .set(authHeader(token))
      .send({ title: "Fix pump", siteId, assetId });
    workOrderId = workOrderResponse.body.id;

    await request(app)
      .post(`/api/workorders/${workOrderId}/time-entries`)
      .set(authHeader(token))
      .send({ hours: 2.5, workDate: "2026-07-10", note: "Report hours" });
  });

  it("lists work orders for reporting with totals", async () => {
    const response = await request(app)
      .get("/api/reports/work-orders")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.totals).toEqual({
      workOrders: 1,
      open: 1,
      inProgress: 0,
      completed: 0,
      hours: 2.5,
    });
    expect(response.body.workOrders).toHaveLength(1);
    expect(response.body.workOrders[0].id).toBe(workOrderId);
    expect(response.body.workOrders[0].totalHours).toBe(2.5);
    expect(response.body.workOrders[0].asset.id).toBe(assetId);
  });

  it("filters the work-orders list by status", async () => {
    const response = await request(app)
      .get("/api/reports/work-orders?status=COMPLETED")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.workOrders).toHaveLength(0);
    expect(response.body.totals.workOrders).toBe(0);
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/reports/work-orders");
    expect(response.status).toBe(401);
  });
});
