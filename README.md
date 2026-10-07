# Skilled Potato 🥔

Curated Claude Code skills, installable one at a time into any project via the `skilled-potato` CLI.

## Install the CLI

```
npm install -g git+https://github.com/lajesfen-cip/skilled-potato.git
```

## Usage

```
skilled-potato
```

Opens a menu with two screens:

- **Catalogue** — every skill in this repo, marked `L`/`G` when installed locally
  (`./.claude/skills/`) or globally (`~/.claude/skills/`); yellow means outdated.
  Pick a skill to install, update, or remove it.
- **Installed** — everything in the local and global `.claude/skills/` folders,
  including skills that didn't come from this repo. Pick one to update or remove it.

Installing fetches only the files listed in that skill's `skill.json`, with no full clone.

## Development

Dev tooling uses [bun](https://bun.sh) (package manager + running TypeScript directly,
no separate transpile step needed). The published CLI itself still targets plain
Node — end users installing `skilled-potato` don't need bun installed.

```
bun install
bun run dev               # run the CLI directly from TypeScript source (no build step)
bun run build             # compile src -> dist (tsc)
bun run lint              # check formatting/lint rules with Biome
bun run lint:fix          # apply Biome's safe fixes
bun run generate-manifest # regenerate skills/manifest.json from skills/*/skill.json
```

The `prepare` script (invoked automatically on `npm install`/`npm install -g` for
end users, and on `bun install` here) builds `dist/`.
CI (`.github/workflows/ci.yml`) runs lint, build, and a check that
`skills/manifest.json` is up to date on every push/PR to `main`.

Skill content lives in `skills/<name>/` at the repo root (each with a `SKILL.md`
and a `skill.json` manifest). This repo does not use its own skills — it's the
source the CLI copies from, nothing more.

`skills/manifest.json` aggregates every skill's `skill.json` into one file, so
the CLI only needs a single request to know the whole
catalog instead of one request per skill. **After adding, removing, or editing
a skill, run `bun run generate-manifest` and commit the result** — CI fails the
build if the manifest drifts out of sync with the individual `skill.json` files.