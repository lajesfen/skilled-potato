import { install, remove, update } from "./actions.js";
import {
  type CatalogSkill,
  getCatalog,
  type InstalledSkill,
  isOutdated,
  SCOPES,
  type Scope,
  scanInstalled,
} from "./skills.js";
import { accent, BACK, choose, dim, padNames, pills, task } from "./ui.js";

type Row = { skill: CatalogSkill; copies: InstalledSkill[] };

/** ` LOCAL ✓ ` green, ` LOCAL ↑ ` yellow when outdated, blank (same width) when not installed. */
function scopePill(row: Row, scope: Scope, showMissing = false): string {
  const label = scope.toUpperCase();
  const copy = row.copies.find((c) => c.scope === scope);
  if (!copy) {
    return showMissing
      ? pills.muted(`${label} –`)
      : " ".repeat(label.length + 4);
  }
  return isOutdated(copy.version, row.skill._version)
    ? pills.outdated(`${label} ↑`)
    : pills.ok(`${label} ✓`);
}

type Action =
  | { kind: "install"; scope: Scope }
  | { kind: "update"; copy: InstalledSkill }
  | { kind: "remove"; copy: InstalledSkill };

type ActionOption = { value: Action; label: string; hint?: string };

function actionsFor({ skill, copies }: Row): ActionOption[] {
  const options: ActionOption[] = [];
  const removals: ActionOption[] = [];
  for (const scope of SCOPES) {
    const copy = copies.find((c) => c.scope === scope);
    if (!copy) {
      options.push({
        value: { kind: "install", scope },
        label: `Install ${scope === "local" ? "locally" : "globally"}`,
      });
      continue;
    }
    if (isOutdated(copy.version, skill._version)) {
      options.push({
        value: { kind: "update", copy },
        label: `Update ${scope}`,
        hint: `${copy.version} → ${skill._version}`,
      });
    }
    removals.push({
      value: { kind: "remove", copy },
      label: `Remove from ${scope}`,
    });
  }
  // Destructive actions last, so the default selection is never a removal.
  return [...options, ...removals];
}

export async function catalogue(): Promise<void> {
  const catalog = await task("Fetching catalogue", getCatalog);
  const pad = padNames(catalog.map((skill) => skill.name));

  for (;;) {
    const installed = scanInstalled();
    const rows: Row[] = catalog.map((skill) => ({
      skill,
      copies: installed.filter((i) => i.name === skill.name),
    }));

    const picked = await choose(
      `Catalogue ${dim(`· ${catalog.length} skills`)}`,
      rows.map((row) => ({
        value: row,
        label:
          `${accent(pad(row.skill.name))}  ${scopePill(row, "local")} ${scopePill(row, "global")}`.trimEnd(),
        hint: row.skill.description,
      })),
    );
    if (picked === BACK) {
      return;
    }

    const action = await choose(
      [
        `${accent(picked.skill.name)} ${dim(`v${picked.skill._version}`)}`,
        dim(picked.skill.description),
        `${scopePill(picked, "local", true)} ${scopePill(picked, "global", true)}`,
      ].join("\n"),
      actionsFor(picked),
    );
    if (action === BACK) {
      continue;
    }
    if (action.kind === "install") {
      await install(picked.skill, action.scope);
    } else if (action.kind === "update") {
      await update(picked.skill, action.copy);
    } else {
      await remove(action.copy);
    }
  }
}
