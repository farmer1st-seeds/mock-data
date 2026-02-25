# API Reference

Functions exported from `db/mock/_lib/data.mjs`. These are used by the TUI, validation CLI, and seed scaffolding scripts.

## Constants

### `MOCK_DIR`

```javascript
export const MOCK_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
```

Absolute path to the `db/mock/` directory. Computed relative to `_lib/data.mjs`.

## Functions

### resolveMockVersion(version?)

Resolve the directory path for a mock data version.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `version` | `string?` | `undefined` | Version in x.xx format. If omitted, uses latest from `dataset.json` |

**Returns:** `{ dir: string, version: string, dataset: object }`

| Field | Description |
|-------|-------------|
| `dir` | Absolute path to the version directory (e.g., `.../db/mock/v1.02`) |
| `version` | Resolved version string (e.g., `"1.02"`) |
| `dataset` | Parsed contents of `dataset.json` |

**Throws:** `Error` if the version directory does not exist.

**Example:**
```javascript
const { dir, version } = resolveMockVersion()       // latest
const { dir } = resolveMockVersion('1.00')           // specific version
```

---

### listMockVersions()

List all available mock data versions.

**Parameters:** None

**Returns:** `string[]` — sorted array of version strings (e.g., `["1.00", "1.02"]`)

Scans the `db/mock/` directory for subdirectories matching the pattern `v{digits}.{2 digits}` (e.g., `v1.00`, `v1.02`). Returns versions sorted by numeric value.

---

### listAvailableOverlays()

List all overlays in the latest mock version with metadata and sample data.

**Parameters:** None

**Returns:** `Array<{ name, tables, samples, visibility, clients?, description }>`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Overlay name (e.g., `"public_base"`) |
| `tables` | `string[]` | Tables this overlay has files for (e.g., `["users", "entities"]`) |
| `samples` | `Array<{ id, table, field, value }>` | Sample override entries |
| `visibility` | `string` | `"public"` or `"private"` |
| `clients` | `string[]?` | Client identifiers (for private overlays) |
| `description` | `string` | Human-readable description from `$meta` |

Scans `overlays/` subdirectories in the latest version. Groups by overlay name across tables.

---

### validateData(dataDir, relations?)

Validate data quality for a version directory or seed data copy.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dataDir` | `string` | (required) | Path to directory containing `tables/` and optionally `overlays/` |
| `relations` | `object[]` | `[]` | Relations array from `dataset.json` |

**Returns:** `{ passed: string[], failed: Array<{ check: string, errors: string[] }> }`

| Field | Type | Description |
|-------|------|-------------|
| `passed` | `string[]` | Names of checks that passed |
| `failed` | `Array<{ check, errors }>` | Failed checks with error messages |

Runs 4 checks:
1. **Schema completeness** — every non-nullable field present in every row
2. **ID uniqueness** — no duplicate IDs within a table
3. **Foreign key integrity** — all FK references point to valid rows (respects `when` clauses)
4. **Overlay validity** — filename/meta consistency, override IDs exist, private overlays have clients

**Example:**
```javascript
import { validateData, resolveMockVersion } from './db/mock/_lib/data.mjs'

const mock = resolveMockVersion()
const dataset = JSON.parse(readFileSync('db/mock/dataset.json', 'utf8'))
const results = validateData(mock.dir, dataset.relations)

if (results.failed.length === 0) {
  console.log('All checks passed')
}
```

---

### loadMockInfo()

Load comprehensive mock data information for display (used by the TUI).

**Parameters:** None

**Returns:** `{ version, tables, overlays, relations, versions } | null`

| Field | Type | Description |
|-------|------|-------------|
| `version` | `string` | Current version from `dataset.json` |
| `tables` | `Array<{ name, rows, schema, relations }>` | Table info with row counts and relation summaries |
| `overlays` | `Array<...>` | Same as `listAvailableOverlays()` return |
| `relations` | `object[]` | Raw relations from `dataset.json` |
| `versions` | `string[]` | All available versions |

Returns `null` if an error occurs (e.g., missing files).

The `tables[].relations` field contains formatted strings like `"← users"` (incoming) and `"→ entities"` (outgoing), with counts for multiple relations (e.g., `"← users(2)"`).
