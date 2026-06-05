import { promises as fs } from "fs";
import path from "path";

export type WebDavConfig = {
  url: string;
  username: string;
  password: string;
  filePath: string;
};

export const defaultWebDavFilePath = "questflow/questflow-backup-v12.json";
export const legacyWebDavFilePath = "questflow/questflow-backup.json";

const configFileName = ".questflow-webdav.local.json";

export const getWebDavConfigFilePath = () => {
  const configuredPath = process.env.QUESTFLOW_WEBDAV_CONFIG?.trim();
  return configuredPath ? path.resolve(configuredPath) : path.join(process.cwd(), configFileName);
};

export const readWebDavConfig = async (): Promise<Partial<WebDavConfig>> => {
  const configFilePath = getWebDavConfigFilePath();
  try {
    const raw = await fs.readFile(configFilePath, "utf8");
    return JSON.parse(raw) as Partial<WebDavConfig>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
};

export const writeWebDavConfig = async (config: WebDavConfig) => {
  const configFilePath = getWebDavConfigFilePath();
  await fs.mkdir(path.dirname(configFilePath), { recursive: true });
  await fs.writeFile(configFilePath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
};

export const getPublicWebDavConfig = (config: Partial<WebDavConfig>) => ({
  url: config.url ?? "",
  username: config.username ?? "",
  filePath: config.filePath ?? defaultWebDavFilePath,
  hasPassword: Boolean(config.password)
});

export const resolveWebDavConfig = async (
  override?: Partial<WebDavConfig>
): Promise<WebDavConfig> => {
  const stored = await readWebDavConfig();
  const config = {
    url: override?.url ?? stored.url ?? "",
    username: override?.username ?? stored.username ?? "",
    password: override?.password ?? stored.password ?? "",
    filePath: override?.filePath ?? stored.filePath ?? defaultWebDavFilePath
  };

  if (!config.url || !config.username || !config.password || !config.filePath) {
    throw new Error("WebDAV 配置不完整，请先填写地址、账户、密码和存档路径。");
  }

  return config;
};
