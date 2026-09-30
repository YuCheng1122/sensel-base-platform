import assert from "node:assert/strict";
import test from "node:test";
import {createTokenFleetUsageProvider} from "../../packages/server/src/model-usage";
import {encryptSecret} from "../../packages/server/src/secrets";
import type {Model} from "../../packages/server/src/types";
const key=Buffer.alloc(32).toString("base64");
const model={provider:"openai-compatible",baseUrl:"https://tokenfleet.ai/v1",encryptedApiKey:encryptSecret("synthetic-quota-key",key)} as Model;
test("quota adapter uses fixed endpoint, coalesces shared key requests and preserves raw units",async()=>{
 let calls=0;
 const service=createTokenFleetUsageProvider(key,async(url,options)=>{calls++;assert.equal(url,"https://tokenfleet.ai/api/usage/token/");assert.equal(options?.redirect,"error");return Response.json({data:{total_used:25,total_available:75,total_granted:100,unlimited_quota:false,expires_at:0}});});
 const [a,b]=await Promise.all([service(model),service({...model,id:"second-model",encryptedApiKey:encryptSecret("synthetic-quota-key",key)})]);
 assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.scope,"key");assert.equal(a.remaining,75);assert.equal(a.unit,"API 原始額度單位");assert(!JSON.stringify(a).includes("synthetic-quota-key"));await service(model);assert.equal(calls,1);
});
test("unsupported quota does not contact upstream; malformed upstream fails instead of zero",async()=>{
 const service=createTokenFleetUsageProvider(key,async()=>{throw new Error("unexpected network");});
 const unsupported=await service({...model,baseUrl:"https://example.invalid/v1"});assert.equal(unsupported.status,"unsupported");assert.equal(unsupported.remaining,null);
 const bad=createTokenFleetUsageProvider(key,async()=>Response.json({data:{total_used:-1}}));await assert.rejects(()=>bad(model),/用量/);
 const oversized=createTokenFleetUsageProvider(key,async()=>new Response("x".repeat(40000)));await assert.rejects(()=>oversized(model),/用量/);
});
