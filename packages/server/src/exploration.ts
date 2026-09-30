import {z} from "zod";
import type {ExplorationAdapter} from "@sensel/analytics/exploration";
import type {AnalysisActor} from "./feature-types";
import type {CoreConfig,User} from "./types";
import {CoreError} from "./errors";
import {rangeInput} from "./feature-validation";
export type ExplorationProvider = (actor:AnalysisActor)=>ExplorationAdapter;
export async function handleExploration(config:CoreConfig,user:User,path:string[],request:Request):Promise<Response|null> {
 if(path[0]!=="explore")return null;
 if(request.method!=="GET")throw new CoreError("NOT_FOUND",404);
 if(!config.explorationProvider)throw new CoreError("FEATURE_UNAVAILABLE",503);
 const input=Object.fromEntries(new URL(request.url).searchParams),range=rangeInput.parse(input);
 const options=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(10),search:z.string().max(200).default(""),sort:z.enum(["label","count","time","title"]).default("time"),order:z.enum(["asc","desc"]).default("desc"),sourceId:z.string().max(100).optional(),entityType:z.string().max(100).optional(),entityId:z.string().max(200).optional()}).parse(input);
 const query={...range,...options},provider=config.explorationProvider({id:user.id,role:user.role,groupIds:user.groupIds});
 let item:unknown;
 if(path[1]==="events"&&path.length===2)item=await provider.events(query,request.signal);
 else if(path[1]==="events"&&path.length===3)item=await provider.event(path[2],query,request.signal);
 else if(path[1]==="entities"&&path.length===2)item=await provider.entities(query,request.signal);
 else if(path[1]==="entities"&&path.length===4)item=await provider.entity(path[2],path[3],query,request.signal);
 else throw new CoreError("NOT_FOUND",404);
 if(!item)throw new CoreError("NOT_FOUND",404);
 if(Buffer.byteLength(JSON.stringify(item))>5*1024*1024)throw new CoreError("DETAIL_TOO_LARGE",413);
 return Response.json({item},{headers:{"Cache-Control":"no-store"}});
}
