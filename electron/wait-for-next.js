const http = require("http");

const targetUrl = process.argv[2] || "http://localhost:3100";
const timeoutMs = Number(process.env.QUESTFLOW_DEV_SERVER_TIMEOUT_MS || 60000);
const startedAt = Date.now();

const check = () => {
  const request = http.get(targetUrl, (response) => {
    response.resume();
    if (response.statusCode && response.statusCode < 500) {
      process.exit(0);
      return;
    }
    retry();
  });

  request.on("error", retry);
  request.setTimeout(1500, () => request.destroy());
};

const retry = () => {
  if (Date.now() - startedAt > timeoutMs) {
    console.error(`Next dev server was not healthy within ${Math.round(timeoutMs / 1000)}s: ${targetUrl}`);
    process.exit(1);
    return;
  }
  setTimeout(check, 500);
};

check();
