"use client";
import {useEffect,useState} from "react";
import type {ModelUsage} from "./model-usage-contracts";
import {Button,Notice} from "./primitives";
import {request} from "./api-client";
export function ModelUsageCard({modelId,version,load=loadModelUsage}:{modelId:string;version:number;load?:(id:string,signal:AbortSignal)=>Promise<ModelUsage>}) {
  const [value,setValue]=useState<ModelUsage|null>(null),[error,setError]=useState("");
  const [busy,setBusy]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setBusy(true);setError("");setValue(null);
    load(modelId,controller.signal).then(data=>{if(!controller.signal.aborted)setValue(data);}).catch(()=>{if(!controller.signal.aborted)setError("暫時無法取得用量，請稍後重試。");}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  },[modelId,version,load,revision]);
  const number=(v:number|null)=>v===null?"未知":v.toLocaleString("zh-TW",{maximumFractionDigits:6});
  const ratio=value&&!value.unlimited&&value.limit!==null&&value.limit>0&&value.used!==null?Math.min(100,value.used/value.limit*100):null;
  return <section className="model-usage" aria-label="模型用量與額度" aria-busy={busy}>
    <header><h3>用量與剩餘額度</h3><Button variant="secondary" disabled={busy} onClick={()=>setRevision(v=>v+1)}>更新用量</Button></header>
    {busy&&<p role="status">讀取用量中…</p>}{error&&<Notice error>{error}</Notice>}
    {value?.status==="unsupported"&&<p>此服務商尚未提供可用的額度查詢。</p>}
    {value?.status==="available"&&<><dl><div><dt>已用額度</dt><dd>{number(value.used)}</dd></div><div><dt>剩餘額度</dt><dd>{value.unlimited?"無上限":number(value.remaining)}</dd></div><div><dt>總額度</dt><dd>{value.unlimited?"無上限":number(value.limit)}</dd></div></dl>
      {ratio!==null&&<progress aria-label="額度使用比例" value={ratio} max={100}/>}
      <p>{value.provider} · {value.unit} · {({key:"同一金鑰共用",account:"帳戶共用",model:"此模型",run:"此執行"})[value.scope]}{value.period?` · ${value.period}`:""}</p>
      <p>{value.expiresAt?`到期：${new Date(value.expiresAt).toLocaleString("zh-TW")}`:"未提供到期日"} · 更新：{new Date(value.checkedAt).toLocaleString("zh-TW")}</p></>}
  </section>;
}
async function loadModelUsage(id:string,signal:AbortSignal) {return (await request<{item:ModelUsage}>(`/models/${encodeURIComponent(id)}/usage`,{signal})).item;}
