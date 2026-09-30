import {createHash} from "node:crypto";
import {decryptSecret} from "./secrets";
import type {Model} from "./types";
import type {ModelUsage} from "@sensel/ui/usage-contracts";
import {CoreError} from "./errors";
export type UsageProvider = (model:Model) => Promise<ModelUsage>;
function tokenFleetModel(model: Pick<Model,"baseUrl">) {
  try {const url=new URL(model.baseUrl);return url.origin === "https://tokenfleet.ai" && !url.username && !url.password;} catch {return false;}
}
export function createTokenFleetUsageProvider(encryptionKey:string, fetcher:typeof fetch=fetch) {
  const cache=new Map<string,{until:number;value:ModelUsage}>();
  const pending=new Map<string,Promise<ModelUsage>>();
  return async (model:Model):Promise<ModelUsage> => {
    if (!tokenFleetModel(model)) return {status:"unsupported",provider:model.provider,scope:"key",unit:"",used:null,remaining:null,limit:null,unlimited:false,expiresAt:null,checkedAt:new Date().toISOString()};
    if (!model.encryptedApiKey) throw new CoreError("USAGE_KEY_MISSING",422,"請先儲存模型 API 金鑰。");
    const token=decryptSecret(model.encryptedApiKey,encryptionKey);
    const key=createHash("sha256").update(token).digest("hex");
    const saved=cache.get(key);if(saved && saved.until>Date.now()) return saved.value;
    const existing=pending.get(key);if(existing)return existing;
    const task=read(token).then(value=>{if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+30000,value});return value;}).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  };
  async function read(token:string):Promise<ModelUsage> {
    try {
      const response=await fetcher("https://tokenfleet.ai/api/usage/token/",{headers:{Authorization:`Bearer ${token}`},redirect:"error",cache:"no-store",signal:AbortSignal.timeout(8000)});
      if(response.status===401||response.status===403)throw new CoreError("USAGE_AUTH_FAILED",502,"用量服務拒絕此金鑰，請確認 TokenFleet 金鑰設定。");
      if(!response.ok)throw new Error("upstream");
      const reader=response.body?.getReader();if(!reader)throw new Error("body");
      const chunks:Uint8Array[]=[];let size=0;
      for(let part=await reader.read();!part.done;part=await reader.read()){size+=part.value.length;if(size>32768){await reader.cancel();throw new Error("size");}chunks.push(part.value);}
      const body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if(body.success===false||body.code===false)throw new Error("upstream");
      const data=body.data;
      if(!data || ![data.total_used,data.total_available,data.total_granted].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0)||typeof data.unlimited_quota!=="boolean"||!Number.isSafeInteger(data.expires_at))throw new Error("schema");
      return {status:"available",provider:"TokenFleet",scope:"key",unit:"API 原始額度單位",used:data.total_used,remaining:data.total_available,limit:data.total_granted,unlimited:data.unlimited_quota,expiresAt:data.expires_at>0?new Date(data.expires_at*1000).toISOString():null,checkedAt:new Date().toISOString()};
    }catch(error){if(error instanceof CoreError)throw error;throw new CoreError("USAGE_UNAVAILABLE",502,"暫時無法取得 TokenFleet 用量，請稍後重試。");}
  }
}
