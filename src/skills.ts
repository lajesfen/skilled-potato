import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = "lajesfen-cip/skilled-potato";
const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO}/main`;

export type Scope = "local" | "global";
export const SCOPES: Scope[] = ["local", "global"];

export type CatalogSkill = {
  name: string;
  _version: string;
  description: string;
  files: string[];
};

export type InstalledSkill = {
  name: string;
  scope: Scope;
  dir: string;
  description: string | null;
  /** From skill.json; null for skills that didn't come from this repo. */
  version: string | null;
};

export function skillsDir(scope: Scope): string {
  const base = scope === "global" ? os.homedir() : process.cwd();
  return path.join(base, ".claude", "skills");
}

let catalogPromise: Promise<CatalogSkill[]> | null = null;

export function getCatalog(): Promise<CatalogSkill[]> {
  catalogPromise ??= fetch(`${RAW_BASE_URL}/skills/manifest.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch skill catalog");
      }
      return response.json() as Promise<CatalogSkill[]>;
    })
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

function readSkillJson(dir: string): Partial<CatalogSkill> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "skill.json"), "utf-8"));
  } catch {
    return null;
  }
}

/** Reads `description:` from SKILL.md frontmatter. */
function readFrontmatterDescription(dir: string): string | null {
  try {
    const raw = fs.readFileSync(path.join(dir, "SKILL.md"), "utf-8");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    return frontmatter.match(/^description:\s*(.+)$/m)?.[1].trim() ?? null;
  } catch {
    return null;
  }
}

/** Every skill folder in ./.claude/skills and ~/.claude/skills. */
export function scanInstalled(): InstalledSkill[] {
  return SCOPES.flatMap((scope) => {
    const root = skillsDir(scope);
    if (!fs.existsSync(root)) {
      return [];
    }
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const dir = path.join(root, entry.name);
        const meta = readSkillJson(dir);
        return {
          name: entry.name,
          scope,
          dir,
          description:
            meta?.description ?? readFrontmatterDescription(dir) ?? null,
          version: meta?._version ?? null,
        };
      });
  });
}

export function isOutdated(local: string | null, remote: string): boolean {
  if (!local) {
    return false;
  }
  const a = local.split(".").map(Number);
  const b = remote.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) < (b[i] ?? 0);
    }
  }
  return false;
}

/** Downloads a catalog skill into `scope`, replacing any existing copy. */
export async function installSkill(
  skill: CatalogSkill,
  scope: Scope,
): Promise<string> {
  const files = await Promise.all(
    skill.files.map(async (file) => {
      const response = await fetch(
        `${RAW_BASE_URL}/skills/${skill.name}/${file}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to download "${file}" for "${skill.name}"`);
      }
      return { file, data: Buffer.from(await response.arrayBuffer()) };
    }),
  );

  // Write only after every download succeeded, so a failure leaves the old copy intact.
  const dest = path.join(skillsDir(scope), skill.name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(
    path.join(dest, "skill.json"),
    `${JSON.stringify(skill, null, 2)}\n`,
  );
  for (const { file, data } of files) {
    const target = path.join(dest, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  }
  return dest;
}

export function removeSkill(skill: InstalledSkill): void {
  fs.rmSync(skill.dir, { recursive: true, force: true });
}
