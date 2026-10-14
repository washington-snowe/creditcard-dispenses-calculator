const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
let window;
let writes = Promise.resolve();
// A separate data path is useful for automated tests; normal runs use Electron userData.
if (process.env.SALDO_DATA_DIR)
  app.setPath("userData", path.resolve(process.env.SALDO_DATA_DIR));
const dataPath = () => path.join(app.getPath("userData"), "finances.json");
const index = pathToFileURL(path.join(__dirname, "../dist/index.html")).href;
function checkSender(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame?.url !== index
  )
    throw new Error("Origem não autorizada.");
}
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();
app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});
app.whenReady().then(() => {
  if (!hasLock) return;
  ipcMain.handle("saldo:load", async (event) => {
    checkSender(event);
    try {
      return JSON.parse(await fs.readFile(dataPath(), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw new Error(
        "Não foi possível ler os dados locais. Preserve finances.json antes de restaurar um backup.",
      );
    }
  });
  ipcMain.handle("saldo:save", async (event, data) => {
    checkSender(event);
    const json = JSON.stringify(data);
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.cards) ||
      !Array.isArray(data.purchases) ||
      Buffer.byteLength(json) > 5_000_000
    )
      throw new Error("Dados inválidos ou muito grandes.");
    const write = writes
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(app.getPath("userData"), { recursive: true });
        const temp = dataPath() + ".tmp";
        const file = await fs.open(temp, "w", 0o600);
        try {
          await file.writeFile(json, "utf8");
          await file.sync();
        } finally {
          await file.close();
        }
        await fs.rename(temp, dataPath());
      });
    writes = write;
    await write;
  });
  const createWindow = () => {
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 980,
      minHeight: 700,
      title: "Saldo",
      backgroundColor: "#f5f7fb",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (url !== index) event.preventDefault();
    });
    window.webContents.session.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    window.loadURL(index);
  };
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", (event) => {
  if (writes) {
    event.preventDefault();
    const pending = writes;
    writes = null;
    pending.catch(() => {}).finally(() => app.quit());
  }
});
