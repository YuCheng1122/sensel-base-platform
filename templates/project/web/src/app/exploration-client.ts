import {request} from "@sensel/ui";
import type {ExplorationAdapter} from "@sensel/analytics/exploration";
const params=(query:object)=>new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]));
export const explorationAdapter:ExplorationAdapter={
 events:async(query,signal)=>(await request<{item:Awaited<ReturnType<ExplorationAdapter["events"]>>}>(`/explore/events?${params(query)}`,{signal})).item,
 entities:async(query,signal)=>(await request<{item:Awaited<ReturnType<ExplorationAdapter["entities"]>>}>(`/explore/entities?${params(query)}`,{signal})).item,
 event:async(id,query,signal)=>(await request<{item:Awaited<ReturnType<ExplorationAdapter["event"]>>}>(`/explore/events/${encodeURIComponent(id)}?${params(query)}`,{signal})).item,
 entity:async(type,id,query,signal)=>(await request<{item:Awaited<ReturnType<ExplorationAdapter["entity"]>>}>(`/explore/entities/${encodeURIComponent(type)}/${encodeURIComponent(id)}?${params(query)}`,{signal})).item,
};
