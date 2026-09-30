"use client";
import {useState} from "react";
import {Button,Notice} from "@sensel/ui";
import type {RawEvent} from "./exploration-contracts";
export function RawEventView({event}:{event:RawEvent}) {
 const [message,setMessage]=useState("");const text=JSON.stringify(event.raw,null,2);
 return <section className="overview-card"><h2>{event.title}</h2><p>{event.source} · {event.time} · {event.id}</p>
 <dl>{Object.entries(event.fields).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{typeof value==="object"?JSON.stringify(value):String(value??"未知")}</dd></div>)}</dl>
 <h3>原始資料</h3><p>{({complete:"完整授權原始紀錄",redacted:"部分欄位已遮罩",truncated:"原始紀錄已截斷",unavailable:"來源未提供原始紀錄"})[event.rawState]}</p>{event.explanation&&<Notice>{event.explanation}</Notice>}
 {event.rawState!=="unavailable"&&<><Button variant="secondary" onClick={()=>{if(!navigator.clipboard){setMessage("無法複製，請手動選取。");return;}void navigator.clipboard.writeText(text).then(()=>setMessage("已複製原始資料。"),()=>setMessage("無法複製，請手動選取。"));}}>複製原始資料</Button><pre className="sensel-raw-record" tabIndex={0} aria-label="原始資料">{text}</pre></>}{message&&<Notice>{message}</Notice>}</section>;
}
