# Overlays

## What Are Overlays

An overlay is a **list of string values** that replaces one column across all matching tables. It declares which field names it targets (e.g., `["firstName"]`), applies the same value list to every matching column in every table, and uses deterministic shuffle for assignment.

Base table rows use generic placeholder data (e.g., "User One", "Farm A"). Overlays add realistic, context-appropriate values.

## File Format

```json
{
  "$meta": {
    "name": "first-names-kenya",
    "group": "kenya",
    "description": "Kenyan first names — family members share surnames",
    "visibility": "public",
    "fields": ["firstName"]
  },
  "values": ["Njoroge", "Kamau", "Wanjiru", "Kipchoge", "Akinyi", "..."]
}
```

### $meta Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Overlay identifier — must match filename (without `.json`) |
| `group` | No | UI grouping key (e.g., `base`, `kenya`, `nestle`) |
| `description` | Yes | Human-readable description |
| `visibility` | Yes | `public` or `private` |
| `fields` | Yes | Column names this overlay applies to (across all tables) |
| `clients` | If private | Array of client identifiers (e.g., `["nestle"]`) |

### Values

The `values` array is a flat list of strings. Each value replaces one row's field. Values are assigned via **deterministic shuffle** — the same overlay+table+field combination always produces the same assignment.

**Requirement:** `values.length >= rows.length` for every matching table. If an overlay has fewer values than rows, materialization **fails** with a clear error.

## Naming Convention

Overlay filenames follow `{field-description}-{group}.json`:

| Pattern | Example | Description |
|---------|---------|-------------|
| `*-base` | `first-names-base.json` | Default realistic values, available to all |
| `*-kenya` | `first-names-kenya.json` | Kenya-specific values |
| `*-nestle` | `entity-names-nestle.json` | Nestle-branded values (private) |

## Materialization Flow

1. Load seed tables
2. For each overlay in the stack (in order):
   - Find all table+column combos where column name matches any overlay field
   - Check `values.length >= rows.length` for each matching table
   - If insufficient: **FAIL** — report overlay name, table, field, values needed vs available
   - Deterministically shuffle values (seeded by `overlayName:tableName:fieldName`)
   - Assign shuffled values to rows positionally
3. Later overlays overwrite earlier ones on the same fields
4. Return materialized tables or error list

## Stacking Order

Overlays are applied in order. Later overlays win on field conflicts.

Standard order: `base` group -> locale group (e.g., `kenya`) -> private group (e.g., `nestle`)

Example stack for a Kenyan Nestle demo:
```json
[
  "first-names-base", "last-names-base", "emails-base", "phones-base",
  "entity-names-base", "entity-descriptions-base",
  "first-names-kenya", "last-names-kenya", "emails-kenya", "phones-kenya",
  "entity-names-kenya", "entity-descriptions-kenya",
  "entity-names-nestle", "entity-descriptions-nestle"
]
```

## Current Overlays

### Base Group

| Overlay | Fields | Values | Tables |
|---------|--------|--------|--------|
| `first-names-base` | firstName | 15 | users |
| `last-names-base` | lastName | 15 | users |
| `emails-base` | email | 15 | users |
| `phones-base` | phone | 15 | users |
| `entity-names-base` | name | 10 | entities |
| `entity-descriptions-base` | description | 10 | entities |

### Kenya Group

| Overlay | Fields | Values | Tables |
|---------|--------|--------|--------|
| `first-names-kenya` | firstName | 15 | users |
| `last-names-kenya` | lastName | 15 | users |
| `emails-kenya` | email | 15 | users |
| `phones-kenya` | phone | 15 | users |
| `entity-names-kenya` | name | 10 | entities |
| `entity-descriptions-kenya` | description | 10 | entities |

### Nestle Group (Private)

| Overlay | Fields | Values | Tables |
|---------|--------|--------|--------|
| `entity-names-nestle` | name | 10 | entities |
| `entity-descriptions-nestle` | description | 10 | entities |

## Adding a New Overlay

1. Create a JSON file at `packages/mock-overlays/{field-desc}-{group}.json`
2. Add `$meta` with name, group, description, visibility, fields (+ clients if private)
3. Add `values` array — must have at least as many values as the largest matching table
4. Validate: `node packages/mock-overlays/validate.mjs`

## Validation Rules

- Filename (without `.json`) must match `$meta.name`
- `$meta.visibility` must be `public` or `private`
- Private overlays must have non-empty `clients` array
- `$meta.fields` must be a non-empty array of strings
- `values` must be a non-empty array
- `values.length >= rows.length` for every matching base table

## Legacy Overlay Names

Old overlay names (`public_base`, `public_kenya`, `private_nestle`) are expanded to their new equivalents via `LEGACY_OVERLAY_MAP` in the platform code. Existing shares continue to work.
