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

describeIfDb("submitted reports", () => {
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
      .send({ hours: 2.5, workDate: "2026-07-10", note: "Submitted report" });
  });

  it("lists submitted time reports with totals", async () => {
    const response = await request(app)
      .get("/api/time-entries/submitted")
      .set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.totals).toEqual({ hours: 2.5, entries: 1, people: 1 });
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0].note).toBe("Submitted report");
    expect(response.body.entries[0].workOrder.asset.id).toBe(assetId);
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/time-entries/submitted");
    expect(response.status).toBe(401);
  });
});
