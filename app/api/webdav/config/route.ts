import { NextResponse } from "next/server";
import {
  defaultWebDavFilePath,
  getPublicWebDavConfig,
  readWebDavConfig,
  writeWebDavConfig,
  type WebDavConfig
} from "@/lib/server/webdav-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readWebDavConfig();
  return NextResponse.json(getPublicWebDavConfig(config));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<WebDavConfig>;
  const current = await readWebDavConfig();
  const next: WebDavConfig = {
    url: body.url?.trim() ?? current.url ?? "",
    username: body.username?.trim() ?? current.username ?? "",
    password: body.password?.trim() || current.password || "",
    filePath: body.filePath?.trim() || current.filePath || defaultWebDavFilePath
  };

  if (!next.url || !next.username || !next.password || !next.filePath) {
    return NextResponse.json(
      { ok: false, message: "WebDAV 配置不完整。" },
      { status: 400 }
    );
  }

  await writeWebDavConfig(next);
  return NextResponse.json({ ok: true, config: getPublicWebDavConfig(next) });
}
