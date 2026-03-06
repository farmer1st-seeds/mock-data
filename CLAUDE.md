# Mock Overlays

Overlay JSON files for the Seeds ecosystem. Published on GitHub Packages as `@farmer1st-seeds/mock-overlays`.

## Structure

```
mock-data/
  CLAUDE.md
  docs/
  .github/workflows/
  packages/
    mock-overlays/                  # @farmer1st-seeds/mock-overlays
      package.json
      validate.mjs
      first-names-base.json         # flat — one file per field+group
      last-names-base.json
      emails-base.json
      phones-base.json
      entity-names-base.json
      entity-descriptions-base.json
      first-names-kenya.json
      last-names-kenya.json
      emails-kenya.json
      phones-kenya.json
      entity-names-kenya.json
      entity-descriptions-kenya.json
      entity-names-nestle.json      # private — Nestle client
      entity-descriptions-nestle.json
```

## Overlays

Overlays are flat JSON files with string values that replace one column across all matching tables. See `docs/overlays.md` for format, stacking, and validation details.

### Overlay Format

```json
{
  "$meta": { "name": "first-names-kenya", "group": "kenya", "fields": ["firstName"], "visibility": "public" },
  "values": ["Njoroge", "Kamau", "Wanjiru", ...]
}
```

- `fields`: column names this overlay applies to (across all tables)
- `values`: flat string array — one value per row, assigned via deterministic shuffle
- `group`: for console UI grouping (base, kenya, nestle)
- Naming: `{field}-{group}.json` (e.g., `first-names-kenya.json`)

## Validation

```bash
node packages/mock-overlays/validate.mjs                   # Validate overlay files
```

Overlays: 5 checks (filename matches name, visibility valid, fields array, values array, values >= row count).

## Versioning

Version comes from `package.json` (semver). No version directories — single flat layout.

- Minor bumps: additive changes (new overlays, new values)
- Major bumps: breaking changes (removed overlays, restructured format)

## Related Repos

| Repo | Description |
|------|-------------|
| `farmer1st-seeds/sdk` | CLI downloads overlays during `farmer-seed setup` and `farmer-seed data pull` |
| `farmer1st-seeds/platform` | Console apps consume overlays as devDependency for D1 bootstrap |
