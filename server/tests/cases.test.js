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

describeIfDb("travel cases", () => {
  let app;

  beforeAll(() => {
    app = getApp();
  });

  setupDbHooks();

  it("packs equipment into a serialized case and ships that case to another site", async () => {
    const { response } = await registerUser(app, { role: "OPS_LEAD" });
    const token = response.body.token;
    const yard = (await createSite(app, token, { name: "Yard" })).response.body;
    const dock = (await createSite(app, token, { name: "Dock" })).response.body;
    const robot = (await createAsset(app, token, yard.id, { name: "Spot", assetType: "Robots" })).response.body;
    const arm = (await createAsset(app, token, yard.id, { name: "Arm 1", assetType: "Raster arms" })).response.body;

    const created = await request(app)
      .post("/api/cases")
      .set(authHeader(token))
      .send({ siteId: yard.id, serialNumber: "CASE-100", name: "Robot case" });
    expect(created.status).toBe(201);
    expect(created.body.serialNumber).toBe("CASE-100");

    const packed = await request(app)
      .patch(`/api/cases/${created.body.id}`)
      .set(authHeader(token))
      .send({ assetIds: [robot.id, arm.id] });
    expect(packed.status).toBe(200);
    expect(packed.body.assets.map((asset) => asset.name).sort()).toEqual(["Arm 1", "Spot"]);

    const shipped = await request(app)
      .post(`/api/cases/${created.body.id}/ship`)
      .set(authHeader(token))
      .send({ siteId: dock.id });
    expect(shipped.status).toBe(200);
    expect(shipped.body.siteId).toBe(dock.id);
    expect(shipped.body.shippedAt).toBeTruthy();

    const assets = await request(app).get("/api/assets").set(authHeader(token));
    const moved = assets.body.filter((asset) => [robot.id, arm.id].includes(asset.id));
    expect(moved.every((asset) => asset.siteId === dock.id && asset.caseId === created.body.id)).toBe(true);
  });

  it("renames a case and adds a component into it", async () => {
    const { response } = await registerUser(app, { role: "ADMIN" });
    const token = response.body.token;
    const site = (await createSite(app, token, { name: "Shop" })).response.body;
    const created = await request(app)
      .post("/api/cases")
      .set(authHeader(token))
      .send({ siteId: site.id, name: "Kit", serialNumber: "CASE-200" });

    const renamed = await request(app)
      .patch(`/api/cases/${created.body.id}`)
      .set(authHeader(token))
      .send({ name: "Spot travel kit" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe("Spot travel kit");

    const added = await request(app)
      .post(`/api/cases/${created.body.id}/components`)
      .set(authHeader(token))
      .send({ name: "Spot", assetType: "Robots", serialNumber: "SP-1" });
    expect(added.status).toBe(201);
    expect(added.body.assets).toEqual([
      expect.objectContaining({ name: "Spot", assetType: "Robots", serialNumber: "SP-1" }),
    ]);
  });

  it("blocks an ops lead from creating a case at a site they cannot access", async () => {
    const admin = await registerUser(app, { role: "ADMIN" });
    const lead = await registerUser(app, { role: "OPS_LEAD" });
    const site = (await createSite(app, admin.response.body.token, { name: "Restricted" })).response.body;

    const response = await request(app)
      .post("/api/cases")
      .set(authHeader(lead.response.body.token))
      .send({ siteId: site.id, name: "Restricted case", serialNumber: "CASE-9" });

    expect(response.status).toBe(403);
  });
});
