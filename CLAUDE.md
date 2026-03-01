# Mock Data

Central source of truth for all seed demo data. Two packages published on GitHub Packages:

- `@farmer1st-seeds/mock-data` — table JSON files (users, entities, memberships)
- `@farmer1st-seeds/mock-overlays` — overlay JSON files (realistic names, regional data)

## Data Model

3 tables, universal relationship model:

```
users ──────────────┐
  identity only     │
  (no roles here)   ├── memberships ── universal join table
                    │     source has roles within target
entities ───────────┘     user↔entity, entity↔entity, user↔user
  farm | cooperative |
  brand | trader |
  agency
```

### Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| **users** | People — farmers, managers, employees, family | id, firstName, lastName, email, phone |
| **entities** | Organizations — typed with details object | id, type, name, status, details |
| **memberships** | Universal relationships with roles | sourceType/Id → targetType/Id, roles[], status |

### Entity Types

| Type | ID Prefix | Details Fields |
|------|-----------|----------------|
| farm | `farm_NNN` | region, size (hectares), crops[] |
| cooperative | `coop_NNN` | region, established (YYYY) |
| brand | `brand_NNN` | industry, country |
| trader | `trader_NNN` | specialty, country |
| agency | `agency_NNN` | focus, country |

### Roles

4 progressive roles: `member` < `viewer` < `editor` < `admin`

### Membership Direction

**"source has roles within target"**

```
usr_003 → farm_001 [admin]           user is admin of farm
farm_001 → coop_001 [member]         farm belongs to coop
brand_001 → coop_001 [viewer]        brand can view coop data
usr_006 → usr_003 [member]           family association
```

### Polymorphic Foreign Keys

`memberships.sourceId` and `memberships.targetId` point to either `users.id` or `entities.id` depending on `sourceType`/`targetType`. Relations in `dataset.json` use `when` clauses.

## Structure

```
mock-data/
  CLAUDE.md
  docs/
  .github/workflows/
  packages/
    mock-data/                      # @farmer1st-seeds/mock-data v3.0.0
      package.json
      dataset.json                  # table registry + relations (no version pointer)
      changelog.json
      users.json                    # flat — tables at package root
      entities.json
      memberships.json
      checksums.json
      validate.mjs
    mock-overlays/                  # @farmer1st-seeds/mock-overlays v3.0.0
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

## Versioning

Version comes from `package.json` (semver). No version directories — single flat layout.

- **mock-data**: table files live at package root
- **mock-overlays**: overlay files live flat at package root (one per field+group)
- Minor bumps: additive changes (new rows, new overlays, new fields)
- Major bumps: breaking changes (removed rows, changed IDs, restructured tables)

## Overlays

Overlays live in `packages/mock-overlays/` and are published as `@farmer1st-seeds/mock-overlays`. Each overlay is a flat JSON file with a list of string values that replace one column across all matching tables. See `docs/overlays.md` for format, stacking, and validation details.

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
node packages/mock-data/validate.mjs                      # Validate mock tables
node packages/mock-data/validate.mjs --seed-dir /path      # Validate a seed's data copy
node packages/mock-overlays/validate.mjs                   # Validate overlay files
```

Mock data: 6 checks (dataset consistency, schema completeness, ID uniqueness, FK integrity, relations consistency, checksums).

Overlays: 5 checks (filename matches name, visibility valid, fields array, values array, values >= row count).

## Conventions

- IDs: `{prefix}_{NNN}` — usr_001, farm_001, coop_001, brand_001, mbr_001
- Base table rows use placeholder names (User One, Farm A) — overlays add realistic names
- `$meta.schema` is documentation only, not enforced by code
- trader and agency entity types exist but are not actively used yet

## Related Repos

| Repo | Description |
|------|-------------|
| `farmer1st-seeds/sdk` | CLI downloads mock-data + mock-overlays during `farmer-seed setup` and `farmer-seed data pull` |
| `farmer1st-seeds/platform` | Console/landing apps consume mock-data + mock-overlays as devDependencies for D1 bootstrap |
