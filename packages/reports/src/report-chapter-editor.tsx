"use client";
import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown, Plus } from "lucide-react";
import { Button, Field } from "@sensel/ui";
import { defaultChapters } from "./report-document";
import type { ReportChapter } from "./contracts";
const kinds = {text:"文字",metrics:"指標",trend:"圖表",categories:"分類",events:"事件"};
export function ReportChapterEditor({value,onChange,disabled,defaults = defaultChapters()}:{defaults?:ReportChapter[];value:ReportChapter[];onChange:(value:ReportChapter[])=>void;disabled:boolean}) {
  const [expanded,setExpanded]=useState<string | undefined>(value[0]?.id);
  function update(id:string,patch:Partial<ReportChapter>){onChange(value.map(row=>row.id===id?{...row,...patch}:row));}
  function move(index:number,offset:number){const next=[...value]; [next[index],next[index+offset]]=[next[index+offset],next[index]];onChange(next);}
  return <fieldset className="report-outline" disabled={disabled}><legend>報告大綱</legend>
    <div className="report-outline-toolbar"><span>{value.filter(row=>row.enabled).length} 個章節已選取</span><Button type="button" variant="secondary" onClick={()=>{const next=defaults.map(row=>({...row}));onChange(next);setExpanded(next[0].id);}}>還原預設大綱</Button></div>
    <details className="report-placeholder-help"><summary>插入保存資料的數值</summary><p>{"{{from}}、{{to}}、{{timezone}}、{{totalEvents}}、{{metric.指標ID}} 會以快照中的數據顯示。段落之間請空一行。"}</p></details>
    <div className="report-outline-list">{value.map((row,index)=><section className={`report-outline-section${row.enabled?"":" is-omitted"}`} key={row.id} aria-label={`章節 ${index+1}`}>
      <div className="report-outline-heading"><button type="button" className="report-outline-toggle" aria-expanded={expanded===row.id} aria-label={`編輯章節 ${index+1}`} onClick={()=>setExpanded(expanded===row.id?undefined:row.id)}><span className="report-outline-number">{index+1}</span><strong>{row.title || "未命名章節"}</strong><span className="report-outline-kind">{kinds[row.kind]}</span><ChevronDown size={16}/></button>
        <div className="report-outline-controls"><label className="check"><input type="checkbox" checked={row.enabled} onChange={e=>update(row.id,{enabled:e.target.checked})}/>包含此章節</label>
          <button type="button" className="report-outline-move" title="上移" aria-label={`上移章節 ${index+1}`} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={16}/></button>
          <button type="button" className="report-outline-move" title="下移" aria-label={`下移章節 ${index+1}`} disabled={index===value.length-1} onClick={()=>move(index,1)}><ArrowDown size={16}/></button>
        </div>
      </div>
      {expanded===row.id&&<div className="report-outline-body">
        <Field label={`章節 ${index+1} 標題`}><input required maxLength={120} value={row.title} onChange={e=>update(row.id,{title:e.target.value})}/></Field>
        <Field label={`章節 ${index+1} 內容`}><textarea rows={5} maxLength={10000} value={row.body} onChange={e=>update(row.id,{body:e.target.value})}/></Field>
        {row.kind==="text"&&<div><Button type="button" variant="danger" onClick={()=>onChange(value.filter(item=>item.id!==row.id))}>刪除文字章節</Button></div>}
      </div>}
    </section>)}</div>
    <Button type="button" variant="secondary" disabled={value.length>=20} onClick={()=>{const id=crypto.randomUUID();onChange([...value,{id,kind:"text",title:"補充說明",body:"",enabled:true}]);setExpanded(id);}}><Plus size={16}/>新增文字章節</Button>
  </fieldset>;
}
