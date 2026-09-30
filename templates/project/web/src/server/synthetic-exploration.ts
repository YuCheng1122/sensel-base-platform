import {CoreError,type ExplorationProvider} from "@sensel/server";
import type {ExplorationQuery,EntityRef} from "@sensel/analytics/exploration";
import {syntheticDataset} from "./synthetic-analysis-provider";
export const syntheticExploration:ExplorationProvider = (_actor) => {
 const {rows}=syntheticDataset();
 const refs=(index:number):EntityRef[]=>[{type:"host",id:`host-${index%7}`,label:`worker-${index%7}.example.test`},{type:"domain",id:`domain-${index%5}`,label:`site-${index%5}.example.test`}];
 const all=rows.map((row,index)=>({...row,entities:refs(index),source:row.sourceId}));
 const scoped=(query:{from:string;to:string;sourceId?:string})=>all.filter(row=>row.time>=query.from&&row.time<query.to&&(!query.sourceId||query.sourceId==="all"||row.source===query.sourceId));
 const matching=(query:ExplorationQuery)=>scoped(query).filter(row=>(!query.entityId||row.entities.some(e=>e.type===query.entityType&&e.id===query.entityId))&&(!query.search||`${row.title} ${row.id}`.toLowerCase().includes(query.search.toLowerCase())));
 return {
  async events(query) {const rows=matching(query).sort((a,b)=>String(query.sort==="title"?a.title:a.time).localeCompare(String(query.sort==="title"?b.title:b.time))*(query.order==="asc"?1:-1));return {items:rows.slice((query.page-1)*query.pageSize,query.page*query.pageSize),total:rows.length};},
  async event(id,query) {const row=scoped(query).find(r=>r.id===id);if(!row)throw new CoreError("NOT_FOUND",404);return {...row,fields:{category:row.category,level:row.level},raw:{...row,synthetic:true},rawState:"complete",explanation:"合成示範原始紀錄，非客戶資料。"};},
  async entities(query) {
   const values=new Map<string,{type:string;id:string;label:string;count:number;lastSeen:string|null}>();
   for(const row of scoped(query))for(const entity of row.entities){if(query.entityType&&entity.type!==query.entityType)continue;if(query.search&&!entity.label.toLowerCase().includes(query.search.toLowerCase()))continue;const key=`${entity.type}:${entity.id}`,old=values.get(key);values.set(key,{...entity,count:(old?.count??0)+1,lastSeen:!old?.lastSeen||row.time>old.lastSeen?row.time:old.lastSeen});}
   const rows=[...values.values()].sort((a,b)=>(query.sort==="count"?a.count-b.count:a.label.localeCompare(b.label))*(query.order==="asc"?1:-1));return {items:rows.slice((query.page-1)*query.pageSize,query.page*query.pageSize),total:rows.length};
  },
  async entity(type,id,query) {const rows=scoped(query).filter(row=>row.entities.some(e=>e.type===type&&e.id===id));const entity=rows[0]?.entities.find(e=>e.type===type&&e.id===id);if(!entity)throw new CoreError("NOT_FOUND",404);return {...entity,description:"合成示範實體，非客戶資產。",attributes:{類型:type,識別:id,符合事件:rows.length,首次觀察:rows[0].time,最近觀察:rows.at(-1)!.time,...(type==="host"?{作業系統:"Linux（合成）",環境:"隔離示範"}:{用途:"示範網站"})},related:[...new Map(rows.flatMap(r=>r.entities).filter(e=>e.type!==type||e.id!==id).map(e=>[`${e.type}:${e.id}`,e])).values()]};}
 };
};
