import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
for (const name of Object.keys(scripts).filter((name) => name.startsWith("test:"))) {
  const result = spawnSync("pnpm", ["run", name], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
