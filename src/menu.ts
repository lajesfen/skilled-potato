import * as p from "@clack/prompts";
import { catalogue } from "./catalogue.js";
import { installed } from "./installed.js";
import { SCOPES, scanInstalled } from "./skills.js";
import { badge, dim, error, log, version } from "./ui.js";

const screens = { catalogue, installed };

/** e.g. "2 local · 1 global" — read from disk, so it's instant and works offline. */
function installedHint(): string {
  const skills = scanInstalled();
  if (skills.length === 0) {
    return "nothing yet";
  }
  return SCOPES.map(
    (scope) => `${skills.filter((s) => s.scope === scope).length} ${scope}`,
  ).join(" · ");
}

export async function menu(): Promise<void> {
  p.intro(
    `${badge("skilled-potato")} ${dim(`v${version()} · curated Claude Code skills`)}`,
  );

  for (;;) {
    const choice = await p.select<keyof typeof screens | "exit">({
      message: "What do you want to do?",
      options: [
        {
          value: "catalogue",
          label: "Catalogue",
          hint: "all skills in the repo",
        },
        { value: "installed", label: "Installed", hint: installedHint() },
        { value: "exit", label: "Exit" },
      ],
    });
    if (p.isCancel(choice) || choice === "exit") {
      break;
    }

    try {
      await screens[choice]();
    } catch (err) {
      // Keep the session alive; report and return to the menu.
      log.error(error(err instanceof Error ? err.message : String(err)));
    }
  }

  p.outro(dim("See you! 🥔"));
}
