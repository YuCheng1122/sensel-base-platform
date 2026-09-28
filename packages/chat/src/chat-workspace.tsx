"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { request, type Model } from "@sensel/ui";
import { readAgentStream } from "./read-agent-stream";
import { ChatView } from "./chat-view";
import type { Conversation, Message, StreamEvent } from "./chat-types";
export function ChatWorkspace() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [active, setActive] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState("");
  const [traces, setTraces] = useState<StreamEvent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
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
      setTraces(
        result.item.messages.flatMap((message) =>
          Array.isArray(message.trace)
            ? message.trace.filter((event) => event.type?.startsWith("tool."))
            : [],
        ),
      );
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
    if (!active || !window.confirm("刪除此對話與歷史訊息？")) return;
    try {
      await request(`/chats/${active}`, { method: "DELETE" });
      setActive("");
      setMessages([]);
      setTraces([]);
      setStatus("");
      await list();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed");
    }
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
    if (!content || busy) return;
    setBusy(true);
    setError("");
    setStatus("執行中");
    setTraces([]);
    execution.current = "";
    const abort = new AbortController();
    controller.current = abort;
    const assistantId = crypto.randomUUID();
    let terminal = false;
    try {
      const id = active || (await create(content));
      setActive(id);
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", content },
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
        if (item.type.startsWith("tool."))
          setTraces((previous) => [...previous, item]);
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
    <ChatView
      chats={chats}
      active={active}
      messages={messages}
      models={models}
      modelId={modelId}
      traces={traces}
      error={error}
      busy={busy}
      loading={loading}
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
      onRemove={() => void remove()}
      onStop={() => void stop()}
      onSubmit={(event) => void submit(event)}
    />
  );
}
