"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname,useSearchParams,useRouter} from "next/navigation";
import {Button,DataTable,Notice,PageHeader,type TableQuery} from "@sensel/ui";
import {RawEventView,presetRange,validateRange} from "@sensel/analytics";
import type {OverviewQuery} from "@sensel/analytics/contracts";
import type {EntityDetail,EntitySummary,ExplorationEvent,RawEvent} from "@sensel/analytics/exploration";
import {explorationAdapter as adapter} from "./exploration-client";
const tableDefaults:TableQuery={page:1,pageSize:10,search:"",sort:"count",order:"desc"};
export function scopeParams(query:OverviewQuery) {return new URLSearchParams({from:query.from,to:query.to,...(query.sourceId?{sourceId:query.sourceId}:{})});}
const entityLink=(e:{type:string;id:string},query:OverviewQuery)=>`/entities/${encodeURIComponent(e.type)}/${encodeURIComponent(e.id)}?${scopeParams(query)}`;
export function EntityRankings({query}:{query:OverviewQuery}) {return <><EntityRanking key={`host:${JSON.stringify(query)}`} type="host" query={query}/><EntityRanking key={`domain:${JSON.stringify(query)}`} type="domain" query={query}/></>;}
function EntityRanking({type,query}:{type:string;query:OverviewQuery}) {
 const [table,setTable]=useState(tableDefaults),[rows,setRows]=useState<EntitySummary[]>([]),[total,setTotal]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();setBusy(true);setError("");setRows([]);void adapter.entities({...query,...table,entityType:type},controller.signal).then(page=>{if(!controller.signal.aborted){setRows(page.items);setTotal(page.total);}}).catch(()=>{if(!controller.signal.aborted)setError("無法載入實體排行。");}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[query,table,type]);
 return <DataTable title={type==="host"?"主機排行":"網域排行"} rows={rows} rowKey={r=>r.id} total={total} query={table} onQuery={setTable} busy={busy} error={error} columns={[{key:"label",label:"名稱",sortable:true,render:r=><Link href={entityLink(r,query)}>{r.label}</Link>},{key:"count",label:"事件數",numeric:true,sortable:true,render:r=>r.count.toLocaleString()},{key:"lastSeen",label:"最近觀察（UTC）",render:r=>r.lastSeen??"未知"}]}/>;
}
export function ExplorationPage() {
 const pathname=usePathname(),params=useSearchParams(),router=useRouter();
 const [fallback]=useState(()=>presetRange(7));
 const query:OverviewQuery={from:params.get("from")??fallback.from,to:params.get("to")??fallback.to,sourceId:params.get("sourceId")??"all"};
 const serialized=JSON.stringify(query),parts=pathname.split("/").filter(Boolean).map(decodeURIComponent),isEvent=parts[0]==="events",isList=parts.length===1;
 const [detail,setDetail]=useState<RawEvent|EntityDetail|null>(null),[error,setError]=useState("");
 const [relatedPage,setRelatedPage]=useState(1);
 useEffect(()=>{if(isList)return;const controller=new AbortController();setDetail(null);setError("");setRelatedPage(1);const parts=pathname.split("/").filter(Boolean).map(decodeURIComponent);const scope=JSON.parse(serialized) as OverviewQuery,problem=validateRange(scope);if(problem){setError(problem);return;}const task=isEvent?adapter.event(parts[1],scope,controller.signal):adapter.entity(parts[1],parts[2],scope,controller.signal);void task.then(value=>{if(!controller.signal.aborted)setDetail(value);}).catch(()=>{if(!controller.signal.aborted)setError("找不到此資料或沒有存取權限。");});return()=>controller.abort();},[pathname,serialized,isEvent,isList]);
 const parsedPage=Number(params.get("page")??1);
 const table:TableQuery={page:Number.isSafeInteger(parsedPage)&&parsedPage>0?parsedPage:1,pageSize:10,search:params.get("search")??"",sort:params.get("sort")==="title"?"title":"time",order:params.get("order")==="asc"?"asc":"desc"};
 const related=detail&&!isEvent?(detail as EntityDetail).related:[];
 if(isList)return <section className="sensel-page stack"><PageHeader title="全部事件"><Link href={`/overview?${scopeParams(query)}`}>返回事件概覽</Link></PageHeader><EntityEvents scope={query} table={table} onTable={value=>{const next=scopeParams(query);Object.entries(value).forEach(([k,v])=>next.set(k,String(v)));router.push(`/events?${next}`);}}/></section>;
 return <section className="sensel-page stack"><PageHeader title={isEvent?"事件詳情":"實體詳情"}><Link href={`/overview?${scopeParams(query)}`}>返回事件概覽</Link></PageHeader><p>{query.from} — {query.to}（UTC）</p>{error&&<Notice error>{error}</Notice>}{!detail&&!error&&<p role="status">載入詳情…</p>}
 {detail&&(isEvent?<><RawEventView event={detail as RawEvent}/><section className="overview-card"><h2>關聯實體</h2>{(detail as RawEvent).entities.map(e=><p key={`${e.type}:${e.id}`}><Link href={entityLink(e,query)}>{e.label}</Link></p>)}</section></>:<><section className="overview-card"><h2>{(detail as EntityDetail).label}</h2><p>{(detail as EntityDetail).description}</p><dl>{Object.entries((detail as EntityDetail).attributes).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value??"未知")}</dd></div>)}</dl></section><section className="overview-card"><h2>關聯實體</h2>{related.slice((relatedPage-1)*10,relatedPage*10).map(e=><p key={`${e.type}:${e.id}`}><Link href={entityLink(e,query)}>{e.label}</Link></p>)}<Button variant="secondary" disabled={relatedPage<=1} onClick={()=>setRelatedPage(v=>v-1)}>上一頁</Button> 第 {relatedPage} 頁 <Button variant="secondary" disabled={relatedPage*10>=related.length} onClick={()=>setRelatedPage(v=>v+1)}>下一頁</Button></section><EntityEvents key={`${pathname}:${serialized}`} scope={query} type={parts[1]} id={parts[2]} table={table} onTable={value=>{const next=scopeParams(query);Object.entries(value).forEach(([k,v])=>next.set(k,String(v)));router.push(`${pathname}?${next}`);}}/></>)}
 </section>;
}
function EntityEvents({scope,type,id,table,onTable}:{scope:OverviewQuery;type?:string;id?:string;table:TableQuery;onTable:(q:TableQuery)=>void}) {
 const [rows,setRows]=useState<ExplorationEvent[]>([]),[total,setTotal]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");const serialized=JSON.stringify({...scope,...table,entityType:type,entityId:id});
 useEffect(()=>{const controller=new AbortController();setBusy(true);setError("");setRows([]);void adapter.events(JSON.parse(serialized),controller.signal).then(page=>{if(!controller.signal.aborted){setRows(page.items);setTotal(page.total);}}).catch(()=>{if(!controller.signal.aborted)setError("無法載入事件。");}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[serialized]);
 return <DataTable title="相關事件" rows={rows} rowKey={r=>r.id} total={total} query={table} onQuery={onTable} busy={busy} error={error} columns={[{key:"time",label:"時間（UTC）",sortable:true,render:r=>r.time},{key:"title",label:"事件",sortable:true,render:r=><Link href={`/events/${encodeURIComponent(r.id)}?${scopeParams(scope)}`}>{r.title}</Link>},{key:"source",label:"來源",render:r=>r.source}]}/>;
}
