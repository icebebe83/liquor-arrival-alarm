import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const beginMarker = "# BEGIN liquor-arrival-alarm";
const endMarker = "# END liquor-arrival-alarm";

async function main(): Promise<void> {
  const current = await readCrontab();
  const next = stripManagedBlock(current).trim();

  if (next.length === 0) {
    await removeCrontab();
  } else {
    await writeCrontab(next + "\n");
  }

  console.log("Removed liquor-arrival-alarm cron schedule");
}

async function readCrontab(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("crontab", ["-l"]);
    return stdout;
  } catch {
    return "";
  }
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

async function removeCrontab(): Promise<void> {
  await execFileAsync("crontab", ["-r"]).catch(() => undefined);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
