import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function compile(source, bindings={}) {
  const exports={};
  new Function("exports",...Object.keys(bindings),ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText)(exports,...Object.values(bindings));
  return exports;
}
function extract(path,names) {
  const source=readFileSync(path,"utf8");
  const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
  return ast.statements.filter((n)=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map((n)=>n.getText(ast)).join("\n");
}
let rpcResult, calls, permitted, queryError, invalidations;
const throwQueryError=(_,error)=>{if(error)throw new Error("정보를 불러오지 못했습니다.");};
const rpcClient={rpc:async(name,args)=>{calls.push({name,args});return rpcResult;}};
const access=async()=>({tenant:{id:"tenant",slug:"xon"},user:{id:"server-actor"},canManageMembers:permitted});
const bindings={
  requireAdminUser:access,ensureAdmin:access,requireTenantSlug:async()=>"xon",
  createSupabaseAdminClient:()=>rpcClient,throwQueryError,
  refreshUserAdminPages:()=>invalidations++,refreshTrainingPages:()=>invalidations++,
  ok:(message)=>({ok:true,message}),fail:(_,message)=>({ok:false,message}),
  parseAdminDateTimeInput:(value)=>new Date(value).toISOString(),
  getRecentAdminDateKeys:()=>["2026-10-01","2026-10-02"],
  formatAdminSignupChartLabel:(value)=>value,
  getRecentAdminDateRangeStartIso:()=>"2026-09-26T15:00:00Z",
};
const server=compile(extract("src/lib/admin/server.ts",["getAdminAllUsersPage","getAdminMembershipsPage","normalizeTenantUserHyroxProfile","getAdminHomeOverview","getAdminRecentSignupStats"]),bindings);
const actions=compile(extract("src/lib/admin/actions.ts",["revokeProgramAccessAction","updateProgramEntitlementEndDateAction"]),bindings);
const allRows=compile(readFileSync("src/lib/supabase/read-all-rows.ts","utf8"),{require:()=>({throwQueryError})}).readAllRows;
const options={query:"회원",programId:null,role:"all",sortBy:"created_at",order:"desc",page:3,pageSize:20,status:"all"};
function form(extra={}) {
  const result=new FormData();
  Object.entries({tenantSlug:"xon",userId:"member",programId:"program",reason:"이용 중단",actorId:"forged",entitlementId:"entitlement",endsAt:"2099-10-02T12:00:00Z",...extra}).forEach(([k,v])=>result.set(k,v));
  return result;
}
const filter=process.argv.slice(2).filter((arg)=>arg!=="--").join(" ");let checks=0;
async function test(name,fn){
  if(!name.includes(filter))return;
  rpcResult={data:{items:[],page:3,pageSize:20,total:80,totalPages:4},error:null};
  calls=[];permitted=true;queryError=null;invalidations=0;
  await fn();checks++;console.log("PASS",name);
}
await test("페이지 / 검색 페이지와 서버 인증 사용자를 단일 RPC로 전달",async()=>{
  const result=await server.getAdminAllUsersPage({},"xon",options);
  assert.equal(result.total,80);assert.equal(calls.length,1);
  assert.deepEqual(calls[0].args,{p_tenant_id:"tenant",p_actor_id:"server-actor",p_query:"회원",p_program_id:null,p_role:"all",p_sort:"created_at",p_order:"desc",p_page:3,p_page_size:20});
  await server.getAdminMembershipsPage({},"xon",options);
  assert.equal(calls[1].name,"get_admin_memberships_page");
});
await test("오류 / 회원 및 멤버십 조회 장애를 빈 목록으로 숨기지 않음",async()=>{
  rpcResult={data:null,error:{code:"network",message:"private DB details"}};
  await assert.rejects(server.getAdminAllUsersPage({},"xon",options),/불러오지/);
  await assert.rejects(server.getAdminMembershipsPage({},"xon",options),/불러오지/);
});
await test("오류 / 데이터 없는 RPC 응답도 성공으로 처리하지 않음",async()=>{
  rpcResult={data:null,error:null};
  await assert.rejects(server.getAdminAllUsersPage({},"xon",options));
  await assert.rejects(server.getAdminMembershipsPage({},"xon",options));
});
await test("해제 / 인증 주체 고정 및 원자적 RPC만 호출",async()=>{
  rpcResult={data:2,error:null};
  const result=await actions.revokeProgramAccessAction(form());
  assert.equal(result.ok,true);assert.equal(invalidations,2);
  assert.deepEqual(calls,[{name:"revoke_admin_memberships",args:{p_tenant_id:"tenant",p_user_id:"member",p_actor_id:"server-actor",p_program_id:"program",p_reason:"이용 중단"}}]);
});
await test("전체 해제 / 명시적 범위와 해제 사유 필수",async()=>{
  rpcResult={data:2,error:null};
  assert.equal((await actions.revokeProgramAccessAction(form({programId:""}))).ok,false);
  assert.equal((await actions.revokeProgramAccessAction(form({reason:" "}))).ok,false);
  assert.equal((await actions.revokeProgramAccessAction(form({reason:"가".repeat(501)}))).ok,false);
  assert.equal(calls.length,0);
  assert.equal((await actions.revokeProgramAccessAction(form({programId:"",revokeAll:"true"}))).ok,true);
  assert.equal(calls[0].args.p_program_id,null);
});
await test("권한 / 변경 불가 사용자는 RPC를 호출하지 않음",async()=>{
  permitted=false;
  assert.equal((await actions.revokeProgramAccessAction(form())).ok,false);
  assert.equal((await actions.updateProgramEntitlementEndDateAction(form())).ok,false);
  assert.equal(calls.length,0);
});
await test("실패 / 저장 실패는 성공 알림이나 갱신 없이 안전한 오류 반환",async()=>{
  rpcResult={data:null,error:{message:"private database information"}};
  for(const action of [actions.revokeProgramAccessAction,actions.updateProgramEntitlementEndDateAction]) {
    const result=await action(form());assert.equal(result.ok,false);assert.ok(!result.message.includes("private"));
  }
  assert.equal(invalidations,0);
});
await test("종료일 / 서버 시간 판정과 트랜잭션 결과 사용",async()=>{
  rpcResult={data:false,error:null};
  const result=await actions.updateProgramEntitlementEndDateAction(form());
  assert.equal(result.ok,true);assert.match(result.message,/만료/);
  assert.equal(calls[0].args.p_actor_id,"server-actor");assert.equal(calls[0].args.p_tenant_id,"tenant");
});
await test("집계 / 1000건 초과 페이지 수집 및 후속 페이지 장애 처리",async()=>{
  let pages=0;const rows=Array.from({length:1201},(_,id)=>({id}));
  const query={range:async(start,end)=>{pages++;return {data:rows.slice(start,end+1),error:queryError&&start>0?{code:"failure"}:null};}};
  assert.equal((await allRows(query,"stats")).length,1201);assert.equal(pages,7);
  queryError=true;await assert.rejects(allRows(query,"stats"));
});
await test("대시보드 / 미답변 건수만 조회하고 코치 범위 유지",async()=>{
  const db={from(table){assert.equal(table,"program_session_reviews");calls.push(table);const q={
    select(){return q;},eq(){return q;},gte(){return q;},in(key,ids){assert.equal(key,"program_id");assert.deepEqual(ids,["managed"]);return q;},
    then(resolve){return Promise.resolve({count:4,error:queryError}).then(resolve);},
  };return q;}};
  const result=await server.getAdminHomeOverview(db,{tenantId:"tenant",tenantRole:"coach",isPlatformAdmin:false,managedProgramIds:["managed"]});
  assert.deepEqual(result,{pendingSessionReviewCount:4});assert.equal(calls.length,1);
  queryError={code:"failure"};
  await assert.rejects(server.getAdminHomeOverview(db,{tenantId:"tenant",tenantRole:"owner",managedProgramIds:[]}));
});
await test("가입 통계 / 날짜별 집계만 조회하고 빈 날짜 0건 유지",async()=>{
  rpcResult={data:[{day:"2026-10-02",count:5}],error:null};
  const result=await server.getAdminRecentSignupStats({},"tenant","server-actor");
  assert.deepEqual(result.map((row)=>row.count),[0,5]);assert.equal(calls[0].name,"get_admin_signup_counts");
});
assert.ok(checks>0,"No matching checks");console.log(`${checks} admin performance checks passed.`);
