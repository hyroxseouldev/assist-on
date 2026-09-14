import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

function load(path, imports = {}) {
  const exports = {};
  new Function("exports", "require", ts.transpileModule(
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText)(exports, (name) => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import: ${name}`);
  });
  return exports;
}
const { createReadRetryFetch } = load("src/lib/supabase/read-fetch.ts");
const queryErrors = load("src/lib/supabase/query-error.ts");
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
let checks = 0;
async function test(name, run) {
  if (!name.includes(filter)) return;
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
const url = "https://example.supabase.co/rest/v1/programs";
await test("조회 / 504 이후 정상 응답", async () => {
  let calls = 0;
  const fetcher = createReadRetryFetch(async () => ++calls === 1 ? new Response("timeout", { status: 504 }) : new Response("ok"));
  assert.equal(await (await fetcher(url)).text(), "ok");
  assert.equal(calls, 2);
});
await test("조회 / 지속 장애는 최대 2회", async () => {
  let calls = 0;
  const fetcher = createReadRetryFetch(async () => { calls++; return new Response(null, { status: 503 }); });
  assert.equal((await fetcher(url, { method: "HEAD" })).status, 503);
  assert.equal(calls, 2);
});
await test("조회 / 네트워크 오류 복구", async () => {
  let calls = 0;
  const fetcher = createReadRetryFetch(async () => {
    if (++calls === 1) throw new TypeError("fetch failed");
    return new Response("ok");
  });
  assert.equal((await fetcher(url)).status, 200);
  assert.equal(calls, 2);
});
await test("저장 / 쓰기와 RPC 및 토큰 갱신 재시도 금지", async () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    let calls = 0;
    const fetcher = createReadRetryFetch(async () => { calls++; return new Response(null, { status: 504 }); });
    await fetcher(new Request(url, { method }));
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(createReadRetryFetch(async () => { calls++; throw new TypeError("fetch failed"); })(url, { method: "POST" }));
  assert.equal(calls, 1);
});
await test("조회 / 권한 오류와 요청 취소는 재시도 금지", async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let calls = 0;
    const fetcher = createReadRetryFetch(async () => { calls++; return new Response(null, { status }); });
    await fetcher(url);
    assert.equal(calls, 1);
  }
  const controller = new AbortController();
  let calls = 0;
  const fetcher = createReadRetryFetch(async () => {
    calls++;
    controller.abort();
    return new Response(null, { status: 504 });
  });
  await assert.rejects(fetcher(url, { signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls, 1);
});
await test("SDK / 조회 재시도와 저장 단일 실행", async () => {
  let calls = 0;
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createReadRetryFetch(async () => { calls++; return new Response("timeout", { status: 504 }); }) },
  });
  const read = await client.from("programs").select("id");
  assert.ok(read.error);
  assert.equal(calls, 2);
  calls = 0;
  const write = await client.from("programs").insert({ title: "test" });
  assert.ok(write.error);
  assert.equal(calls, 1);
  calls = 0;
  await client.rpc("save_session", {});
  assert.equal(calls, 1);
});
await test("인증 / 장애와 미로그인 구분", async () => {
  let authError = null;
  const { getAuthenticatedUser } = load("src/lib/auth/server.ts", {
    react: { cache: (fn) => fn },
    "@/lib/supabase/query-error": queryErrors,
    "@/lib/supabase/server": { createSupabaseServerClient: async () => ({ auth: {
      getClaims: async () => ({ data: null, error: authError }),
    } }) },
  });
  assert.equal((await getAuthenticatedUser()).user, null);
  authError = { name: "AuthSessionMissingError", status: 400 };
  assert.equal((await getAuthenticatedUser()).user, null);
  authError = { name: "AuthRetryableFetchError", status: 504 };
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    await assert.rejects(getAuthenticatedUser(), /정보를 불러오지 못했습니다/);
    assert.equal(logs[0][1].context, "auth.claims");
  } finally { console.error = original; }
});
await test("권한 / 소속 조회 실패를 로그인 이동으로 처리하지 않음", async () => {
  let error = null;
  const query = { select() { return this; }, eq() { return this; }, returns: async () => ({ data: null, error }) };
  let redirects = 0;
  const { getCurrentAdminMemberships } = load("src/lib/admin/current.ts", {
    react: { cache: (fn) => fn },
    "next/navigation": { redirect() { redirects++; throw new Error("redirect"); } },
    "@/lib/auth/redirects": {},
    "@/lib/supabase/query-error": queryErrors,
    "@/lib/auth/server": { getAuthenticatedUser: async () => ({ user: { id: "test-user" }, supabase: { from: () => query } }) },
  });
  assert.deepEqual(await getCurrentAdminMemberships(), []);
  error = { code: "504", message: "private query details" };
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    await assert.rejects(getCurrentAdminMemberships(), /정보를 불러오지 못했습니다/);
    assert.equal(redirects, 0);
    assert.ok(!JSON.stringify(logs).includes("private query details"));
  } finally { console.error = original; }
});
assert.ok(checks > 0, `No checks matched: ${filter}`);
console.log(`${checks} checks passed`);
