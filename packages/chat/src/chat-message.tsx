"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, UserRound, Copy, Check, Wrench } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "./chat-types";
export function ChatMessage({ message, onShowTools, toolsSelected = false }: { message: Message; onShowTools?: () => void; toolsSelected?: boolean }) {
  const assistant = message.role !== "user";
  const [visible, setVisible] = useState(message.status === "running" ? "" : message.content);
  const target = useRef(message.content); target.current = message.content;
  const animating = useRef(message.status === "running");
  useEffect(() => {
    if (!animating.current) { setVisible(message.content); return; }
    let frame = 0, last = 0;
    const tick = (time: number) => {
      if (time - last >= 24) {
        last = time;
        setVisible(previous => {
          const remaining = target.current.length - previous.length;
          return remaining > 0 ? target.current.slice(0, previous.length + Math.max(1, Math.ceil(remaining / 8))) : target.current;
        });
      }
      if (animating.current) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [message.id, message.content]);
  useEffect(() => {
    if (message.status !== "running" && visible === message.content) animating.current = false;
  }, [visible, message.content, message.status]);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <article className={`chat-message ${assistant ? "assistant" : "user"}`}>
      <div className="chat-message-avatar" aria-hidden="true">
        {assistant ? <Bot size={20} /> : <UserRound size={18} />}
      </div>
      <div className="chat-message-body">
        {assistant && (
          <div className="chat-message-meta">
            <strong>SenseL Agent</strong>
            <span>AI</span>
          </div>
        )}
        <div className="chat-message-content">
          {assistant ? (
            <Markdown remarkPlugins={[remarkGfm]}>
              {visible || "…"}
            </Markdown>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        {message.status && message.status !== "completed" && (
          <span className="chat-message-status">{({running: "回覆中…", cancelled: "已停止", error: "回覆失敗", partial: "部分完成"} as Record<string, string>)[message.status] ?? message.status}</span>
        )}
        {assistant && message.content && (
          <button
            type="button"
            className="chat-icon chat-copy"
            aria-label={copied ? "已複製" : "複製回覆"}
            onClick={() => {
              if (!navigator.clipboard) { setCopyError(true); return; }
              void navigator.clipboard.writeText(message.content).then(
                () => {
                  setCopied(true);
                  setCopyError(false);
                },
                () => setCopyError(true),
              );
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
        {assistant && message.trace?.some(event => event.type?.startsWith("tool.")) && onShowTools && <button type="button" className="chat-message-tools" aria-label="查看此回覆的工具執行紀錄" aria-pressed={toolsSelected} onClick={onShowTools}><Wrench size={14} />工具執行紀錄</button>}
        {copyError && (
          <span role="alert" className="chat-message-status">
            無法複製，請手動選取文字。
          </span>
        )}
      </div>
    </article>
  );
}
