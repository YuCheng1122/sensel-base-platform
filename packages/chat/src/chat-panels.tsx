"use client";
import { useEffect, useRef, type ReactNode } from "react";
import {
  Bot,
  MessageSquarePlus,
  MessagesSquare,
  PanelLeft,
  PanelRight,
  Trash2,
  Pencil,
  Ellipsis,
  Wrench,
  X,
  CheckCircle2,
  Loader2,
  CircleAlert,
  CircleHelp,
} from "lucide-react";
import type { Conversation, StreamEvent } from "./chat-types";
export function ChatSidebar({
  chats,
  active,
  disabled,
  collapsed = false,
  onCollapse,
  onNew,
  onSelect,
  onRemove,
  onRename,
  onRemoveAll,
}: {
  chats: Conversation[];
  active: string;
  disabled: boolean;
  collapsed?: boolean;
  onCollapse: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string) => void;
  onRemoveAll: () => void;
}) {
  return (
    <aside
      className={`chat-sidebar ${collapsed ? "is-collapsed" : ""}`}
      aria-label="對話歷史"
    >
      <header>
        <strong>SenseL Agent</strong>
        <button
          type="button"
          className="chat-icon"
          onClick={onCollapse}
          aria-label={collapsed ? "展開對話選單" : "收合對話選單"}
        >
          <PanelLeft size={16} />
        </button>
      </header>
      <div className="chat-sidebar-create">
        <button
          type="button"
          className="chat-new"
          disabled={disabled}
          onClick={onNew}
          aria-label="新對話"
        >
          <MessageSquarePlus size={16} />
          <span>新對話</span>
        </button>
      </div>
      <nav aria-label="Agent 工作區">
        <p>工作區</p>
        <div className="chat-workspace-current">
          <Bot size={20} />
          <span>Agent 對話</span>
        </div>
      </nav>
      <div className="chat-history">
        <div className="chat-history-title">
          <span>最近對話</span>
          <button type="button" className="chat-icon" title="刪除全部對話" aria-label="刪除全部對話" disabled={disabled || !chats.length} onClick={onRemoveAll}><Trash2 size={15} /></button>

        </div>
        <div className="chat-history-list">
          {!chats.length ? (
            <div className="chat-history-empty">
              <MessagesSquare size={16} />
              <p>尚無歷史對話。</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div className="conversation-row" key={chat.id}>
                <button
                  type="button"
                  className="conversation"
                  title={chat.title}
                  disabled={disabled}
                  aria-current={chat.id === active ? "page" : undefined}
                  onClick={() => onSelect(chat.id)}
                >
                  <span>{chat.title}</span>
                </button>
                <details className="conversation-menu" onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open=false;}} onKeyDown={event => {if(event.key === "Escape") {event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}>
                  <summary className="chat-icon" aria-label={`對話選項：${chat.title}`} aria-disabled={disabled} onClick={event => {if(disabled) event.preventDefault();}}><Ellipsis size={17} /></summary>
                  <div className="conversation-menu-actions" role="group" aria-label="對話操作">
                    <button type="button" aria-label={`編輯對話標題：${chat.title}`} disabled={disabled} onClick={event => {event.currentTarget.closest("details")!.open=false;onRename(chat.id);}}><Pencil size={14} />編輯標題</button>
                    <button type="button" aria-label={`刪除對話：${chat.title}`} disabled={disabled} onClick={event => {event.currentTarget.closest("details")!.open=false;onRemove(chat.id);}}><Trash2 size={14} />刪除對話</button>
                  </div>
                </details>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
export function ChatDrawer({
  open,
  onClose,
  title,
  side,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side: "left" | "right";
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (open && !node?.open) node?.showModal();
    else if (!open && node?.open) node.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`chat-drawer ${side}`}
      aria-label={title}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="chat-drawer-body">
        <button
          className="chat-icon chat-drawer-close"
          type="button"
          aria-label={`關閉${title}`}
          onClick={onClose}
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
export function ToolPanel({
  traces,
  busy,
  onClose,
}: {
  traces: StreamEvent[];
  busy: boolean;
  onClose: () => void;
}) {
  const grouped = new Map<string, StreamEvent[]>();
  traces.forEach((event, index) => {
    const id = String(event.toolCallId ?? index);
    grouped.set(id, [...(grouped.get(id) ?? []), event]);
  });
  return (
    <aside className="chat-tool-panel" aria-label="對話工具紀錄">
      <header>
        <h2>工具執行紀錄</h2>
        <button
          type="button"
          className="chat-icon"
          aria-label="收合工具紀錄"
          onClick={onClose}
        >
          <PanelRight size={16} />
        </button>
      </header>
      <div className="chat-tool-content">
        <p className="chat-tool-intro">查看回覆使用的工具、輸入與執行結果。</p>
        <div className="chat-tool-label">
          <span>工具執行紀錄</span>
          <span>{grouped.size}</span>
        </div>
        {!traces.length && (
          <p className="chat-tool-empty">
            {busy
              ? "正在準備回覆，尚未呼叫工具。"
              : "開始對話後，可在這裡查看工具執行狀態及結果。"}
          </p>
        )}
        {[...grouped].map(([id, events]) => {
          const last = events.at(-1)!;
          const completed = last.type === "tool.completed";
          return (
            <details className="chat-tool-card" key={id}>
              <summary>
                <span className="chat-tool-symbol">
                  <Wrench size={15} />
                </span>
                <span>{String(last.toolName ?? "工具")}</span>
                {completed && last.status === "completed" ? (
                  <CheckCircle2 size={15} aria-label="工具完成" />
                ) : completed ? (
                  <CircleAlert size={15} aria-label="工具未成功完成" />
                ) : busy ? (
                  <Loader2
                    size={15}
                    className="chat-spinner"
                    aria-label="工具執行中"
                  />
                ) : (
                  <CircleHelp size={15} aria-label="工具結果未確認" />
                )}
              </summary>
              <p className="chat-tool-state">
                {String(last.status ?? (busy ? "running" : "unknown"))}
              </p>
              {events.map((event, index) => (
                <pre key={index}>{JSON.stringify(event, null, 2)}</pre>
              ))}
            </details>
          );
        })}
      </div>
    </aside>
  );
}
