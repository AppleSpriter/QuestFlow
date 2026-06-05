import { NextResponse } from "next/server";
import { legacyWebDavFilePath, resolveWebDavConfig, type WebDavConfig } from "@/lib/server/webdav-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WebDavAction = "test" | "download" | "upload";

type WebDavFileTarget = "primary" | "legacy";

type WebDavRequest = {
  action: WebDavAction;
  config?: Partial<WebDavConfig>;
  payload?: unknown;
  target?: WebDavFileTarget;
};

const getAuthHeader = (config: WebDavConfig) =>
  `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const getTargetFilePath = (config: WebDavConfig, target?: WebDavFileTarget) =>
  target === "legacy" ? legacyWebDavFilePath : config.filePath;

const getTargetUrl = (config: WebDavConfig, target?: WebDavFileTarget) => {
  const base = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const url = new URL(trimSlashes(getTargetFilePath(config, target)), base);
  return url.toString();
};

const getCollectionUrls = (config: WebDavConfig, target?: WebDavFileTarget) => {
  const parts = trimSlashes(getTargetFilePath(config, target)).split("/").filter(Boolean);
  parts.pop();

  const base = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const urls: string[] = [];
  let current = base;

  for (const part of parts) {
    current = new URL(`${encodeURIComponent(part)}/`, current).toString();
    urls.push(current);
  }

  return urls;
};

const ensureCollections = async (config: WebDavConfig, authHeader: string, target?: WebDavFileTarget) => {
  for (const url of getCollectionUrls(config, target)) {
    const response = await fetch(url, {
      method: "MKCOL",
      headers: { Authorization: authHeader }
    });

    if (![200, 201, 405, 409].includes(response.status)) {
      const text = await response.text().catch(() => "");
      throw new Error(`创建目录失败 (${response.status}) ${text.slice(0, 180)}`);
    }
  }
};

const testConnection = async (config: WebDavConfig, authHeader: string) => {
  const base = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const propfind = await fetch(base, {
    method: "PROPFIND",
    headers: {
      Authorization: authHeader,
      Depth: "0"
    }
  });

  if (propfind.ok || propfind.status === 207) {
    return { ok: true, status: propfind.status, message: "WebDAV 连接成功。" };
  }

  const options = await fetch(base, {
    method: "OPTIONS",
    headers: { Authorization: authHeader }
  });

  if (options.ok) {
    return { ok: true, status: options.status, message: "WebDAV 连接成功。" };
  }

  const text = await propfind.text().catch(() => "");
  return {
    ok: false,
    status: propfind.status,
    message: `WebDAV 连接失败 (${propfind.status}) ${text.slice(0, 180)}`
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WebDavRequest;
    const config = await resolveWebDavConfig(body.config);
    const authHeader = getAuthHeader(config);
    const targetUrl = getTargetUrl(config, body.target);

    if (body.action === "test") {
      const result = await testConnection(config, authHeader);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (body.action === "download") {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: { Authorization: authHeader }
      });

      if (response.status === 404) {
        return NextResponse.json({ ok: true, missing: true });
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            message: `下载云端存档失败 (${response.status}) ${text.slice(0, 180)}`
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        missing: false,
        data: await response.text(),
        lastModified: response.headers.get("last-modified"),
        etag: response.headers.get("etag")
      });
    }

    if (body.action === "upload") {
      await ensureCollections(config, authHeader, body.target);
      const content =
        typeof body.payload === "string"
          ? body.payload
          : JSON.stringify(body.payload ?? {}, null, 2);
      const response = await fetch(targetUrl, {
        method: "PUT",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: content
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            message: `上传云端存档失败 (${response.status}) ${text.slice(0, 180)}`
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        status: response.status,
        message: "云端存档已更新。"
      });
    }

    return NextResponse.json({ ok: false, message: "未知 WebDAV 操作。" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "WebDAV 操作失败。" },
      { status: 400 }
    );
  }
}
