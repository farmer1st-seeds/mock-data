# Versioning

## Version Format

Versions use **x.xx format** with 2 decimal places: `1.00`, `1.01`, `1.02`, ..., `1.99`, `2.00`.

Each version is a frozen snapshot stored in its own directory under `db/mock/`.

## Directory Structure

```
db/mock/
  dataset.json          # Points to latest version
  changelog.json        # Version history
  v1.00/                # Frozen — original model (farms, cooperatives, hardcoded FKs)
    tables/
      users.json
      farms.json
      cooperatives.json
    overlays/
      users/
      farms/
      cooperatives/
  v1.02/                # Current — entity-membership model
    tables/
      users.json
      entities.json
      memberships.json
    overlays/
      users/
      entities/
```

## Version Pointer

`dataset.json.$meta.version` contains the latest version as a string:

```json
{
  "$meta": {
    "version": "1.02",
    "description": "Entity-membership model — users, entities, memberships",
    "updatedAt": "2026-02-06"
  }
}
```

The `_lib/data.mjs` functions use this pointer to resolve the default version directory.

## Breaking vs Non-Breaking Changes

### Minor bumps (`1.02` -> `1.03`)

Additive, non-breaking changes:
- Adding new rows to existing tables
- Adding new optional fields to schemas
- Adding new overlay files
- Adding new entity types
- Modifying overlay content

### Major bumps (`1.xx` -> `2.00`)

Breaking changes that require seed updates:
- Removing or renaming tables
- Removing rows or changing IDs
- Restructuring table schemas (e.g., `1.00` -> `1.02` replaced `farms` + `cooperatives` with `entities`)
- Changing the meaning of existing fields

## How Seeds Track Versions

Each seed has a `data/` directory populated by copying from `db/mock/v{x.xx}/`. The seed's data copy includes a `_dataset.json` file tracking which version it uses.

Seeds refresh data via the TUI (`d` key on Seeds page), which copies the latest version from `db/mock/`.

## Changelog Format

`changelog.json` is an array of version entries:

```json
[
  {
    "version": "1.00",
    "date": "2026-02-06",
    "breaking": false,
    "description": "Initial dataset with users, farms, and cooperatives",
    "changes": [
      "Added users table (15 rows) — farmers, traders, managers, admin",
      "Added farms table (10 rows) — linked to users and cooperatives",
      "..."
    ]
  },
  {
    "version": "1.02",
    "date": "2026-02-06",
    "breaking": true,
    "description": "Entity-membership model replacing hardcoded relationships",
    "changes": [
      "BREAKING: Replaced farms and cooperatives tables with unified entities table",
      "..."
    ]
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | `string` | Version number in x.xx format |
| `date` | `string` | ISO date (YYYY-MM-DD) |
| `breaking` | `boolean` | Whether this version has breaking changes |
| `description` | `string` | Summary of the version |
| `changes` | `string[]` | List of individual changes (prefix `BREAKING:` for breaking items) |

## Creating a New Version

### Step-by-step

1. **Copy the current version directory**:
   ```bash
   cd db/mock
   cp -r v1.02 v1.03
   ```

2. **Make changes in the new directory** (`v1.03/`):
   - Add/modify rows in `tables/*.json`
   - Add/modify overlays in `overlays/{table}/*.json`
   - Update `$meta` in table files if schema changed

3. **Update `dataset.json`**:
   - Set `$meta.version` to `"1.03"`
   - Set `$meta.updatedAt` to today's date
   - Add any new tables to the `tables` array
   - Add any new relations to the `relations` array
   - Add any new overlay names to the `overlays` array

4. **Add changelog entry** to `changelog.json`:
   ```json
   {
     "version": "1.03",
     "date": "2026-02-15",
     "breaking": false,
     "description": "Added crop prices table",
     "changes": [
       "Added prices table (20 rows)",
       "Added public_base overlay for prices"
     ]
   }
   ```

5. **Validate the new version**:
   ```bash
   node db/mock/validate.mjs
   ```

### Rules

- **Never modify a frozen version** after seeds have consumed it. Always create a new version.
- Mark `breaking: true` in the changelog if rows are removed, IDs change, or tables are restructured.
- Prefix breaking changes in the `changes` array with `BREAKING:`.
- Run validation before committing to catch schema issues, FK violations, and overlay problems.
