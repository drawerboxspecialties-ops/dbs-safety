import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const api = "src/app/api";
const parked = ".export-api";

if (existsSync(parked)) rmSync(parked, { recursive: true, force: true });
if (existsSync(api)) renameSync(api, parked);

try {
  execSync("npx next build", { stdio: "inherit", env: process.env });
  writeFileSync(join("out", ".nojekyll"), "");
} finally {
  if (existsSync(parked)) {
    if (existsSync(api)) rmSync(api, { recursive: true, force: true });
    renameSync(parked, api);
  }
}
