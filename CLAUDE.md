# Mock Data

Central source of truth for all seed demo data. Published as `@farmer1st-seeds/mock-data` on GitHub Packages and consumed by the CLI and platform repo. Data is versioned — each version is a frozen snapshot.

## Data Model (v1.02)

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

| Role | Meaning |
|------|---------|
| `member` | Base association — belongs to, is part of |
| `viewer` | Read-only access to target's data |
| `editor` | Can modify target's data |
| `admin` | Full control — manage members, settings |

Seeds decide what each role unlocks in their API. These are conventions, not enforced.

### Membership Direction

**"source has roles within target"**

```
usr_003 → farm_001 [admin]           user is admin of farm
farm_001 → coop_001 [member]         farm belongs to coop
brand_001 → coop_001 [viewer]        brand can view coop data
usr_006 → usr_003 [member]           family association
```

### Cascading Visibility

Access follows the membership graph:

```
usr_011 (brand viewer)
  └─ viewer in brand_001
       └─ brand_001 is viewer in coop_001
            └─ farm_001, farm_002, farm_003 are members of coop_001
                 └─ each farm has admins, editors
```

Seeds implement the graph traversal. The mock data provides the edges.

### Polymorphic Foreign Keys

`memberships.sourceId` and `memberships.targetId` point to either `users.id` or `entities.id` depending on `sourceType`/`targetType`. Relations in `dataset.json` use `when` clauses:

```json
{ "from": "memberships.sourceId", "to": "users.id", "when": { "sourceType": "user" } }
```

## Structure

```
mock-data/
  dataset.json          # Version pointer, table registry, relations
  changelog.json        # Version history
  validate.mjs          # CLI — data quality checks
  package.json          # @farmer1st-seeds/mock-data
  docs/                 # Detailed documentation (repo-only, not published)
  v1.00/                # Version 1.00 (frozen — old model)
    tables/
    overlays/
  v1.02/                # Version 1.02 (current — entity-membership model)
    tables/
      users.json
      entities.json
      memberships.json
    overlays/
      users/
        public_base.json
        public_kenya.json
      entities/
        public_base.json
        public_kenya.json
        private_nestle.json
```

## Versioning

Versions use **x.xx format** (2 decimal places): `1.00`, `1.01`, `1.02`, ..., `2.00`.

- `dataset.json.$meta.version` points to the **latest** version (string, e.g. `"1.02"`)
- Each version lives in `v{x.xx}/` with its own tables and overlays
- Seeds track which version they're using in `db/_dataset.json`
- Seeds can pin to any available version or upgrade to latest
- Minor bumps (`1.02` -> `1.03`): additive changes — new rows, new overlays, new fields
- Major bumps (`1.xx` -> `2.00`): breaking changes — removed rows, changed IDs, restructured tables

## Creating a New Version

1. Copy the current version directory: `cp -r v1.02 v1.03`
2. Make changes in `v1.03/` (add rows, tables, overlays, modify data)
3. Bump `dataset.json.$meta.version` to `"1.03"`
4. Add entry to `changelog.json` (mark `breaking: true` if rows removed or IDs changed)
5. Run `node validate.mjs` to verify the new version

Seeds on v1.02 keep working. They upgrade when they run data refresh from the TUI.

## Adding a New Entity Type

1. Add rows to `v{x.xx}/tables/entities.json` with the new type
2. Document the type's details fields in `$meta.typeSchemas`
3. Add overlay entries in `v{x.xx}/overlays/entities/*.json`
4. Run `node validate.mjs`

## Adding a New Table

1. Create `v{x.xx}/tables/{name}.json` with `$meta` (table, description, schema) and `rows`
2. Add table name to `dataset.json` `tables` array
3. Add any foreign key relations to `dataset.json` `relations` array (use `when` for polymorphic FKs)
4. Create `v{x.xx}/overlays/{name}/public_base.json` with realistic names
5. Run `node validate.mjs`

## Adding an Overlay

1. Create `v{x.xx}/overlays/{table}/public_{name}.json` or `v{x.xx}/overlays/{table}/private_{client}.json`
2. Add overlay name to `dataset.json` `overlays` array
3. Use `overrides` keyed by row ID — shallow merge per row
4. Private overlays must have `clients` array in `$meta`
5. Run `node validate.mjs`

## Overlay Stacking Order

`public_base` -> `public_{locale}` -> `private_{client}`

Later overlays win on field conflicts within a row.

## Runtime Overlay Model

Overlays are applied at **runtime**, not at build time. All tables and overlays are stored in D1 as JSON blobs on the `seeds` table (`base_data` column). The worker reads from D1 and applies overlays per-request:

```
D1 seeds table (base_data JSON) → parseSeedData → mergeSeedTables → getSeedOverlays → applyOverlayStack → Serve

Request → Determine overlay stack → Apply at runtime → Serve
           └─ D1 shares table query by email/domain (defaults to empty stack if no match)
```

- **D1 shares** — query `shares` table by seed + email/domain to resolve overlay stack per user. If no matching share exists, defaults to an empty stack (no overlays).
- Worker imports `applyOverlayStack()` from `@farmer1st/data` to merge overlays per table at request time.

## Validation

```bash
node validate.mjs                              # Validate latest mock version
node validate.mjs --version 1.00               # Validate specific version
node validate.mjs --seed-dir /path/to/data     # Validate a seed's data copy
```

6 checks: dataset consistency, schema completeness, ID uniqueness, foreign key integrity, relations consistency, overlay validity.

## Conventions

- IDs: `{prefix}_{NNN}` — usr_001, farm_001, coop_001, brand_001, mbr_001
- Base table rows use placeholder names (User One, Farm A) — overlays add realistic names
- `$meta.schema` is documentation only, not enforced by code
- Versions use x.xx format (2 decimal places)
- Never modify a frozen version after seeds have consumed it — create a new version instead
- trader and agency entity types exist but are not actively used yet

## Related Repos

| Repo | Description |
|------|-------------|
| `farmer1st-seeds/sdk` | CLI downloads this package during `farmer-seed setup` and `farmer-seed data pull` |
| `farmer1st-seeds/platform` | Console/landing apps consume this as a devDependency for D1 bootstrap |
