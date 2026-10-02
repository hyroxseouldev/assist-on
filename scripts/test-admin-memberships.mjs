import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec(readFileSync("scripts/fixtures/admin-memberships.sql", "utf8"));
for (const file of readdirSync("supabase/migrations").sort().filter((name) =>
  name.endsWith("_admin_membership_transactions_and_queries.sql") || name.endsWith("_fix_admin_member_role_filter.sql"))) {
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
}
const uid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const tenant = uid(1), other = uid(2), actor = uid(3), member = uid(4), program = uid(5), next = uid(6), outsider = uid(7), entitlement = uid(8);
await db.query("insert into tenants values ($1), ($2)", [tenant, other]);
for (const [id, name] of [[actor,"관리자"], [member,"회원"], [outsider,"타사 관리자"]]) {
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)", [id, `${id}@example.test`, JSON.stringify({full_name:name})]);
}
await db.query("insert into tenant_memberships values ($1,$2,'owner'), ($1,$3,'member'),($4,$5,'owner')", [tenant,actor,member,other,outsider]);
await db.query("insert into tenant_user_profiles(tenant_id,user_id,display_name,phone_number) values ($1,$2,'회원','010-1234-5678')", [tenant,member]);
await db.query("insert into programs values ($1,$2,'프로그램'),($3,$2,'다음 프로그램')", [program,tenant,next]);
await db.query("insert into program_entitlements(id,tenant_id,user_id,program_id,starts_at,ends_at) values ($1,$2,$3,$4,now()-interval '1 month',now()+interval '1 month')", [entitlement,tenant,member,program]);
await db.query("insert into user_program_states values($1,$2,$3)",[tenant,member,program]);
const scalar = async (sql, params=[]) => Object.values((await db.query(sql, params)).rows[0])[0];
const revoke = (who=actor, which=program, reason="회원 요청") => scalar("select revoke_admin_memberships($1,$2,$3,$4,$5)",[tenant,member,who,reason,which]);
const page = (query="", number=1, size=20) => scalar("select get_admin_users_page($1,$2,$3,null,'all','created_at','desc',$4,$5)",[tenant,actor,query,number,size]);
const memberships = (status="all", number=1) => scalar("select get_admin_memberships_page($1,$2,'',null,$3,$4,20)",[tenant,actor,status,number]);
const state = () => scalar("select count(*)::int from user_program_states where tenant_id=$1 and user_id=$2",[tenant,member]);
const active = () => scalar("select is_active from program_entitlements where id=$1",[entitlement]);
const addEntitlement = async (programId, start="now()-interval '1 day'") => db.query(`insert into program_entitlements(tenant_id,user_id,program_id,starts_at,ends_at) values ($1,$2,$3,${start},now()+interval '1 year')`,[tenant,member,programId]);
let checks=0;
const filter=process.argv.slice(2).filter((arg)=>arg!=="--").join(" ");
async function test(name, fn) {
  if (!name.includes(filter)) return;
  await db.exec("begin");
  try { await fn(); checks++; console.log("PASS",name); }
  finally { await db.exec("rollback"); }
}
await test("해제 / 마지막 멤버십과 선택 상태 및 이력을 원자적으로 처리", async()=>{
  assert.equal(await revoke(),1); assert.equal(await active(),false); assert.equal(await state(),0);
  const result=await page("01012345678");
  assert.equal(result.items[0].membership_admin_events[0].reason,"회원 요청");
  assert.equal(result.items[0].membership_admin_events[0].changed_by_name,"관리자");
  assert.equal(result.items[0].active_program_id,null);
});
await test("해제 / 다른 활성 프로그램 선택 및 예정 프로그램 제외",async()=>{
  await addEntitlement(next);
  await revoke();
  assert.equal(await scalar("select active_program_id from user_program_states where user_id=$1",[member]),next);
});
await test("해제 / 예정 멤버십만 남으면 현재 선택 제거",async()=>{
  await addEntitlement(next,"now()+interval '1 month'");
  await revoke(); assert.equal(await state(),0);
  assert.equal((await memberships("pending")).total,1);
});
await test("해제 / 예정 권한을 포함한 전체 해제",async()=>{
  await addEntitlement(next,"now()+interval '1 month'");
  assert.equal(await revoke(actor,null),2);
  assert.equal((await memberships("inactive")).total,2);
  assert.equal(await state(),0);
});
await test("원자성 / 이력 저장 실패 시 해제도 롤백",async()=>{
  await db.exec("create function public.fail_event() returns trigger language plpgsql as $$ begin raise exception 'forced audit failure'; end $$; create trigger fail_event before insert on membership_admin_events for each row execute function public.fail_event(); savepoint before_revoke;");
  await assert.rejects(revoke(),/forced audit failure/);
  await db.exec("rollback to before_revoke");
  assert.equal(await active(),true); assert.equal(await state(),1);
});
await test("종료일 / 마지막 권한 만료 시 상태 삭제와 이력 저장",async()=>{
  const ended = new Date(Date.now()-86400000).toISOString();
  assert.equal(await scalar("select update_admin_membership_end_date($1,$2,$3,$4)",[tenant,entitlement,actor,ended]),false);
  assert.equal(await active(),false); assert.equal(await state(),0);
  assert.equal((await page("01012345678")).items[0].membership_admin_events[0].action,"end_date");
});
await test("종료일 / 비활성 재활성화와 역전 기간 차단",async()=>{
  await db.exec("savepoint bad_date");
  await assert.rejects(scalar("select update_admin_membership_end_date($1,$2,$3,now()-interval '2 months')",[tenant,entitlement,actor]),/시작일/);
  await db.exec("rollback to bad_date"); await revoke();
  await assert.rejects(scalar("select update_admin_membership_end_date($1,$2,$3,now()+interval '1 year')",[tenant,entitlement,actor]),/비활성/);
});
await test("권한 / 일반 회원과 다른 테넌트 관리자 차단",async()=>{
  for (const who of [member,outsider]) {
    await db.exec("savepoint permission_check");
    await assert.rejects(revoke(who),/권한/);
    await db.exec("rollback to permission_check");
    await assert.rejects(scalar("select get_admin_users_page($1,$2)",[tenant,who]),/권한/);
    await db.exec("rollback to permission_check");
  }
  assert.equal(await active(),true);
});
await test("권한 / 브라우저 역할은 서버 전용 RPC를 호출할 수 없음",async()=>{
  for(const role of ["anon","authenticated"]){
    assert.equal(await scalar("select has_function_privilege($1,'public.revoke_admin_memberships(uuid,uuid,uuid,text,uuid)','execute')",[role]),false);
    assert.equal(await scalar("select has_function_privilege($1,'public.get_admin_users_page(uuid,uuid,text,uuid,text,text,text,integer,integer)','execute')",[role]),false);
  }
  await db.exec("set local role service_role"); assert.equal((await page()).total,2);
});
await test("조회 / 전화번호 검색과 빈 결과 및 범위 밖 페이지",async()=>{
  assert.equal((await page("01012345678")).total,1);
  assert.equal((await page("존재하지않음",99)).page,1);
  assert.equal((await page("",99,1)).page,2);
  assert.equal((await page("%_")).total,0);
  assert.equal((await page()).items.some((row)=>row.id===outsider),false);
});
await test("페이지 / 1000건 초과 회원과 멤버십 검색 및 마지막 페이지",async()=>{
  await db.query(`with inserted as (
    insert into auth.users(id,email,created_at) select gen_random_uuid(), 'member-'||i||'@example.test', now()-i*interval '1 minute' from generate_series(1,1201) i returning id
  ) insert into tenant_memberships select $1,id,'member' from inserted`,[tenant]);
  await db.query("insert into program_entitlements(tenant_id,user_id,program_id,starts_at) select tenant_id,user_id,$2,now() from tenant_memberships where tenant_id=$1 and user_id<>$3 and user_id<>$4",[tenant,program,actor,member]);
  const result=await page("",999);
  assert.equal(result.total,1203); assert.equal(result.page,61); assert.equal(result.items.length,3);
  assert.equal((await page("member-1201@")).total,1);
  const result2=await memberships("all",999);
  assert.equal(result2.total,1202); assert.equal(result2.items.length,2);
});
await test("조회 / 역할 프로그램 필터 및 미등록 사용자 보존",async()=>{
  await db.query("delete from tenant_memberships where tenant_id=$1 and user_id=$2",[tenant,member]);
  const result=await scalar("select get_admin_users_page($1,$2,'',$3,'unregistered')",[tenant,actor,program]);
  assert.equal(result.total,1); assert.equal(result.items[0].has_membership,false);
});
await test("조회 / 가입 통계 테넌트와 서울 날짜 범위",async()=>{
  const rows=await scalar("select jsonb_agg(s) from get_admin_signup_counts($1,$2) s",[tenant,actor]);
  assert.equal(Number(rows[0].count),2);
});
await test("권한 / 서비스 역할로 원자적 해제 가능",async()=>{
  await db.exec("set local role service_role");
  assert.equal(await revoke(),1);
  assert.equal(await active(),false);
});
await test("권한 / 세션 사용자와 전달된 관리자 불일치 차단",async()=>{
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[member]);
  await assert.rejects(page(),/요청자/);
});
await test("권한 / 비공개 조회 함수만 definer이며 브라우저 접근 차단",async()=>{
  assert.equal(await scalar("select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef"),0);
  assert.equal(await scalar("select has_schema_privilege('authenticated','admin_private','usage')"),false);
  assert.equal(await scalar("select has_table_privilege('service_role','auth.users','select')"),false);
});
await db.close();
assert.ok(checks>0,"No matching checks"); console.log(`${checks} admin membership database checks passed.`);
