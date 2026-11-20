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

describeIfDb("asset type catalog", () => {
  let app;

  beforeAll(() => {
    app = getApp();
  });

  setupDbHooks();

  it("lets an ops lead organize types for their site and renames the assets", async () => {
    const { response } = await registerUser(app, { role: "OPS_LEAD" });
    const token = response.body.token;
    const site = (await createSite(app, token, { name: "Dock" })).response.body;
    const created = await request(app)
      .post("/api/asset-types")
      .set(authHeader(token))
      .send({ siteId: site.id, name: "Robots" });

    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Robots");

    const asset = (await createAsset(app, token, site.id, { name: "Spot", assetType: "Robots" })).response.body;
    const renamed = await request(app)
      .patch(`/api/asset-types/${created.body.id}`)
      .set(authHeader(token))
      .send({ name: "Inspection robots" });

    expect(renamed.status).toBe(200);
    const listed = await request(app).get("/api/assets").set(authHeader(token));
    expect(listed.body.find((row) => row.id === asset.id).assetType).toBe("Inspection robots");
  });

  it("blocks an ops lead from organizing another site", async () => {
    const admin = await registerUser(app, { role: "ADMIN" });
    const lead = await registerUser(app, { role: "OPS_LEAD" });
    const site = (await createSite(app, admin.response.body.token, { name: "Restricted" })).response.body;

    const response = await request(app)
      .post("/api/asset-types")
      .set(authHeader(lead.response.body.token))
      .send({ siteId: site.id, name: "Raster arms" });

    expect(response.status).toBe(403);
  });

  it("blocks operators from changing the catalog", async () => {
    const { response } = await registerUser(app, { role: "OPERATOR" });
    const token = response.body.token;
    const site = (await createSite(app, token, { name: "Floor" })).response.body;

    const created = await request(app)
      .post("/api/asset-types")
      .set(authHeader(token))
      .send({ siteId: site.id, name: "Crawlers" });

    expect(created.status).toBe(403);
  });

  it("reorders types and refuses to delete a type that still has assets", async () => {
    const { response } = await registerUser(app, { role: "ADMIN" });
    const token = response.body.token;
    const site = (await createSite(app, token, { name: "Yard" })).response.body;
    const robots = await request(app)
      .post("/api/asset-types")
      .set(authHeader(token))
      .send({ siteId: site.id, name: "Robots" });
    const arms = await request(app)
      .post("/api/asset-types")
      .set(authHeader(token))
      .send({ siteId: site.id, name: "Raster arms" });

    const reordered = await request(app)
      .patch("/api/asset-types/reorder")
      .set(authHeader(token))
      .send({ siteId: site.id, orderedIds: [arms.body.id, robots.body.id] });

    expect(reordered.status).toBe(200);
    expect(reordered.body.map((type) => type.name)).toEqual(["Raster arms", "Robots"]);

    await createAsset(app, token, site.id, { name: "Arm 1", assetType: "Raster arms" });
    const blocked = await request(app).delete(`/api/asset-types/${arms.body.id}`).set(authHeader(token));
    expect(blocked.status).toBe(409);

    const removed = await request(app)
      .delete(`/api/asset-types/${arms.body.id}`)
      .set(authHeader(token))
      .send({ reassignTo: "Robots" });
    expect(removed.status).toBe(204);

    const assets = await request(app).get("/api/assets").set(authHeader(token));
    expect(assets.body.find((row) => row.name === "Arm 1").assetType).toBe("Robots");
  });
});
