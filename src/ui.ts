import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import chalk from "chalk";

const ACCENT_HEX = "#FF8C00";

export const bold = chalk.bold;
export const dim = chalk.dim;
export const accent = chalk.hex(ACCENT_HEX);

/** A solid label with a background, e.g. the ` skilled-potato ` header. */
const pill =
  (bg: string, fg = "#000000") =>
  (text: string) =>
    chalk.bgHex(bg).hex(fg).bold(` ${text} `);

export const badge = pill(ACCENT_HEX);
export const pills = {
  ok: pill("#3FB950"),
  outdated: pill("#E3B341"),
  muted: pill("#3A3A3A", "#C9C9C9"),
};
export const success = chalk.green;
export const warn = chalk.yellow;
export const error = chalk.red;

export const log = p.log;

/** True when we can show arrow-key prompts (a real terminal, not CI). */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && !p.isCI();
}

export const BACK = Symbol("back");

/** A select that returns BACK on cancel (Esc/Ctrl+C) or when "← Back" is picked. */
export async function choose<T>(
  message: string,
  options: { value: T; label: string; hint?: string }[],
): Promise<T | typeof BACK> {
  const value = await p.select<T | typeof BACK>({
    message,
    options: [
      ...(options as p.Option<T | typeof BACK>[]),
      { value: BACK, label: dim("← Back") },
    ],
  });
  return p.isCancel(value) ? BACK : value;
}

export async function confirm(message: string): Promise<boolean> {
  const value = await p.confirm({ message, initialValue: false });
  return !p.isCancel(value) && value;
}

/** Runs `fn` behind a spinner; rethrows on failure. */
export async function task<T>(
  message: string,
  fn: () => Promise<T>,
  done: (result: T) => string = () => message,
): Promise<T> {
  const spinner = p.spinner();
  spinner.start(message);
  try {
    const result = await fn();
    spinner.stop(done(result));
    return result;
  } catch (err) {
    spinner.error(message);
    throw err;
  }
}

/** Shortens a path for display: relative to cwd, or `~`-prefixed under home. */
export function displayPath(target: string): string {
  const relative = path.relative(process.cwd(), target);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative || ".";
  }
  const home = os.homedir();
  return target.startsWith(home) ? `~${target.slice(home.length)}` : target;
}

export function padNames(names: string[]): (name: string) => string {
  const width = Math.max(0, ...names.map((name) => name.length));
  return (name) => name.padEnd(width);
}

/** Reads the CLI version from package.json (one level above src/ and dist/). */
export function version(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
