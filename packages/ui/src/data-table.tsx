"use client";
import {useState,type ReactNode} from "react";
import {Button} from "./primitives";
export interface TableQuery {page:number;pageSize:number;search:string;sort:string;order:"asc"|"desc"}
export interface TableColumn<T> {key:string;label:string;render:(row:T)=>ReactNode;numeric?:boolean;sortable?:boolean}
/** Controlled table: the adapter owns full-scope search, sorting and paging. */
export function DataTable<T>({title,columns,rows,rowKey,query,onQuery,total,busy=false,error}: {title:string;columns:TableColumn<T>[];rows:T[];rowKey:(row:T)=>string;query:TableQuery;onQuery:(query:TableQuery)=>void;total:number|null;busy?:boolean;error?:string}) {
 const [search,setSearch]=useState(query.search);
 const pageCount=total===null?null:Math.max(1,Math.ceil(total/query.pageSize));
 return <section className="sensel-data-table panel" aria-label={title} aria-busy={busy}><header><h2>{title}</h2><form onSubmit={event=>{event.preventDefault();onQuery({...query,page:1,search});}}><input aria-label={`${title}搜尋`} placeholder="搜尋" value={search} onChange={e=>setSearch(e.target.value)}/><Button variant="secondary" disabled={busy}>查詢</Button></form></header>
 {error&&<p role="alert">{error}</p>}<div className="sensel-table-scroll"><table><thead><tr>{columns.map(c=><th key={c.key} scope="col" className={c.numeric?"numeric":""} aria-sort={query.sort===c.key?query.order==="asc"?"ascending":"descending":"none"}>{c.sortable?<button type="button" disabled={busy} onClick={()=>onQuery({...query,page:1,sort:c.key,order:query.sort===c.key&&query.order==="desc"?"asc":"desc"})}>{c.label} {query.sort===c.key?(query.order==="asc"?"↑":"↓"):"↕"}</button>:c.label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={rowKey(row)}>{columns.map(c=><td className={c.numeric?"numeric":""} key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>
 {!rows.length&&<p role="status">{busy?"載入中…":error?"無法取得資料。":"沒有符合條件的資料。"}</p>}
 <footer><span>{total===null?"總數未知":`共 ${total.toLocaleString()} 筆`}</span><nav aria-label={`${title}分頁`}><Button variant="secondary" disabled={busy||query.page<=1} onClick={()=>onQuery({...query,page:1})}>首頁</Button><Button variant="secondary" disabled={busy||query.page<=1} onClick={()=>onQuery({...query,page:query.page-1})}>上一頁</Button><span>第 {query.page}{pageCount!==null?` / ${pageCount}`:""} 頁</span><Button variant="secondary" disabled={busy||(pageCount!==null?query.page>=pageCount:rows.length<query.pageSize)} onClick={()=>onQuery({...query,page:query.page+1})}>下一頁</Button>{pageCount!==null&&<Button variant="secondary" disabled={busy||query.page>=pageCount} onClick={()=>onQuery({...query,page:pageCount})}>末頁</Button>}</nav></footer></section>;
}
