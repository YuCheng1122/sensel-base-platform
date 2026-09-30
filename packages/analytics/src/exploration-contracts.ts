import type {OverviewQuery} from "./contracts";
export interface ExplorationQuery extends OverviewQuery {page:number;pageSize:number;search:string;sort:string;order:"asc"|"desc";entityType?:string;entityId?:string}
export interface EntityRef {type:string;id:string;label:string}
export interface ExplorationEvent {id:string;time:string;title:string;source:string;entities:EntityRef[]}
export interface RawEvent extends ExplorationEvent {fields:Record<string,unknown>;raw:unknown;rawState:"complete"|"redacted"|"truncated"|"unavailable";explanation?:string}
export interface EntityDetail extends EntityRef {attributes:Record<string,unknown>;related:EntityRef[];description?:string}
export interface ExplorationPage<T> {items:T[];total:number|null}
export interface EntitySummary extends EntityRef {count:number;lastSeen:string|null}
export interface ExplorationAdapter {
 events(query:ExplorationQuery,signal?:AbortSignal):Promise<ExplorationPage<ExplorationEvent>>;
 event(id:string,query:OverviewQuery,signal?:AbortSignal):Promise<RawEvent>;
 entities(query:ExplorationQuery,signal?:AbortSignal):Promise<ExplorationPage<EntitySummary>>;
 entity(type:string,id:string,query:OverviewQuery,signal?:AbortSignal):Promise<EntityDetail>;
}
