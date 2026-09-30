"use client";
import { useState } from "react";
import { Activity, FileSearch, ListChecks, MessagesSquare } from "lucide-react";
export interface ChatSuggestion { title: string; description: string; prompt: string; category?: string }
const defaults: ChatSuggestion[] = [
  {title: "整理分析重點", description: "釐清問題與分析步驟，建立適合的工作方向。", prompt: "請協助我整理這個專案的分析重點與步驟。"},
  {title: "了解專案資料", description: "查看目前專案提供的資料與查詢能力。", prompt: "請查詢目前專案的資訊與可用分析能力。"},
  {title: "解讀查詢結果", description: "說明資料的意義，整理值得關注的發現。", prompt: "我想解讀一份查詢結果，請告訴我需要提供哪些資料。"},
  {title: "規劃後續分析", description: "從目前問題出發，找出下一步可以驗證的方向。", prompt: "請協助我規劃後續分析，並列出需要確認的問題。"},
];
const icons = [ListChecks, FileSearch, MessagesSquare, Activity];
export function ChatSuggestions({items = defaults, onChoose}: {items?: ChatSuggestion[]; onChoose: (prompt: string) => void}) {
  const [selected, setSelected] = useState("");
  const categorized = items.some(item => !!item.category);
  const categoryOf = (item: ChatSuggestion) => item.category || "其他";
  const categories = categorized ? [...new Set(items.map(categoryOf))] : [];
  const active = categories.includes(selected) ? selected : categories[0];
  const visible = categorized ? items.filter(item => categoryOf(item) === active) : items;
  return <>
    {categories.length > 1 && <div className="chat-suggestion-categories" role="group" aria-label="提問分類">
      {categories.map(category => <button key={category} type="button" aria-pressed={category === active} onClick={() => setSelected(category)}>{category}</button>)}
    </div>}
    <div className="chat-suggestions" role="group" aria-label={categorized ? `${active}提問` : "建議提問"}>
      {visible.map((item, index) => {
        const Icon = icons[index % icons.length];
        return <button type="button" key={`${categoryOf(item)}:${item.title}`} onClick={() => onChoose(item.prompt)}>
          <span className="chat-suggestion-icon"><Icon size={20} /></span>
          <strong>{item.title}</strong><span>{item.description}</span>
        </button>;
      })}
    </div>
  </>;
}
