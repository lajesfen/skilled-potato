import { remove, update } from "./actions.js";
import {
  type CatalogSkill,
  getCatalog,
  type InstalledSkill,
  isOutdated,
  scanInstalled,
} from "./skills.js";
import {
  accent,
  BACK,
  choose,
  dim,
  displayPath,
  log,
  padNames,
  pills,
  warn,
} from "./ui.js";

type Row = { skill: InstalledSkill; remote: CatalogSkill | undefined };

const isRowOutdated = ({ skill, remote }: Row) =>
  remote !== undefined && isOutdated(skill.version, remote._version);

/** Scope pill colored by status: green current, yellow outdated, gray external. */
function scopePill(row: Row): string {
  const label = row.skill.scope.toUpperCase().padEnd(6);
  if (!row.remote) {
    return pills.muted(`${label}  `);
  }
  return isRowOutdated(row)
    ? pills.outdated(`${label} ↑`)
    : pills.ok(`${label} ✓`);
}

function versionText(row: Row): string {
  if (!row.remote) {
    return dim("external");
  }
  if (isRowOutdated(row)) {
    return warn(`v${row.skill.version} → v${row.remote._version}`);
  }
  return dim(`v${row.skill.version ?? "?"}`);
}

export async function installed(): Promise<void> {
  // Works offline: without the catalogue we just can't tell what's outdated.
  const catalog = await getCatalog().catch(() => {
    log.warn("Couldn't reach the catalogue; update checks are unavailable.");
    return [] as CatalogSkill[];
  });

  for (;;) {
    const rows: Row[] = scanInstalled().map((skill) => ({
      skill,
      remote: catalog.find((s) => s.name === skill.name),
    }));
    if (rows.length === 0) {
      log.info("No skills installed in ./.claude/skills or ~/.claude/skills.");
      return;
    }
    const pad = padNames(rows.map((row) => row.skill.name));
    const pending = rows.filter(isRowOutdated).length;

    const picked = await choose(
      `Installed ${dim(`· ${rows.length} skills`)}${pending > 0 ? ` ${warn(`· ${pending} outdated`)}` : ""}`,
      rows.map((row) => ({
        value: row,
        label: `${accent(pad(row.skill.name))}  ${scopePill(row)}  ${versionText(row)}`,
        hint: row.skill.description ?? undefined,
      })),
    );
    if (picked === BACK) {
      return;
    }

    const { skill, remote } = picked;
    const action = await choose(
      [
        `${accent(skill.name)} ${versionText(picked)}`,
        ...(skill.description ? [dim(skill.description)] : []),
        `${scopePill(picked)} ${dim(displayPath(skill.dir))}`,
      ].join("\n"),
      [
        ...(isRowOutdated(picked) && remote
          ? [
              {
                value: "update" as const,
                label: "Update",
                hint: `v${skill.version} → v${remote._version}`,
              },
            ]
          : []),
        { value: "remove" as const, label: "Remove" },
      ],
    );
    if (action === "update" && remote) {
      await update(remote, skill);
    } else if (action === "remove") {
      await remove(skill);
    }
  }
}
