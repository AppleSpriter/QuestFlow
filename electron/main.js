const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

let mainWindow;
let nextServerProcess;
let isQuitting = false;
let lastServerOutput = "";

const isDev = !app.isPackaged;
const devUrl = process.env.QUESTFLOW_DEV_URL || "http://localhost:3000";
const serverReadyTimeoutMs = Number(process.env.QUESTFLOW_SERVER_TIMEOUT_MS || 60000);
const appIconPath = isDev
  ? path.join(__dirname, "..", "public", "logo.png")
  : path.join(process.resourcesPath, "next", "public", "logo.png");

const appendCrashLog = (message) => {
  try {
    const logDir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, "questflow-crash.log"), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // Ignore logging failures so crash handling never creates a second failure path.
  }
};

const getCrashLogPath = () => path.join(app.getPath("userData"), "logs", "questflow-crash.log");

const recordServerOutput = (chunk) => {
  const text = chunk.toString();
  lastServerOutput = `${lastServerOutput}${text}`.slice(-4000);
  appendCrashLog(`[server] ${text.trimEnd()}`);
};

process.on("uncaughtException", (error) => {
  appendCrashLog(`[uncaughtException] ${error.stack || error.message || String(error)}`);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  appendCrashLog(`[unhandledRejection] ${message}`);
});

const findOpenPort = (preferredPort = 7654) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.on("error", () => {
      const fallback = net.createServer();
      fallback.unref();
      fallback.listen(0, "127.0.0.1", () => {
        const address = fallback.address();
        const port = typeof address === "object" && address ? address.port : 0;
        fallback.close(() => resolve(port));
      });
    });
    server.listen(preferredPort, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

const waitForHttp = (url, timeoutMs = serverReadyTimeoutMs) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retryOrFail();
      });

      const retryOrFail = () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`QuestFlow server did not become ready within ${Math.round(timeoutMs / 1000)}s: ${url}`));
          return;
        }
        setTimeout(attempt, 300);
      };

      request.on("error", retryOrFail);
      request.setTimeout(1500, () => request.destroy());
    };

    attempt();
  });

const startNextServer = async () => {
  if (isDev) {
    await waitForHttp(devUrl);
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
    stdio: ["ignore", "pipe", "pipe"]
  });

  nextServerProcess.stdout.on("data", recordServerOutput);
  nextServerProcess.stderr.on("data", recordServerOutput);

  nextServerProcess.on("exit", (code, signal) => {
    if (!isQuitting && code !== 0) {
      const suffix = signal ? `signal ${signal}` : `code ${code}`;
      showStartupError(new Error(`Local QuestFlow server exited with ${suffix}.`));
    }
  });

  nextServerProcess.on("error", (error) => {
    appendCrashLog(`[server spawn error] ${error.stack || error.message}`);
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

const createErrorHtml = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const detail = error instanceof Error && error.stack ? error.stack : message;
  const escapedMessage = message.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const escapedDetail = `${detail}\n\n${lastServerOutput ? `Recent server output:\n${lastServerOutput}` : ""}`.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const escapedLogPath = getCrashLogPath().replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QuestFlow 启动失败</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f0de; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { width: min(720px, calc(100vw - 48px)); border: 1px solid #e2e8f0; border-radius: 24px; background: rgba(255,255,255,.92); box-shadow: 0 24px 80px rgba(15,23,42,.16); padding: 32px; }
  h1 { margin: 0; font-size: 28px; }
  p { line-height: 1.7; color: #475569; }
  code, pre { background: #f1f5f9; border-radius: 12px; }
  code { padding: 2px 6px; }
  pre { max-height: 240px; overflow: auto; padding: 16px; white-space: pre-wrap; color: #334155; }
</style>
</head>
<body>
<main>
  <h1>QuestFlow 启动失败</h1>
  <p>本地 Next 服务没有成功启动。可以重启应用再试；如果仍失败，请查看日志文件：</p>
  <p><code>${escapedLogPath}</code></p>
  <p><strong>错误：</strong>${escapedMessage}</p>
  <pre>${escapedDetail}</pre>
</main>
</body>
</html>`;
};

const showStartupError = (error) => {
  appendCrashLog(`[startup error] ${error instanceof Error ? error.stack || error.message : String(error)}`);

  const errorWindow = mainWindow && !mainWindow.isDestroyed()
    ? mainWindow
    : new BrowserWindow({
        width: 820,
        height: 640,
        minWidth: 680,
        minHeight: 520,
        title: "QuestFlow 启动失败",
        backgroundColor: "#f7f0de",
        icon: appIconPath,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      });

  mainWindow = errorWindow;
  errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createErrorHtml(error))}`);
  errorWindow.show();
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
    icon: appIconPath,
    show: false,
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

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    createWindow().catch(showStartupError);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch(showStartupError);
      }
    });
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  stopNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
