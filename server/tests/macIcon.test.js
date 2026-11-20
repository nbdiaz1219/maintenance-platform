const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

describe("Mac download icon", () => {
  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), "emat-dl-"));
  const iconPath = path.join(__dirname, "..", "assets", "AppIcon.icns");
  let buildReadyZipFile;

  beforeAll(() => {
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), "emat-src-"));
    const contents = path.join(stage, "Electron.app", "Contents");
    fs.mkdirSync(path.join(contents, "Resources"), { recursive: true });
    fs.writeFileSync(
      path.join(contents, "Info.plist"),
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CFBundleIconFile</key><string>electron.icns</string>
  <key>CFBundleName</key><string>Electron</string>
  <key>CFBundleDisplayName</key><string>Electron</string>
</dict></plist>
`,
    );
    fs.writeFileSync(path.join(contents, "Resources", "electron.icns"), "default-electron-icon");
    execFileSync("zip", ["-qry", path.join(downloads, "EMAT-mac.zip"), "Electron.app"], { cwd: stage });

    process.env.EMAT_DOWNLOADS_DIR = downloads;
    jest.resetModules();
    ({ buildReadyZipFile } = require("../src/routes/join"));
  });

  it("replaces the Electron icon and display name in the download", () => {
    const buffer = buildReadyZipFile("https://emat-production.up.railway.app");
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "emat-out-"));
    const zipPath = path.join(outDir, "ready.zip");
    fs.writeFileSync(zipPath, buffer);
    execFileSync("unzip", ["-qo", zipPath, "-d", outDir]);

    const app = path.join(outDir, "EMAT Tracking Database.app");
    const resources = path.join(app, "Contents", "Resources");
    const expected = fs.readFileSync(iconPath);
    expect(fs.existsSync(app)).toBe(true);
    expect(fs.readFileSync(path.join(resources, "AppIcon.icns"))).toEqual(expected);
    expect(fs.readFileSync(path.join(resources, "electron.icns"))).toEqual(expected);

    const plist = fs.readFileSync(path.join(app, "Contents", "Info.plist"), "utf8");
    expect(plist).toContain("<string>EMAT Tracking Database</string>");
    expect(plist).not.toContain("<string>Electron</string>");
    expect(plist).toContain("<string>AppIcon</string>");
  });
});
