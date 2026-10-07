#!/usr/bin/env node
import { menu } from "./menu.js";
import { badge, dim, error, isInteractive, version } from "./ui.js";

function help(): void {
  console.log(
    [
      "",
      `${badge("skilled-potato")} ${dim(`v${version()}`)}  Curated Claude Code skills`,
      "",
      "  skilled-potato            Open the interactive menu",
      "  skilled-potato -v         Print the version",
      "  skilled-potato -h         Show this help",
      "",
    ].join("\n"),
  );
}

const arg = process.argv[2];

if (arg === "-v" || arg === "--version") {
  console.log(version());
} else if (arg === "-h" || arg === "--help") {
  help();
} else if (arg !== undefined) {
  console.error(error(`Unknown argument: ${arg}`));
  help();
  process.exitCode = 1;
} else if (!isInteractive()) {
  console.error(error("skilled-potato needs an interactive terminal."));
  process.exitCode = 1;
} else {
  menu().catch((err: unknown) => {
    console.error(error(err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  });
}
