"use client";
import { useState } from "react";
import { Bot, UserRound, Copy, Check } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "./chat-types";
export function ChatMessage({ message }: { message: Message }) {
  const assistant = message.role !== "user";
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
              {message.content || "…"}
            </Markdown>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        {message.status && message.status !== "completed" && (
          <span className="chat-message-status">{message.status}</span>
        )}
        {assistant && message.content && (
          <button
            type="button"
            className="chat-icon chat-copy"
            aria-label={copied ? "已複製" : "複製回覆"}
            onClick={() => {
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
        {copyError && (
          <span role="alert" className="chat-message-status">
            無法複製，請手動選取文字。
          </span>
        )}
      </div>
    </article>
  );
}
