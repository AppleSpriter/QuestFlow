"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Cloud,
  CloudOff,
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
import { QUESTFLOW_COMPATIBILITY_VERSION, type ProgressLog, type QuestBackup, type QuestTask, useQuestStore } from "@/lib/quest-store";
import { ALL_CLASSES, CLASS_META, type ClassName } from "@/data/classes";

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

type RemoteTask = {
  title: string;
  progressCount: number;
  status: string;
  className: ClassName;
};

type RemoteInfo = {
  tasks: number;
  logs: number;
  totalXp: number;
  updatedAt: string;
  taskList: RemoteTask[];
};

type OverwriteConfirm = {
  title: string;
  description: string;
  onConfirm: () => void;
};

type RemoteConflict = {
  remoteText: string;
  remoteUpdatedAt: string;
  localUpdatedAt: string;
};

type ProcessExportTask = QuestTask & { logCount: number; lastLogAt?: string };

const defaultBackupFilePath = `questflow/questflow-backup-v${QUESTFLOW_COMPATIBILITY_VERSION}.json`;
const legacyBackupFilePath = "questflow/questflow-backup.json";

const emptyConfig: PublicWebDavConfig = {
  url: "",
  username: "",
  filePath: defaultBackupFilePath,
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

const downloadTextFile = (text: string, fileName: string, type = "application/json") => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "quest";

const cleanCell = (value: string | number | undefined) =>
  String(value ?? "")
    .replace(/\t/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

const formatProcessLogRows = (task: QuestTask, taskLogs: ProgressLog[]) => {
  const header = ["推进时间", "事件", "职业", "Progress", "XP", "职业XP", "卷轴", "技能检定", "疲劳", "共鸣", "备注"].join("\t");
  const rows = taskLogs
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((log) => {
      const event = log.type === "scroll"
        ? log.skillUpgrade
          ? `卷轴升级：${log.skillUpgrade.name} T${log.skillUpgrade.fromTier}→T${log.skillUpgrade.toTier}`
          : `卷轴学习：${log.newSkill ?? log.scrollEarned ?? "技能"}`
        : log.todoTitle
          ? `完成 Todo：${log.todoTitle}`
          : "Progress +1";
      const skillCheck = log.skillCheck
        ? `${log.skillCheck.success ? "成功" : "失败"} d20=${log.skillCheck.roll}+${log.skillCheck.modifier}/DC${log.skillCheck.dc}${log.skillCheck.critical ? " 大成功" : ""}`
        : "";
      const scroll = log.scrollCount ? `+${log.scrollCount}${log.scrollEarned ? ` ${log.scrollEarned}` : ""}` : log.newSkill ?? "";
      const fatigue = log.fatigueBefore !== undefined && log.fatigueAfter !== undefined ? `${log.fatigueBefore}→${log.fatigueAfter}` : "";
      return [
        formatDateTime(log.at),
        event,
        log.className,
        log.progressCount,
        log.xpAwarded,
        log.classXpAwarded,
        scroll,
        skillCheck,
        fatigue,
        log.resonanceName ? `${log.resonanceName}${log.resonanceReward ? `（${log.resonanceReward}）` : ""}` : "",
        log.note
      ].map(cleanCell).join("\t");
    });

  return [`Quest\t${cleanCell(task.title)}`, header, ...rows].join("\n");
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
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (msg: Message) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(msg);
    if (msg.type === "success" || msg.type === "info") {
      messageTimerRef.current = setTimeout(() => setMessage(null), 4000);
    }
  };
  const [conflict, setConflict] = useState<RemoteConflict | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState<OverwriteConfirm | null>(null);
  const [remoteInfo, setRemoteInfo] = useState<RemoteInfo | null>(null);
  const [processExportOpen, setProcessExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/webdav/config")
      .then((response) => response.json())
      .then((data: PublicWebDavConfig) => setConfig({ ...emptyConfig, ...data }))
      .catch(() => {
        showMessage({ type: "error", text: "读取 WebDAV 本机配置失败。" });
      });
  }, []);

  const refreshRemoteInfo = async () => {
    try {
      const remoteText = await downloadRemoteText();
      if (!remoteText) {
        setRemoteInfo(null);
        return;
      }
      const backup = parseBackup(remoteText);
      setRemoteInfo({
        tasks: backup.tasks.length,
        logs: backup.logs.length,
        totalXp: backup.totalXp ?? 0,
        updatedAt: getBackupUpdatedAt(backup),
        taskList: backup.tasks.map((t) => ({
          title: t.title ?? "Untitled",
          progressCount: t.progressCount ?? 0,
          status: t.status ?? "active",
          className: (ALL_CLASSES.includes(t.className as ClassName) ? t.className : "Wizard") as ClassName
        }))
      });
    } catch {
      setRemoteInfo(null);
    }
  };

  useEffect(() => {
    if (mounted && config.url) refreshRemoteInfo();
  }, [mounted, config.url]);

  const localBackup = useMemo(() => (mounted ? getBackupData() : null), [mounted, getBackupData, tasks, logs, totalXp, dataUpdatedAt, lastSyncedAt]);
  const localUpdatedAt = localBackup?.updatedAt;
  const processExportTasks = useMemo<ProcessExportTask[]>(() => {
    const stats = new Map<string, { logCount: number; lastLogAt?: string }>();
    logs.forEach((log) => {
      const current = stats.get(log.taskId) ?? { logCount: 0 };
      const lastLogAt = !current.lastLogAt || new Date(log.at).getTime() > new Date(current.lastLogAt).getTime() ? log.at : current.lastLogAt;
      stats.set(log.taskId, { logCount: current.logCount + 1, lastLogAt });
    });
    return tasks
      .map((task) => ({ ...task, logCount: stats.get(task.id)?.logCount ?? 0, lastLogAt: stats.get(task.id)?.lastLogAt }))
      .filter((task) => task.logCount > 0)
      .sort((a, b) => new Date(b.lastLogAt ?? b.updatedAt).getTime() - new Date(a.lastLogAt ?? a.updatedAt).getTime());
  }, [tasks, logs]);

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
      showMessage({ type: "success", text: "WebDAV 配置已保存到本机忽略文件。" });
    } catch (error) {
      showMessage({ type: "error", text: error instanceof Error ? error.message : "保存失败。" });
    } finally {
      setBusy(null);
    }
  };

  const testConnection = async () => {
    setBusy("test");
    setMessage(null);

    try {
      const result = await postWebDav<{ ok: boolean; message: string }>({ action: "test" });
      showMessage({ type: result.ok ? "success" : "error", text: result.message });
    } catch (error) {
      showMessage({ type: "error", text: error instanceof Error ? error.message : "连接测试失败。" });
    } finally {
      setBusy(null);
    }
  };

  const uploadLocalToWebDav = async (markAsSynced = true) => {
    setBusy("webdav-export");
    setMessage(null);

    try {
      const snapshot = getBackupData();
      if (snapshot.tasks.length === 0 && snapshot.logs.length === 0) {
        showMessage({ type: "error", text: "本机无数据，无法上传空的存档覆盖云端。" });
        return false;
      }
      await postWebDav({ action: "upload", payload: snapshot });
      const syncedAt = new Date().toISOString();
      if (markAsSynced) markSynced(syncedAt);
      refreshRemoteInfo();
      showMessage({ type: "success", text: "本机存档已导出到 WebDAV。" });
      return true;
    } catch (error) {
      showMessage({ type: "error", text: error instanceof Error ? error.message : "WebDAV 导出失败。" });
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

    if (!result.missing && result.data) {
      return result.data;
    }

    if (config.filePath !== legacyBackupFilePath) {
      const legacyResult = await postWebDav<{
        ok: boolean;
        missing?: boolean;
        data?: string;
        lastModified?: string;
        etag?: string;
      }>({ action: "download", target: "legacy" });

      if (!legacyResult.missing && legacyResult.data) {
        return legacyResult.data;
      }
    }

    return null;
  };

  const importFromWebDav = async () => {
    setBusy("webdav-import");
    setMessage(null);

    try {
      const remoteText = await downloadRemoteText();

      if (!remoteText) {
        showMessage({ type: "info", text: "WebDAV 上还没有 QuestFlow 存档。" });
        return false;
      }

      parseBackup(remoteText);
      const syncedAt = new Date().toISOString();
      const ok = importData(remoteText, { markSyncedAt: syncedAt });
      refreshRemoteInfo();
      showMessage({
        type: ok ? "success" : "error",
        text: ok ? "已从 WebDAV 导入云端存档。" : "WebDAV 存档导入失败。"
      });
      return ok;
    } catch (error) {
      showMessage({ type: "error", text: error instanceof Error ? error.message : "WebDAV 导入失败。" });
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
        showMessage({ type: "info", text: "WebDAV 上还没有 QuestFlow 存档。" });
        return;
      }

      downloadTextFile(remoteText, `questflow-webdav-backup-v${QUESTFLOW_COMPATIBILITY_VERSION}.json`);
      showMessage({ type: "success", text: "已下载云端存档文件。" });
    } catch (error) {
      showMessage({ type: "error", text: error instanceof Error ? error.message : "下载云端存档失败。" });
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
        const local = getBackupData();
        if (local.tasks.length === 0 && local.logs.length === 0) {
          showMessage({ type: "info", text: "云端和本地均无存档。" });
          return;
        }
        await postWebDav({ action: "upload", payload: local });
        markSynced(new Date().toISOString());
        refreshRemoteInfo();
        showMessage({ type: "success", text: "云端无存档，已上传本机存档作为初始云端版本。" });
        return;
      }

      const remoteBackup = parseBackup(remoteText);
      const local = getBackupData();
      const localIsEmpty = local.tasks.length === 0 && local.logs.length === 0;
      const remoteUpdatedAt = getBackupUpdatedAt(remoteBackup);
      const localTime = new Date(local.updatedAt).getTime();
      const remoteTime = new Date(remoteUpdatedAt).getTime();

      // Fresh install / empty local should never overwrite rich remote data
      if (localIsEmpty) {
        const syncedAt = new Date().toISOString();
        importData(remoteText, { markSyncedAt: syncedAt });
        refreshRemoteInfo();
        showMessage({ type: "success", text: "本机无数据，已从云端下载存档。" });
        return;
      }

      const lastSyncTime = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
      const localChangedAfterSync = lastSyncTime > 0 && localTime > lastSyncTime;
      const remoteChangedAfterSync = lastSyncTime > 0 && remoteTime > lastSyncTime;

      if (localChangedAfterSync && remoteChangedAfterSync && local.updatedAt !== remoteUpdatedAt) {
        setConflict({
          remoteText,
          remoteUpdatedAt,
          localUpdatedAt: local.updatedAt
        });
        showMessage({ type: "info", text: "本机和云端都有新改动，请选择保留哪一份存档。" });
        return;
      }

      const syncedAt = new Date().toISOString();

      if (remoteTime > localTime) {
        setOverwriteConfirm({
          title: "确认用云端存档覆盖本机？",
          description: `云端存档（${formatDateTime(remoteUpdatedAt)}）较新，同步后将替换当前本机数据。`,
          onConfirm: () => {
            importData(remoteText, { markSyncedAt: new Date().toISOString() });
            refreshRemoteInfo();
            showMessage({ type: "success", text: "云端较新，已下载并应用云端存档。" });
          }
        });
        return;
      }

      if (localTime > remoteTime) {
        const snapshot = getBackupData();
        setOverwriteConfirm({
          title: "确认覆盖云端存档？",
          description: "本机存档较新，同步后云端旧数据将被本机数据覆盖且无法恢复。",
          onConfirm: async () => {
            await postWebDav({ action: "upload", payload: snapshot });
            markSynced(new Date().toISOString());
            refreshRemoteInfo();
            showMessage({ type: "success", text: "本机较新，已上传本机存档。" });
          }
        });
        return;
      }

      markSynced(syncedAt);
      showMessage({ type: "success", text: "本机和云端已经一致。" });
    } catch (error) {
      showMessage({ type: "error", text: error instanceof Error ? error.message : "同步失败。" });
    } finally {
      setBusy(null);
    }
  };

  const resolveConflictWithLocal = () => {
    if (!conflict) return;
    setOverwriteConfirm({
      title: "确认使用本机存档覆盖云端？",
      description: "此操作将上传本机存档并替换云端数据，云端旧存档将无法恢复。",
      onConfirm: async () => {
        const ok = await uploadLocalToWebDav(true);
        if (ok) setConflict(null);
      }
    });
  };

  const resolveConflictWithRemote = () => {
    if (!conflict) return;
    setOverwriteConfirm({
      title: "确认使用云端存档覆盖本机？",
      description: "此操作将从云端下载存档并替换本机所有任务、进度和技能，当前本机数据将被覆盖。",
      onConfirm: () => {
        const syncedAt = new Date().toISOString();
        const ok = importData(conflict.remoteText, { markSyncedAt: syncedAt });
        setConflict(null);
        showMessage({
          type: ok ? "success" : "error",
          text: ok ? "已使用云端存档覆盖本机。" : "云端存档应用失败。"
        });
      }
    });
  };

  const handleLocalImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result ?? "");
      const local = getBackupData();
      if (local.tasks.length > 0 || local.logs.length > 0) {
        setOverwriteConfirm({
          title: "确认用本地文件覆盖本机数据？",
          description: "此操作将使用文件中的存档替换当前本机的所有任务、进度和技能，当前本机数据将被覆盖。",
          onConfirm: () => {
            const ok = importData(text);
            showMessage({
              type: ok ? "success" : "error",
              text: ok ? "本地文件导入成功。" : "本地文件导入失败。"
            });
          }
        });
      } else {
        const ok = importData(text);
        showMessage({
          type: ok ? "success" : "error",
          text: ok ? "本地文件导入成功。" : "本地文件导入失败。"
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const exportTaskProcessLog = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const taskLogs = logs.filter((log) => log.taskId === taskId);
    if (taskLogs.length === 0) {
      showMessage({ type: "info", text: "这个任务还没有 Progress Log。" });
      return;
    }
    const text = formatProcessLogRows(task, taskLogs);
    downloadTextFile(text, `questflow-process-${sanitizeFileName(task.title)}.tsv`, "text/tab-separated-values;charset=utf-8");
    setProcessExportOpen(false);
    showMessage({ type: "success", text: "已导出该任务的 Process Log。" });
  };

  const clearLocalData = () => {
    clearAll();
    setClearConfirm(false);
    showMessage({ type: "success", text: "本机数据已清空。" });
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
        <div className="flex flex-col gap-2 sm:min-w-[410px]">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Tasks" value={`${tasks.length}`} />
            <Metric label="Logs" value={`${logs.length}`} />
            <Metric label="XP" value={`${totalXp}`} />
          </div>
          <SyncStatusBadge
            lastSyncedAt={lastSyncedAt}
            dataUpdatedAt={dataUpdatedAt}
            hasWebDavConfig={Boolean(config.url)}
            remoteInfo={remoteInfo}
          />
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

      {overwriteConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          onClick={() => setOverwriteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-red-700">{overwriteConfirm.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {overwriteConfirm.description}
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOverwriteConfirm(null)}
                className="focus-ring flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = overwriteConfirm.onConfirm;
                  setOverwriteConfirm(null);
                  fn();
                }}
                className="focus-ring flex-1 rounded-lg border border-red-500 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {processExportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          onClick={() => setProcessExportOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">导出事件 Process Log</h3>
                <p className="mt-1 text-sm text-slate-500">选择一个任务，导出制表符分隔的推进时间、事件、奖励和备注。</p>
              </div>
              <button
                type="button"
                onClick={() => setProcessExportOpen(false)}
                className="focus-ring rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
            <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
              {processExportTasks.length > 0 ? processExportTasks.map((task, i) => {
                const meta = CLASS_META[task.className];
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => exportTaskProcessLog(task.id)}
                    className={`focus-ring flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-white ${i > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <span className="min-w-0">
                      <span style={{ color: meta.hexColor }} className="block truncate font-semibold">{meta.emoji} {task.title}</span>
                      <span className="text-xs text-slate-400">最近推进 {formatDateTime(task.lastLogAt)} · {task.status}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-500">
                      {task.logCount} logs
                    </span>
                  </button>
                );
              }) : (
                <div className="px-3 py-8 text-center text-sm text-slate-500">暂无可导出的任务日志。</div>
              )}
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
            {tasks.length > 0 ? (
              <div>
                <div className="mb-2 text-xs font-semibold text-slate-500">本机任务列表</div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                  {tasks.map((task, i) => {
                    const meta = CLASS_META[task.className];
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between px-3 py-1.5 text-sm ${i > 0 ? "border-t border-slate-100" : ""}`}
                      >
                        <span style={{ color: meta.hexColor }} className="font-medium truncate mr-2">{meta.emoji} {task.title}</span>
                        <span className="shrink-0 tabular-nums text-xs text-slate-400">x{task.progressCount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
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
              onClick={() => setProcessExportOpen(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={16} />
              导出事件 Log
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
              placeholder={defaultBackupFilePath}
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
        <div className="mt-4 grid gap-3 text-sm text-slate-600">
          <InfoRow label="云端更新时间" value={remoteInfo ? formatDateTime(remoteInfo.updatedAt) : "未连接"} />
          <InfoRow label="兼容存档版本" value={`v${QUESTFLOW_COMPATIBILITY_VERSION}`} />
          {remoteInfo ? (
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Tasks" value={`${remoteInfo.tasks}`} />
              <Metric label="Logs" value={`${remoteInfo.logs}`} />
              <Metric label="XP" value={`${remoteInfo.totalXp}`} />
            </div>
          ) : null}
          {remoteInfo && remoteInfo.taskList.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-500">云端任务列表</div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                {remoteInfo.taskList.map((task, i) => {
                  const meta = CLASS_META[task.className];
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-1.5 text-sm ${i > 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <span style={{ color: meta.hexColor }} className="font-medium truncate mr-2">{meta.emoji} {task.title}</span>
                      <span className="shrink-0 tabular-nums text-xs text-slate-400">x{task.progressCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton busy={busy === "webdav-export"} onClick={() => setOverwriteConfirm({
            title: "确认覆盖云端存档？",
            description: "此操作将使用本机存档覆盖 WebDAV 云端存档，云端的旧数据将无法恢复。",
            onConfirm: () => uploadLocalToWebDav(true)
          })} icon={<Upload size={16} />}>
            导出到 WebDAV
          </ActionButton>
          <ActionButton busy={busy === "webdav-import"} onClick={() => {
            const local = getBackupData();
            if (local.tasks.length > 0 || local.logs.length > 0) {
              setOverwriteConfirm({
                title: "确认用云端存档覆盖本机？",
                description: "此操作将从 WebDAV 下载云端存档并替换本机所有任务、进度和技能，当前本机数据将被覆盖。",
                onConfirm: importFromWebDav
              });
            } else {
              importFromWebDav();
            }
          }} icon={<Download size={16} />}>
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

function SyncStatusBadge({
  lastSyncedAt,
  dataUpdatedAt,
  hasWebDavConfig,
  remoteInfo
}: {
  lastSyncedAt?: string;
  dataUpdatedAt?: string;
  hasWebDavConfig: boolean;
  remoteInfo: RemoteInfo | null;
}) {
  if (!hasWebDavConfig) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-400">
        <CloudOff size={13} />
        未配置 WebDAV
      </div>
    );
  }

  if (!lastSyncedAt) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-600">
        <CircleDot size={13} />
        从未同步
      </div>
    );
  }

  const syncTime = new Date(lastSyncedAt).getTime();
  const updateTime = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 0;
  const hasPendingChanges = updateTime > syncTime;

  if (hasPendingChanges || !remoteInfo) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
        <AlertTriangle size={13} />
        待同步
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={13} />
      已同步
    </div>
  );
}
