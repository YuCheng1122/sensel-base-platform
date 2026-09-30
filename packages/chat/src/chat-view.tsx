"use client";
import { useEffect, useState, useRef, type FormEvent, type RefObject } from "react";
import {
  MessageSquarePlus,
  PanelLeft,
  PanelRight,
  Send,
  Square,
} from "lucide-react";
import { Button, Notice, type Model } from "@sensel/ui";
import { ChatDrawer, ChatSidebar, ToolPanel } from "./chat-panels";
import { ChatMessage } from "./chat-message";
import type { Conversation, Message, StreamEvent } from "./chat-types";
import { ChatSuggestions, type ChatSuggestion } from "./chat-suggestions";
export type { ChatSuggestion } from "./chat-suggestions";
interface Props {
  suggestions?: ChatSuggestion[];
  onConfigureModels?: () => void;
  chats: Conversation[];
  active: string;
  messages: Message[];
  models: Model[];
  modelId: string;
  traces: StreamEvent[];
  error: string;
  busy: boolean;
  loading: boolean;
  status: string;
  end: RefObject<HTMLDivElement>;
  onModel: (id: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string) => void;
  onRemoveAll: () => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
export function ChatView(props: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileTools, setMobileTools] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const selectedMessage = props.messages.find(message => message.id === selectedTrace);
  const panelTraces = selectedMessage ? (selectedMessage.trace ?? []).filter(event => event.type?.startsWith("tool.")) : props.traces;
  const panelBusy = selectedMessage ? selectedMessage.status === "running" : props.busy;
  useEffect(() => {setSelectedTrace(null);setToolsOpen(false);setMobileTools(false);}, [props.active]);
  useEffect(() => {if(props.busy) {setSelectedTrace(null);setToolsOpen(false);setMobileTools(false);}}, [props.busy]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const sidebar = (embedded = false) => (
    <ChatSidebar
      chats={props.chats}
      active={props.active}
      disabled={props.busy || props.loading}
      collapsed={!embedded && collapsed}
      onCollapse={() =>
        embedded ? setHistoryOpen(false) : setCollapsed((v) => !v)
      }
      onNew={() => {
        props.onNew();
        setHistoryOpen(false);
        textarea.current?.focus();
      }}
      onSelect={(id) => {
        props.onSelect(id);
        setHistoryOpen(false);
      }}
      onRename={(id) => { setHistoryOpen(false); props.onRename(id); }}
      onRemoveAll={() => { setHistoryOpen(false); props.onRemoveAll(); }}
      onRemove={(id) => { setHistoryOpen(false); props.onRemove(id); }}
    />
  );
  const toggleTools = () => {
    if (window.matchMedia("(min-width:1280px)").matches)
      setToolsOpen((v) => !v);
    else setMobileTools(true);
  };
  return (
    <div className={`sensel-chat ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="chat-desktop-sidebar">{sidebar()}</div>
      <section className="chat-main">
        <header className="chat-conversation-header">
          <button
            type="button"
            className="chat-icon chat-mobile-history"
            aria-label="開啟 Agent 選單"
            onClick={() => setHistoryOpen(true)}
          >
            <PanelLeft size={18} />
          </button>
          <h1>對話分析</h1>
          <button
            type="button"
            className="chat-icon chat-mobile-history"
            aria-label="新對話"
            disabled={props.busy || props.loading}
            onClick={props.onNew}
          >
            <MessageSquarePlus size={18} />
          </button>
          {!!props.traces.length && <button
            type="button"
            className="chat-tools-toggle"
            onClick={toggleTools}
            aria-label="開啟工具執行紀錄"
          >
            <PanelRight size={16} />
            <span>
              工具執行紀錄
              {props.traces.length
                ? ` · ${new Set(props.traces.map((e) => e.toolCallId)).size}`
                : ""}
            </span>
          </button>}
        </header>
        <div
          className="chat-transcript"
          role="log"
          aria-label="對話訊息"
          aria-busy={props.loading}
        >
          {props.loading ? (
            <div className="chat-loading">載入中…</div>
          ) : props.messages.length ? (
            <div className="chat-message-container">
              {props.messages.map((message) => (
                <ChatMessage key={message.id} message={message} toolsSelected={selectedTrace === message.id && (toolsOpen || mobileTools)} onShowTools={() => {setSelectedTrace(message.id);if(window.matchMedia("(min-width:1280px)").matches) setToolsOpen(true);else setMobileTools(true);}} />
              ))}
            </div>
          ) : (
            <div className="chat-welcome">
              <div>
                <p className="chat-eyebrow">SenseL Agent</p>
                <h2>今天想了解什麼？</h2>
                <p className="chat-welcome-description">
                  用自然語言探索資料、整理發現，讓分析更有方向。
                </p>
                <ChatSuggestions items={props.suggestions} onChoose={prompt => {
                  if (textarea.current) {
                    textarea.current.value = prompt;
                    textarea.current.focus();
                  }
                }} />
              </div>
            </div>
          )}
          <div ref={props.end} />
        </div>
        <div className="chat-composer-region">
          <form className="chat-composer" onSubmit={props.onSubmit}>
            <div className="chat-composer-options">
              <span role="status">{props.status}</span>
              <label className="chat-visually-hidden" htmlFor="chat-model">
                模型
              </label>
              <select
                id="chat-model"
                value={props.modelId}
                disabled={props.busy}
                onChange={(event) => props.onModel(event.target.value)}
              >
                {!props.models.length && <option value="">尚無可用模型</option>}
                {props.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            {!props.models.length && (
              <Notice>尚未設定可用模型。{props.onConfigureModels ? <Button type="button" variant="secondary" onClick={props.onConfigureModels}>前往模型設定</Button> : "請聯絡管理員啟用模型。"}</Notice>
            )}
            {props.error && <Notice error>{props.error}</Notice>}
            <div className="chat-composer-input">
              <label className="chat-visually-hidden" htmlFor="chat-content">
                訊息
              </label>
              <textarea
                id="chat-content"
                ref={textarea}
                name="content"
                required
                rows={1}
                disabled={props.busy || props.loading || !props.modelId}
                placeholder="輸入您想分析的問題"
                maxLength={32000}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              {props.busy ? (
                <button
                  type="button"
                  className="chat-send chat-stop"
                  aria-label="停止"
                  onClick={props.onStop}
                >
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="chat-send"
                  aria-label="傳送"
                  disabled={props.loading || !props.modelId}
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
      {toolsOpen && (
        <div className="chat-desktop-tools">
          <ToolPanel
            traces={panelTraces}
            busy={panelBusy}
            onClose={() => setToolsOpen(false)}
          />
        </div>
      )}
      <ChatDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Agent 選單"
        side="left"
      >
        {sidebar(true)}
      </ChatDrawer>
      <ChatDrawer
        open={mobileTools}
        onClose={() => setMobileTools(false)}
        title="工具執行紀錄"
        side="right"
      >
        <ToolPanel
          traces={panelTraces}
          busy={panelBusy}
          onClose={() => setMobileTools(false)}
        />
      </ChatDrawer>
    </div>
  );
}
