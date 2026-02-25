# Overlays

## What Are Overlays

Overlays are JSON files that override specific fields in base table rows. They allow the same underlying data to be presented differently depending on context — for example, using Kenyan names and locations for a Kenya demo, or client-branded entity names for a Nestle presentation.

Base table rows use generic placeholder data (e.g., "User One", "Farm A"). Overlays add realistic, context-appropriate values.

## Naming Convention

Overlay names follow the pattern `{visibility}_{identifier}`:

| Pattern | Example | Description |
|---------|---------|-------------|
| `public_base` | `public_base` | Default realistic names, available to all |
| `public_{locale}` | `public_kenya` | Locale-specific names, locations, context |
| `private_{client}` | `private_nestle` | Client-branded names for specific demos |

## File Structure

Overlays are organized by table within a version directory:

```
v1.02/overlays/
  users/
    public_base.json        # Realistic names and emails for all users
    public_kenya.json       # Kenyan names, +254 phones
  entities/
    public_base.json        # Realistic entity names and descriptions
    public_kenya.json       # Kenyan locations, counties
    private_nestle.json     # Nestle-branded cooperative and brand names
```

Each overlay file applies to one table. The same overlay name (e.g., `public_kenya`) can have files in multiple table directories.

## File Format

```json
{
  "$meta": {
    "table": "users",
    "overlay": "kenya",
    "visibility": "public",
    "description": "Kenyan names, +254 phones, local emails — family members share surnames"
  },
  "overrides": {
    "usr_002": { "firstName": "Kamau", "lastName": "Njoroge", "email": "kamau@highlandscoop.org" },
    "usr_003": { "firstName": "Wanjiru", "lastName": "Muthoni", "email": "wanjiru.muthoni@gmail.com" }
  }
}
```

### $meta Fields

| Field | Required | Description |
|-------|----------|-------------|
| `table` | Yes | Table this overlay applies to (must match directory name) |
| `overlay` | Yes | Overlay identifier (matches filename without prefix) |
| `visibility` | Yes | `public` or `private` |
| `description` | Yes | Human-readable description of what this overlay provides |
| `clients` | If private | Array of client identifiers (e.g., `["nestle"]`) |

### Overrides

The `overrides` object is keyed by row ID. Each value is a partial object — only the fields that differ from the base table need to be specified. Overrides are applied as a **shallow merge** per row.

Example — base row:
```json
{ "id": "usr_003", "firstName": "User", "lastName": "Three", "email": "user3@example.com", "phone": "+10000000003" }
```

After `public_base` overlay:
```json
{ "id": "usr_003", "firstName": "Amina", "lastName": "Osei", "email": "amina.osei@gmail.com", "phone": "+233244000002" }
```

After `public_base` then `public_kenya` overlay:
```json
{ "id": "usr_003", "firstName": "Wanjiru", "lastName": "Muthoni", "email": "wanjiru.muthoni@gmail.com", "phone": "+254722100002" }
```

Note: `public_kenya` overrides all fields that `public_base` set, because it appears later in the stack.

## Stacking Order

Overlays are applied in order. Later overlays win on field conflicts within a row.

Standard order: `public_base` -> `public_{locale}` -> `private_{client}`

Example stack for a Kenyan Nestle demo: `["public_base", "public_kenya", "private_nestle"]`

Applied per-table:
1. Start with base table rows
2. Apply `public_base` overrides (realistic generic names)
3. Apply `public_kenya` overrides (Kenyan names and locations)
4. Apply `private_nestle` overrides (Nestle-branded entity names)

Not every overlay has entries for every row. If an overlay has no override for a given row, that row is unchanged by that overlay.

## Runtime vs Build-Time Application

Overlays are **not** applied at build time. The full process:

1. **Build time**: All tables and all overlays are copied into each seed's `data/` directory. Codegen produces `data-loader.ts` which imports everything.
2. **Runtime**: The worker determines the overlay stack and applies it per-request using `applyOverlayStack()` from `@farmer1st/data`.

```
Overlay stack = D1 shares table query by email/domain (defaults to empty stack if no match)
```

This means the same worker bundle can serve different overlay stacks to different users.

## Overlay Configuration

Overlay stacks are resolved from the D1 `shares` table by seed + target (email or domain). Overlays are managed via shares in the console. If no matching share exists, the overlay stack defaults to an empty array (no overlays applied).

### Shares Query
```sql
SELECT overlays FROM shares
WHERE seed = ? AND target_type = ? AND target = ? AND status = 'active'
```
Returns a JSON array of overlay names, e.g. `["public_base", "public_kenya", "private_nestle"]`.

## Current Overlays (v1.02)

### public_base

Available for: `users`, `entities`

Replaces placeholder names with realistic generic names. Applied to all 15 users and all 10 entities.

| Example | Before | After |
|---------|--------|-------|
| `usr_001` | User One | Sophie Martin |
| `farm_001` | Farm A | Sunrise Hills Coffee Estate |
| `brand_001` | Brand X | Global Foods Corp |

### public_kenya

Available for: `users`, `entities`

Localizes to Kenya — Kenyan names, +254 phone numbers, Kenyan counties for farm regions. Overrides most users (13 of 15, skipping usr_001 and usr_011 who are international staff) and key entities.

| Example | Before (public_base) | After (public_kenya) |
|---------|---------------------|---------------------|
| `usr_003` | Amina Osei | Wanjiru Muthoni |
| `farm_001` | Sunrise Hills Coffee Estate | Kiambu Coffee Estate |
| `farm_001` details.region | Region 1 | Kiambu County |

### private_nestle

Available for: `entities` only

Rebrands cooperatives and the brand entity with Nestle-specific names for client demos. Only 3 overrides.

| ID | Before (public_base) | After (private_nestle) |
|----|---------------------|----------------------|
| `coop_001` | Highlands Farmers Cooperative | Nescafe Farmers Trust |
| `coop_002` | Lake Region Growers Union | Nestle Tea Partners |
| `brand_001` | Global Foods Corp | Nestle East Africa |

## Adding a New Overlay

### Step-by-step

1. **Create the overlay file** in the appropriate version and table directory:
   ```
   db/mock/v1.02/overlays/{table}/{visibility}_{name}.json
   ```

2. **Add the `$meta` section**:
   ```json
   {
     "$meta": {
       "table": "users",
       "overlay": "colombia",
       "visibility": "public",
       "description": "Colombian names and context"
     },
     "overrides": {}
   }
   ```

3. **Add overrides** keyed by existing row IDs. Only include fields you want to change:
   ```json
   "overrides": {
     "usr_003": { "firstName": "Maria", "lastName": "Rodriguez" }
   }
   ```

4. **For private overlays**, add the `clients` array:
   ```json
   "$meta": {
     "visibility": "private",
     "clients": ["acme-corp"]
   }
   ```

5. **Register the overlay** in `dataset.json` under the `overlays` array:
   ```json
   "overlays": ["public_base", "public_kenya", "public_colombia", "private_nestle"]
   ```

6. **Validate**:
   ```bash
   node db/mock/validate.mjs
   ```

### Validation Rules

- Filename prefix (`public_`/`private_`) must match `$meta.visibility`
- `$meta.table` must match the parent directory name
- Private overlays must have a non-empty `clients` array
- Override IDs must exist in the base table
