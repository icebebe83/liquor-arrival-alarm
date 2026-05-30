import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const label = "com.liquor-arrival-alarm";
const plistPath = `${homedir()}/Library/LaunchAgents/${label}.plist`;

async function main(): Promise<void> {
  await execFileAsync("launchctl", ["unload", plistPath]).catch(() => undefined);
  await rm(plistPath, { force: true });
  console.log(`Uninstalled ${label}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
