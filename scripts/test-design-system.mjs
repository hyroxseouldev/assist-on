import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const exports = {};
  const source = readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("exports", "require", compiled)(exports, (name) => {
    if (name === "@/lib/utils") return load("src/lib/utils.ts");
    if (name.startsWith("@/components/ui/")) return load(`${name.replace("@/", "src/")}.tsx`);
    return require(name);
  });
  modules.set(relative, exports);
  return exports;
}

const { cn } = load("src/lib/utils.ts");
const { Button } = load("src/components/ui/button.tsx");
const { Badge } = load("src/components/ui/badge.tsx");
const { Input } = load("src/components/ui/input.tsx");
const { PaginationLink } = load("src/components/ui/pagination.tsx");
const render = (component, props, children) => renderToStaticMarkup(React.createElement(component, props, children));
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
let checks = 0;
async function test(name, run) {
  if (!name.includes(filter)) return;
  await run();
  checks++;
  console.log(`PASS ${name}`);
}

await test("토큰 / 글자 크기와 글자 색상을 함께 유지", () => {
  for (const size of ["micro", "2xs", "caption", "body-sm", "body", "title", "display-sm", "display", "display-lg", "brand-hero", "brand-stat", "brand-heading"]) {
    assert.equal(cn("text-sm", `text-${size}`, "text-ink"), `text-${size} text-ink`);
    assert.equal(cn(`text-${size}`, "text-sm", "text-ink"), "text-sm text-ink");
  }
});
await test("토큰 / 모서리 그림자와 화면 크기 덮어쓰기", () => {
  assert.equal(cn("rounded-xl", "rounded-panel"), "rounded-panel");
  assert.equal(cn("rounded-panel", "rounded-xl"), "rounded-xl");
  assert.equal(cn("shadow-sm", "shadow-device", "shadow-ink/50"), "shadow-device shadow-ink/50");
  assert.equal(cn("w-full", "w-program-picker"), "w-program-picker");
  assert.equal(cn("max-w-dialog", "max-w-none"), "max-w-none");
  assert.equal(cn("max-h-dialog", "max-h-sheet"), "max-h-sheet");
  assert.equal(cn("pb-4", "pb-safe"), "pb-safe");
  assert.equal(cn("backdrop-blur-sm", "backdrop-blur-subtle"), "backdrop-blur-subtle");
});
await test("토큰 / 배경 이미지와 배경색을 함께 유지", () => {
  assert.equal(cn("bg-brand-grid", "bg-brand-canvas"), "bg-brand-grid bg-brand-canvas");
  assert.equal(cn("bg-demo-panel", "bg-brand-grid"), "bg-brand-grid");
  assert.equal(cn("bg-cover", "bg-size-brand-grid"), "bg-size-brand-grid");
  assert.equal(cn("mask-feature-fade", "mask-marquee"), "mask-marquee");
});
await test("버튼 / 공통 모양과 사용자 지정 너비·비활성 상태 유지", () => {
  const html = render(Button, { appearance: "success-solid", size: "sm", className: "w-full", disabled: true }, "저장");
  assert.match(html, /bg-success-ink/);
  assert.match(html, /text-white/);
  assert.match(html, /h-8/);
  assert.match(html, /w-full/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /appearance=/);
});
await test("버튼 / asChild 링크와 접근성 속성 보존", () => {
  const html = render(Button, { appearance: "brand", asChild: true }, React.createElement("a", { href: "/program", "aria-label": "프로그램 보기" }, "이동"));
  assert.match(html, /^<a /);
  assert.match(html, /href="\/program"/);
  assert.match(html, /aria-label="프로그램 보기"/);
  assert.doesNotMatch(html, /<button/);
});
await test("배지 / 작은 글씨와 상태 색상·외곽선을 함께 유지", () => {
  const caption = render(Badge, { appearance: "success-caption", variant: "outline" }, "추가");
  assert.match(caption, /text-2xs/);
  assert.match(caption, /text-success-ink/);
  const active = render(Badge, { appearance: "success", variant: "outline" }, "활성");
  assert.match(active, /border-success-border/);
  assert.match(active, /bg-success-soft/);
  assert.match(active, /text-success-deep/);
});
await test("입력 / 비밀번호 표시 버튼 여백과 폼 속성 유지", () => {
  const html = render(Input, { appearance: "password", className: "h-12", name: "password", type: "password", required: true });
  assert.match(html, /pr-12/);
  assert.match(html, /h-12/);
  assert.match(html, /type="password"/);
  assert.match(html, /name="password"/);
  assert.match(html, /required=""/);
});
await test("페이지 이동 / 비활성 링크는 키보드와 URL 이동에서 제외", () => {
  const disabled = render(PaginationLink, { disabled: true, href: "/users?page=0" }, "이전");
  assert.match(disabled, /aria-disabled="true"/);
  assert.match(disabled, /tabindex="-1"/);
  assert.doesNotMatch(disabled, /href=/);
  const enabled = render(PaginationLink, { href: "/users?page=2", isActive: true }, "2");
  assert.match(enabled, /href="\/users\?page=2"/);
  assert.match(enabled, /aria-current="page"/);
});
const eslint = new ESLint({ cwd: root, overrideConfigFile: `${root}eslint.shadcn.config.mjs` });
await test("린트 / 여섯 규칙이 실제 위반을 계속 차단", async () => {
  const [result] = await eslint.lintText(`import { Button } from "@/components/ui/button";
    export function Example({ dynamic }) { return <><Button className="p-[13px] bg-red-500 nonexistent-class" style={{ color: "red" }}>A</Button><Button className={dynamic()}>B</Button></>; }`,
  { filePath: `${root}src/components/design-check.tsx` });
  const found = new Set(result.messages.map((message) => message.ruleId));
  for (const rule of ["no-restyle", "no-raw-colors", "no-arbitrary-values", "no-inline-styles", "no-unknown-classes", "require-static-classes"]) {
    assert.ok(found.has(`shadcn/${rule}`), `${rule} must remain enforced`);
  }
});
await test("린트 / 컴포넌트 변형과 콘텐츠 슬롯의 정상 조합 허용", async () => {
  const [result] = await eslint.lintText(`import { Button } from "@/components/ui/button";
    import { TableCell } from "@/components/ui/table";
    export function Example() { return <><Button appearance="success" size="sm" className="w-full">저장</Button><TableCell className="px-3 text-xs text-ink-muted">이름</TableCell></>; }`,
  { filePath: `${root}src/components/design-check.tsx` });
  assert.deepEqual(result.messages, []);
});
if (!checks) throw new Error(`No checks matched: ${filter}`);
console.log(`${checks} design system checks passed.`);
