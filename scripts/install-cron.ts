import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const beginMarker = "# BEGIN liquor-arrival-alarm";
const endMarker = "# END liquor-arrival-alarm";
const cwd = resolve(".");
const nodePath = process.execPath;
const scriptPath = resolve("src/index.ts");
const logPath = resolve("logs/cron.log");

async function main(): Promise<void> {
  await mkdir(resolve("logs"), { recursive: true });

  const current = await readCrontab();
  const next = [
    stripManagedBlock(current).trim(),
    managedBlock()
  ].filter(Boolean).join("\n\n") + "\n";

  await writeCrontab(next);
  console.log("Installed liquor-arrival-alarm cron schedule");
  console.log("Runs at 06:00, 07:00, 08:00, 10:00, 11:00, 12:00 local system time");
}

async function readCrontab(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("crontab", ["-l"]);
    return stdout;
  } catch {
    return "";
  }
}

function managedBlock(): string {
  const command = [
    `cd ${shellQuote(cwd)}`,
    `${shellQuote(nodePath)} --experimental-strip-types ${shellQuote(scriptPath)} >> ${shellQuote(logPath)} 2>&1`
  ].join(" && ");

  return [
    beginMarker,
    `0 6,7,8,10,11,12 * * * ${command}`,
    endMarker
  ].join("\n");
}

function stripManagedBlock(value: string): string {
  const lines = value.split(/\r?\n/);
  const output: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (line.trim() === beginMarker) {
      skipping = true;
      continue;
    }

    if (line.trim() === endMarker) {
      skipping = false;
      continue;
    }

    if (!skipping) {
      output.push(line);
    }
  }

  return output.join("\n");
}

function writeCrontab(content: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = execFile("crontab", ["-"], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolvePromise();
    });

    child.stdin?.end(content);
  });
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
