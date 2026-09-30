import assert from "node:assert/strict";
import test from "node:test";
import {syntheticExploration} from "../../templates/project/web/src/server/synthetic-exploration";
const query={from:new Date(Date.now()-14*86400000).toISOString(),to:new Date().toISOString(),page:1,pageSize:10,search:"",sort:"time",order:"desc" as const};
test("synthetic exploration pages full event scope, returns raw record and host details",async()=>{
 const adapter=syntheticExploration({id:"synthetic",role:"ADMIN",groupIds:[]});
 const first=await adapter.events(query),second=await adapter.events({...query,page:2});assert(first.total!>20);assert.equal(first.items.length,10);assert(!first.items.some(a=>second.items.some(b=>a.id===b.id)));
 const event=await adapter.event(first.items[0].id,query);assert.equal(event.rawState,"complete");assert.deepEqual((event.raw as {entities:unknown}).entities,event.entities);
 const host=event.entities.find(e=>e.type==="host")!;const detail=await adapter.entity(host.type,host.id,query);assert(detail.attributes["作業系統"]);assert(detail.related.length>0);
 const events=await adapter.events({...query,entityType:host.type,entityId:host.id});assert(events.items.every(e=>e.entities.some(x=>x.id===host.id)));
 await assert.rejects(()=>adapter.event(event.id,{...query,from:query.to,to:new Date(Date.now()+86400000).toISOString()}));
});
