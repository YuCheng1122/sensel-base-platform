"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Notice, SettingsDialog, request, type Model } from "@sensel/ui";
import { readAgentStream } from "./read-agent-stream";
import { ChatView, type ChatSuggestion } from "./chat-view";
import type { Conversation, Message, StreamEvent } from "./chat-types";
export function ChatWorkspace({ onConfigureModels, suggestions }: { onConfigureModels?: () => void; suggestions?: ChatSuggestion[] } = {}) {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [active, setActive] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState("");
  const [traces, setTraces] = useState<StreamEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [editing, setEditing] = useState<Conversation | null>(null);
  const [title, setTitle] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [status, setStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  const execution = useRef("");
  const end = useRef<HTMLDivElement>(null);
  async function list() {
    setChats((await request<{ items: Conversation[] }>("/chats")).items);
  }
  useEffect(() => {
    Promise.all([
      list(),
      request<{ items: Model[] }>("/models").then((result) => {
        const enabled = result.items.filter((model) => model.enabled);
        setModels(enabled);
        setModelId(
          enabled.find((model) => model.isDefault)?.id ?? enabled[0]?.id ?? "",
        );
      }),
    ]).catch((e) => setError(e.message));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function select(id: string) {
    setLoading(true);
    setError("");
    setTraces([]);
    setStatus("");
    setMessages([]);
    setActive(id);
    try {
      const result = await request<{ item: { messages: Message[] } }>(
        `/chats/${id}`,
      );
      setMessages(result.item.messages);
      const lastWithTools = [...result.item.messages].reverse().find(message => message.role === "assistant" && message.trace?.some(event => event.type?.startsWith("tool.")));
      setTraces(lastWithTools?.trace?.filter(event => event.type?.startsWith("tool.")) ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }
  async function create(title: string) {
    const result = await request<{ item: Conversation }>("/chats", {
      method: "POST",
      body: JSON.stringify({ title: title.slice(0, 80) }),
    });
    await list();
    return result.item.id;
  }
  async function remove() {
    if ((!pendingDelete && !deleteAll) || deleting || busy) return;
    const id = pendingDelete?.id;
    setDeleting(true); setDeleteError("");
    try {
      await request(deleteAll ? "/chats" : `/chats/${id}`, { method: "DELETE" });
      setChats(previous => deleteAll ? [] : previous.filter(chat => chat.id !== id));
      if (deleteAll || active === id) {
        setActive(""); setMessages([]); setTraces([]); setStatus(""); setError("");
      }
      setPendingDelete(null); setDeleteAll(false);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "無法刪除對話，請重試。");
    } finally { setDeleting(false); }
  }
  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || deleting || busy || !title.trim()) return;
    setDeleting(true); setDeleteError("");
    try {
      const result = await request<{ item: Conversation }>(`/chats/${editing.id}`, { method: "PATCH", body: JSON.stringify({ title: title.trim() }) });
      setChats(previous => previous.map(chat => chat.id === editing.id ? result.item : chat));
      setEditing(null);
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "無法儲存標題，請重試。"); }
    finally { setDeleting(false); }
  }
  async function stop() {
    const pending = controller.current;
    setStatus("停止中…");
    if (execution.current && active) {
      try {
        await request(`/chats/${active}/cancel`, {
          method: "POST",
          body: JSON.stringify({ executionId: execution.current }),
        });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Cancellation was not confirmed",
        );
      }
    }
    // Keep the stream alive until the server has located the active execution.
    // Aborting first can remove it before the cancellation request arrives.
    if (controller.current === pending) {
      pending?.abort();
      setStatus("已停止，保留部分結果");
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    if (!content || busy || loading || !modelId) return;
    setBusy(true);
    setError("");
    setStatus("執行中");
    setTraces([]);
    execution.current = "";
    const abort = new AbortController();
    controller.current = abort;
    const assistantId = Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
    let terminal = false;
    try {
      const id = active || (await create(content));
      setActive(id);
      setMessages((previous) => [
        ...previous,
        { id: `${assistantId}-user`, role: "user", content },
        { id: assistantId, role: "assistant", content: "", status: "running" },
      ]);
      form.reset();
      const response = await fetch(`/api/core/chats/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, modelId }),
        signal: abort.signal,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message ?? "Chat request failed");
      }
      if (!response.body) throw new Error("Empty response stream");
      for await (const value of readAgentStream(response.body)) {
        if (!value || typeof value !== "object" || !("type" in value)) continue;
        const item = value as StreamEvent;
        if (item.executionId) execution.current = item.executionId;
        if (item.type === "text.delta" && typeof item.delta === "string")
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + item.delta }
                : message,
            ),
          );
        if (item.type.startsWith("tool.")) {
          setTraces((previous) => [...previous, item]);
          setMessages(previous => previous.map(message => message.id === assistantId ? {...message,trace:[...(message.trace ?? []),item]} : message));
        }
        if (item.type === "run.completed") {
          terminal = true;
          const runStatus = item.status ?? "error";
          setStatus(
            runStatus === "completed"
              ? "已完成"
              : runStatus === "cancelled"
                ? "已停止"
                : runStatus === "partial"
                  ? "部分完成"
                  : "執行失敗",
          );
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? { ...message, status: runStatus }
                : message,
            ),
          );
          if (runStatus === "error")
            setError(
              typeof item.error === "string"
                ? item.error
                : "執行失敗，請檢查模型連線後重試。",
            );
        }
      }
      if (!terminal && !abort.signal.aborted)
        throw new Error("串流已中斷；以上內容可能不完整。");
      await list();
    } catch (cause) {
      if (abort.signal.aborted) {
        setStatus("已停止，保留部分結果");
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId
              ? { ...message, status: "cancelled" }
              : message,
          ),
        );
      } else {
        setError(cause instanceof Error ? cause.message : "Chat failed");
        setStatus("執行失敗");
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId
              ? { ...message, status: "error" }
              : message,
          ),
        );
      }
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <>
    <ChatView
      suggestions={suggestions}
      onConfigureModels={onConfigureModels}
      chats={chats}
      active={active}
      messages={messages}
      models={models}
      modelId={modelId}
      traces={traces}
      error={error}
      busy={busy}
      loading={loading || deleting}
      status={status}
      end={end}
      onModel={setModelId}
      onSelect={(id) => void select(id)}
      onNew={() => {
        setActive("");
        setMessages([]);
        setTraces([]);
        setStatus("");
        setError("");
      }}
      onRename={(id) => { const chat = chats.find(item => item.id === id); if (chat) { setEditing(chat); setTitle(chat.title); setDeleteError(""); } }}
      onRemoveAll={() => { setDeleteAll(true); setDeleteError(""); }}
      onRemove={(id) => { setPendingDelete(chats.find(chat => chat.id === id) ?? null); setDeleteError(""); }}
      onStop={() => void stop()}
      onSubmit={(event) => void submit(event)}
    />
    <SettingsDialog open={!!pendingDelete || deleteAll} onOpenChange={open => { if (!open) { setPendingDelete(null); setDeleteAll(false); } }} title={deleteAll ? "刪除全部對話" : "刪除對話"} busy={deleting}>
      <p className="chat-delete-description">{deleteAll ? "確定刪除您的全部對話及所有歷史訊息？包含未列在最近對話中的紀錄，此操作無法復原。" : `確定刪除「${pendingDelete?.title}」及所有歷史訊息？此操作無法復原。`}</p>
      {deleteError && <Notice error>{deleteError}</Notice>}
      <div className="chat-delete-actions">
        <Button variant="secondary" disabled={deleting} onClick={() => { setPendingDelete(null); setDeleteAll(false); }}>取消</Button>
        <Button variant="danger" disabled={deleting} onClick={() => void remove()}>{deleting ? "刪除中…" : "確認刪除"}</Button>
      </div>
    </SettingsDialog>
    <SettingsDialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }} title="編輯對話標題" busy={deleting}>
      <form onSubmit={event => void rename(event)}>
        <label className="chat-title-field">對話標題<input name="title" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required autoFocus disabled={deleting} /></label>
        {deleteError && <Notice error>{deleteError}</Notice>}
        <div className="chat-delete-actions">
          <Button type="button" variant="secondary" disabled={deleting} onClick={() => setEditing(null)}>取消</Button>
          <Button type="submit" disabled={deleting || !title.trim()}>{deleting ? "儲存中…" : "儲存"}</Button>
        </div>
      </form>
    </SettingsDialog>
    </>
  );
}
