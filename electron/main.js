const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

let mainWindow;
let nextServerProcess;
let isQuitting = false;

const isDev = !app.isPackaged;
const devUrl = process.env.QUESTFLOW_DEV_URL || "http://localhost:3000";

const findOpenPort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

const waitForHttp = (url, timeoutMs = 30000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`QuestFlow server did not become ready: ${url}`));
          return;
        }
        setTimeout(attempt, 250);
      });

      request.setTimeout(1000, () => request.destroy());
    };

    attempt();
  });

const startNextServer = async () => {
  if (isDev) {
    return devUrl;
  }

  const serverPath = path.join(process.resourcesPath, "next", "server.js");
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Next standalone server not found: ${serverPath}`);
  }

  const port = process.env.QUESTFLOW_PORT || String(await findOpenPort());
  const url = `http://127.0.0.1:${port}`;
  const webDavConfigPath = path.join(app.getPath("userData"), "questflow-webdav.local.json");

  nextServerProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: port,
      QUESTFLOW_WEBDAV_CONFIG: webDavConfigPath
    },
    stdio: "ignore"
  });

  nextServerProcess.on("exit", (code) => {
    if (!isQuitting && code !== 0) {
      dialog.showErrorBox("QuestFlow", `Local QuestFlow server exited with code ${code}.`);
    }
  });

  await waitForHttp(url);
  return url;
};

const isInternalUrl = (targetUrl, appUrl) => {
  try {
    return new URL(targetUrl).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
};

const createWindow = async () => {
  const appUrl = await startNextServer();

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    title: "QuestFlow",
    backgroundColor: "#f7f0de",
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url, appUrl)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isInternalUrl(url, appUrl)) {
      return;
    }

    event.preventDefault();
    shell.openExternal(url);
  });

  await mainWindow.loadURL(appUrl);
};

const stopNextServer = () => {
  if (nextServerProcess && !nextServerProcess.killed) {
    nextServerProcess.kill();
  }
  nextServerProcess = undefined;
};

app.whenReady().then(() => {
  createWindow().catch((error) => {
    dialog.showErrorBox("QuestFlow failed to start", error instanceof Error ? error.message : String(error));
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        dialog.showErrorBox("QuestFlow failed to start", error instanceof Error ? error.message : String(error));
      });
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  stopNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
