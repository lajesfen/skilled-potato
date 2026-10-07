import {
  type CatalogSkill,
  type InstalledSkill,
  installSkill,
  removeSkill,
  type Scope,
  skillsDir,
} from "./skills.js";
import { accent, confirm, dim, displayPath, log, task, warn } from "./ui.js";

export function install(skill: CatalogSkill, scope: Scope) {
  return task(
    `Installing ${accent(skill.name)} ${dim(`(${scope})`)}`,
    () => installSkill(skill, scope),
    (dest) =>
      `Installed ${accent(skill.name)}${dim(`@${skill._version}`)} → ${dim(displayPath(dest))}`,
  );
}

export function update(skill: CatalogSkill, installed: InstalledSkill) {
  return task(
    `Updating ${accent(skill.name)} ${dim(`(${installed.scope})`)}`,
    () => installSkill(skill, installed.scope),
    () =>
      `Updated ${accent(skill.name)} ${dim(installed.version ?? "?")} → ${warn(skill._version)}`,
  );
}

export async function remove(skill: InstalledSkill): Promise<void> {
  const where = dim(displayPath(skillsDir(skill.scope)));
  if (await confirm(`Remove ${accent(skill.name)} from ${where}?`)) {
    removeSkill(skill);
    log.success(`Removed ${accent(skill.name)} ${dim(`(${skill.scope})`)}`);
  }
}
