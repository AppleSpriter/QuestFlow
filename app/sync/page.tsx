"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  RefreshCw,
  Save,
  Server,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type QuestBackup, useQuestStore } from "@/lib/quest-store";

type PublicWebDavConfig = {
  url: string;
  username: string;
  filePath: string;
  hasPassword: boolean;
};

type Message = {
  type: "success" | "error" | "info";
  text: string;
};

type RemoteConflict = {
  remoteText: string;
  remoteUpdatedAt: string;
  localUpdatedAt: string;
};

const emptyConfig: PublicWebDavConfig = {
  url: "",
  username: "",
  filePath: "questflow/questflow-backup.json",
  hasPassword: false
};

const formatDateTime = (iso?: string) => {
  if (!iso) return "从未";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));
};

const getBackupUpdatedAt = (backup: Partial<QuestBackup>) =>
  backup.updatedAt ?? backup.exportedAt ?? new Date(0).toISOString();

const parseBackup = (raw: string) => {
  const parsed = JSON.parse(raw) as Partial<QuestBackup>;

  if (!parsed.tasks || !parsed.logs || !parsed.classStates) {
    throw new Error("云端存档格式不正确。");
  }

  return parsed as QuestBackup;
};

const downloadTextFile = (text: string, fileName: string) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

async function postWebDav<T>(body: unknown): Promise<T> {
  const response = await fetch("/api/webdav", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "WebDAV 请求失败。");
  }

  return data;
}

export default function SyncPage() {
  const tasks = useQuestStore((state) => state.tasks);
  const logs = useQuestStore((state) => state.logs);
  const totalXp = useQuestStore((state) => state.totalXp);
  const dataUpdatedAt = useQuestStore((state) => state.dataUpdatedAt);
  const lastSyncedAt = useQuestStore((state) => state.lastSyncedAt);
  const getBackupData = useQuestStore((state) => state.getBackupData);
  const exportData = useQuestStore((state) => state.exportData);
  const importData = useQuestStore((state) => state.importData);
  const clearAll = useQuestStore((state) => state.clearAll);
  const markSynced = useQuestStore((state) => state.markSynced);

  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<PublicWebDavConfig>(emptyConfig);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [conflict, setConflict] = useState<RemoteConflict | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/webdav/config")
      .then((response) => response.json())
      .then((data: PublicWebDavConfig) => setConfig({ ...emptyConfig, ...data }))
      .catch(() => {
        setMessage({ type: "error", text: "读取 WebDAV 本机配置失败。" });
      });
  }, []);

  const localBackup = useMemo(() => (mounted ? getBackupData() : null), [mounted, getBackupData, tasks, logs, totalXp, dataUpdatedAt, lastSyncedAt]);
  const localUpdatedAt = localBackup?.updatedAt;

  const setField = (key: keyof PublicWebDavConfig, value: string) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const saveConfig = async () => {
    setBusy("save");
    setMessage(null);

    try {
      const response = await fetch("/api/webdav/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "保存 WebDAV 配置失败。");
      }

      setConfig(data.config);
      setPassword("");
      setMessage({ type: "success", text: "WebDAV 配置已保存到本机忽略文件。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "保存失败。" });
    } finally {
      setBusy(null);
    }
  };

  const testConnection = async () => {
    setBusy("test");
    setMessage(null);

    try {
      const result = await postWebDav<{ ok: boolean; message: string }>({ action: "test" });
      setMessage({ type: result.ok ? "success" : "error", text: result.message });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "连接测试失败。" });
    } finally {
      setBusy(null);
    }
  };

  const uploadLocalToWebDav = async (markAsSynced = true) => {
    setBusy("webdav-export");
    setMessage(null);

    try {
      const snapshot = getBackupData();
      await postWebDav({ action: "upload", payload: snapshot });
      const syncedAt = new Date().toISOString();
      if (markAsSynced) markSynced(syncedAt);
      setMessage({ type: "success", text: "本机存档已导出到 WebDAV。" });
      return true;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "WebDAV 导出失败。" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const downloadRemoteText = async () => {
    const result = await postWebDav<{
      ok: boolean;
      missing?: boolean;
      data?: string;
      lastModified?: string;
      etag?: string;
    }>({ action: "download" });

    if (result.missing || !result.data) {
      return null;
    }

    return result.data;
  };

  const importFromWebDav = async () => {
    setBusy("webdav-import");
    setMessage(null);

    try {
      const remoteText = await downloadRemoteText();

      if (!remoteText) {
        setMessage({ type: "info", text: "WebDAV 上还没有 QuestFlow 存档。" });
        return false;
      }

      parseBackup(remoteText);
      const syncedAt = new Date().toISOString();
      const ok = importData(remoteText, { markSyncedAt: syncedAt });
      setMessage({
        type: ok ? "success" : "error",
        text: ok ? "已从 WebDAV 导入云端存档。" : "WebDAV 存档导入失败。"
      });
      return ok;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "WebDAV 导入失败。" });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const downloadRemoteBackup = async () => {
    setBusy("webdav-download");
    setMessage(null);

    try {
      const remoteText = await downloadRemoteText();

      if (!remoteText) {
        setMessage({ type: "info", text: "WebDAV 上还没有 QuestFlow 存档。" });
        return;
      }

      downloadTextFile(remoteText, "questflow-webdav-backup.json");
      setMessage({ type: "success", text: "已下载云端存档文件。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "下载云端存档失败。" });
    } finally {
      setBusy(null);
    }
  };

  const syncNow = async () => {
    setBusy("sync");
    setMessage(null);
    setConflict(null);

    try {
      const remoteText = await downloadRemoteText();

      if (!remoteText) {
        await postWebDav({ action: "upload", payload: getBackupData() });
        markSynced(new Date().toISOString());
        setMessage({ type: "success", text: "云端无存档，已上传本机存档作为初始云端版本。" });
        return;
      }

      const remoteBackup = parseBackup(remoteText);
      const local = getBackupData();
      const remoteUpdatedAt = getBackupUpdatedAt(remoteBackup);
      const localTime = new Date(local.updatedAt).getTime();
      const remoteTime = new Date(remoteUpdatedAt).getTime();
      const lastSyncTime = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
      const localChangedAfterSync = lastSyncTime > 0 && localTime > lastSyncTime;
      const remoteChangedAfterSync = lastSyncTime > 0 && remoteTime > lastSyncTime;

      if (localChangedAfterSync && remoteChangedAfterSync && local.updatedAt !== remoteUpdatedAt) {
        setConflict({
          remoteText,
          remoteUpdatedAt,
          localUpdatedAt: local.updatedAt
        });
        setMessage({ type: "info", text: "本机和云端都有新改动，请选择保留哪一份存档。" });
        return;
      }

      const syncedAt = new Date().toISOString();

      if (remoteTime > localTime) {
        importData(remoteText, { markSyncedAt: syncedAt });
        setMessage({ type: "success", text: "云端较新，已下载并应用云端存档。" });
        return;
      }

      if (localTime > remoteTime) {
        await postWebDav({ action: "upload", payload: local });
        markSynced(syncedAt);
        setMessage({ type: "success", text: "本机较新，已上传本机存档。" });
        return;
      }

      markSynced(syncedAt);
      setMessage({ type: "success", text: "本机和云端已经一致。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "同步失败。" });
    } finally {
      setBusy(null);
    }
  };

  const resolveConflictWithLocal = async () => {
    if (!conflict) return;
    const ok = await uploadLocalToWebDav(true);
    if (ok) setConflict(null);
  };

  const resolveConflictWithRemote = () => {
    if (!conflict) return;
    const syncedAt = new Date().toISOString();
    const ok = importData(conflict.remoteText, { markSyncedAt: syncedAt });
    setConflict(null);
    setMessage({
      type: ok ? "success" : "error",
      text: ok ? "已使用云端存档覆盖本机。" : "云端存档应用失败。"
    });
  };

  const handleLocalImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const ok = importData(String(loadEvent.target?.result ?? ""));
      setMessage({
        type: ok ? "success" : "error",
        text: ok ? "本地文件导入成功。" : "本地文件导入失败。"
      });
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const clearLocalData = () => {
    clearAll();
    setClearConfirm(false);
    setMessage({ type: "success", text: "本机数据已清空。" });
  };

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 text-sm text-slate-500">
        QuestFlow sync loading
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="focus-ring mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            返回 QuestFlow
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white">
              <Cloud size={18} />
            </span>
            <h1 className="text-2xl font-semibold text-slate-950">同步与存档</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Local backup, WebDAV backup, and last-writer-wins sync.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[410px]">
          <Metric label="Tasks" value={`${tasks.length}`} />
          <Metric label="Logs" value={`${logs.length}`} />
          <Metric label="XP" value={`${totalXp}`} />
        </div>
      </header>

      {message ? <MessageBanner message={message} /> : null}

      {clearConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          onClick={() => setClearConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">确认清空本机数据？</h3>
              <p className="mt-2 text-sm text-slate-500">
                此操作不可撤销，所有本机任务、进度、技能和记录将被永久删除。
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setClearConfirm(false)}
                className="focus-ring flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={clearLocalData}
                className="focus-ring flex-1 rounded-lg border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {conflict ? (
        <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-amber-950">同步冲突</h2>
              <p className="mt-1 text-sm text-amber-800">
                本机存档和云端存档都晚于上次同步时间。请选择要保留的版本。
              </p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-amber-200 bg-white p-3">
                  <div className="font-semibold text-slate-900">本机存档</div>
                  <div className="mt-1 text-slate-500">{formatDateTime(conflict.localUpdatedAt)}</div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-white p-3">
                  <div className="font-semibold text-slate-900">云端存档</div>
                  <div className="mt-1 text-slate-500">{formatDateTime(conflict.remoteUpdatedAt)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resolveConflictWithLocal}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Upload size={16} />
                  使用本机存档
                </button>
                <button
                  type="button"
                  onClick={resolveConflictWithRemote}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Download size={16} />
                  使用云端存档
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <PanelTitle icon={<Database size={18} />} title="本机存档" />
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <InfoRow label="本机更新时间" value={formatDateTime(localUpdatedAt)} />
            <InfoRow label="上次同步时间" value={formatDateTime(lastSyncedAt)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportData}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={16} />
              导出本地 JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Upload size={16} />
              导入本地 JSON
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleLocalImport} className="hidden" />
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setClearConfirm(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              清空本机数据
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <PanelTitle icon={<Server size={18} />} title="WebDAV 配置" />
          <div className="mt-4 grid gap-3">
            <TextField
              label="WebDAV 地址"
              value={config.url}
              onChange={(value) => setField("url", value)}
              placeholder="https://example.com/remote.php/dav/files/user/"
            />
            <TextField
              label="账户"
              value={config.username}
              onChange={(value) => setField("username", value)}
              placeholder="username"
            />
            <TextField
              label={config.hasPassword ? "密码 / App Password（留空则沿用已保存密码）" : "密码 / App Password"}
              value={password}
              type="password"
              onChange={setPassword}
              placeholder={config.hasPassword ? "已保存，留空不修改" : "password"}
            />
            <TextField
              label="云端存档路径"
              value={config.filePath}
              onChange={(value) => setField("filePath", value)}
              placeholder="questflow/questflow-backup.json"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            配置保存在 `.questflow-webdav.local.json`，该文件已加入 `.gitignore`。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton busy={busy === "save"} onClick={saveConfig} icon={<Save size={16} />}>
              保存配置
            </ActionButton>
            <ActionButton busy={busy === "test"} onClick={testConnection} icon={<CheckCircle2 size={16} />}>
              联通测试
            </ActionButton>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <PanelTitle icon={<Cloud size={18} />} title="WebDAV 存档" />
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton busy={busy === "webdav-export"} onClick={() => uploadLocalToWebDav(true)} icon={<Upload size={16} />}>
            导出到 WebDAV
          </ActionButton>
          <ActionButton busy={busy === "webdav-import"} onClick={importFromWebDav} icon={<Download size={16} />}>
            从 WebDAV 导入
          </ActionButton>
          <ActionButton busy={busy === "webdav-download"} onClick={downloadRemoteBackup} icon={<Download size={16} />}>
            下载云端 JSON
          </ActionButton>
          <button
            type="button"
            onClick={syncNow}
            disabled={Boolean(busy)}
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={busy === "sync" ? "animate-spin" : ""} />
            同步
          </button>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function MessageBanner({ message }: { message: Message }) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-sky-200 bg-sky-50 text-sky-800"
  };
  const Icon = message.type === "success" ? CheckCircle2 : message.type === "error" ? XCircle : AlertTriangle;

  return (
    <div className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${styles[message.type]}`}>
      <Icon className="mt-0.5 shrink-0" size={17} />
      <span>{message.text}</span>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-white">{icon}</span>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "password";
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="focus-ring min-h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 placeholder:text-slate-400"
      />
    </label>
  );
}

function ActionButton({
  busy,
  onClick,
  icon,
  children
}: {
  busy: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <RefreshCw size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
