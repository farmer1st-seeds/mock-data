# Data Model

## Overview

The mock data uses an entity-membership model (introduced in v1.02). Three tables provide a universal relationship system: `users` for people, `entities` for organizations, and `memberships` as a universal join table with roles.

## Tables

### users

Platform users — identity only. Roles are defined through memberships, not on the user record.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Format: `usr_NNN` (e.g., `usr_001`) |
| `firstName` | `string` | First name (placeholder in base, realistic in overlays) |
| `lastName` | `string` | Last name |
| `email` | `string` | Email address |
| `phone` | `string` | Phone number with country code |

**Row count**: 15 users (usr_001 through usr_015)

**Base data example**:
```json
{ "id": "usr_003", "firstName": "User", "lastName": "Three", "email": "user3@example.com", "phone": "+10000000003" }
```

With `public_base` overlay applied:
```json
{ "id": "usr_003", "firstName": "Amina", "lastName": "Osei", "email": "amina.osei@gmail.com", "phone": "+233244000002" }
```

### entities

Organizations of various types. Type-specific fields are stored in the `details` object.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Format varies by type (see Entity Types below) |
| `type` | `enum` | `farm`, `cooperative`, `brand`, `trader`, `agency` |
| `name` | `string` | Entity name (placeholder in base, realistic in overlays) |
| `description` | `string?` | Optional description |
| `status` | `enum` | `active` or `suspended` |
| `details` | `object` | Type-specific fields (see below) |

**Row count**: 10 entities (5 farms, 2 cooperatives, 1 brand, 1 trader, 1 agency)

### memberships

Universal join table for all relationships. Direction: **source has roles within target**.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Format: `mbr_NNN` (e.g., `mbr_001`) |
| `sourceType` | `enum` | `user` or `entity` |
| `sourceId` | `string` | References `users.id` or `entities.id` based on `sourceType` |
| `targetType` | `enum` | `user` or `entity` |
| `targetId` | `string` | References `users.id` or `entities.id` based on `targetType` |
| `roles` | `string[]` | Array of roles: `member`, `viewer`, `editor`, `admin` |
| `status` | `enum` | `active`, `suspended`, or `pending` |

**Row count**: 26 memberships (mbr_001 through mbr_026)

## Entity Types

| Type | ID Prefix | Count | Details Fields |
|------|-----------|-------|----------------|
| `farm` | `farm_NNN` | 5 | `region` (string), `size` (number, hectares), `crops` (string[]) |
| `cooperative` | `coop_NNN` | 2 | `region` (string), `established` (string, YYYY) |
| `brand` | `brand_NNN` | 1 | `industry` (string), `country` (string) |
| `trader` | `trader_NNN` | 1 | `specialty` (string), `country` (string) |
| `agency` | `agency_NNN` | 1 | `focus` (string), `country` (string) |

Type schemas are documented in `entities.json` under `$meta.typeSchemas`.

### Entities in v1.02

| ID | Type | Name (base) | Name (public_base overlay) |
|----|------|-------------|---------------------------|
| `farm_001` | farm | Farm A | Sunrise Hills Coffee Estate |
| `farm_002` | farm | Farm B | Green Valley Plantation |
| `farm_003` | farm | Farm C | Highland Tea Gardens |
| `farm_004` | farm | Farm D | Misty Ridge Tea Farm |
| `farm_005` | farm | Farm E | Golden Cocoa Fields |
| `coop_001` | cooperative | Cooperative Alpha | Highlands Farmers Cooperative |
| `coop_002` | cooperative | Cooperative Beta | Lake Region Growers Union |
| `brand_001` | brand | Brand X | Global Foods Corp |
| `trader_001` | trader | Trader Y | Continental Commodities Ltd |
| `agency_001` | agency | Agency Z | National Agricultural Extension Service |

## Membership Model

### Direction

**"source has roles within target"** — the source entity or user holds the specified roles in relation to the target.

### Role Progression

`member` < `viewer` < `editor` < `admin`

| Role | Meaning |
|------|---------|
| `member` | Base association — belongs to, is part of |
| `viewer` | Read-only access to target's data |
| `editor` | Can modify target's data |
| `admin` | Full control — manage members, settings |

Seeds decide what each role unlocks. These are conventions, not enforced at the data layer.

### Relationship Types

**User → Entity** (most common):
```
usr_003 → farm_001 [admin]      User is admin of farm
usr_012 → farm_003 [editor]     User can edit farm data
usr_006 → farm_001 [viewer]     User can view farm data
usr_015 → farm_001 [member]     User is associated with farm
```

**Entity → Entity** (organizational hierarchy):
```
farm_001 → coop_001 [member]    Farm belongs to cooperative
coop_001 → brand_001 [member]   Cooperative supplies brand
brand_001 → coop_001 [viewer]   Brand can view cooperative data
```

**User → User** (personal relationships):
```
usr_006 → usr_003 [member]      Family association
usr_007 → usr_004 [member]      Family association
```

### Cascading Visibility

Access follows the membership graph. Example chain:

```
usr_011 (brand viewer)
  └─ viewer of brand_001 (mbr_024)
       └─ brand_001 is viewer of coop_001 (mbr_021)
            └─ farm_001 is member of coop_001 (mbr_014)
            └─ farm_002 is member of coop_001 (mbr_015)
            └─ farm_003 is member of coop_001 (mbr_016)
```

Seeds implement graph traversal logic. The mock data only provides the edges.

### Polymorphic Foreign Keys

`sourceId` and `targetId` are polymorphic — they reference different tables depending on the corresponding type field. Relations in `dataset.json` use `when` clauses to specify which table is referenced:

```json
{ "from": "memberships.sourceId", "to": "users.id", "type": "many-to-one", "when": { "sourceType": "user" } },
{ "from": "memberships.sourceId", "to": "entities.id", "type": "many-to-one", "when": { "sourceType": "entity" } },
{ "from": "memberships.targetId", "to": "users.id", "type": "many-to-one", "when": { "targetType": "user" } },
{ "from": "memberships.targetId", "to": "entities.id", "type": "many-to-one", "when": { "targetType": "entity" } }
```

## dataset.json

Registry file at the root of `db/mock/` that defines:

| Field | Description |
|-------|-------------|
| `$meta.version` | Current latest version (e.g., `"1.02"`) |
| `$meta.description` | Human-readable description of the data model |
| `$meta.updatedAt` | Last update date |
| `tables` | Array of table names (e.g., `["users", "entities", "memberships"]`) |
| `relations` | Array of foreign key relations with `from`, `to`, `type`, and optional `when` |
| `overlays` | Array of overlay names (e.g., `["public_base", "public_kenya", "private_nestle"]`) |

## ID Conventions

| Prefix | Table | Example |
|--------|-------|---------|
| `usr_` | users | `usr_001`, `usr_015` |
| `farm_` | entities (type: farm) | `farm_001`, `farm_005` |
| `coop_` | entities (type: cooperative) | `coop_001`, `coop_002` |
| `brand_` | entities (type: brand) | `brand_001` |
| `trader_` | entities (type: trader) | `trader_001` |
| `agency_` | entities (type: agency) | `agency_001` |
| `mbr_` | memberships | `mbr_001`, `mbr_026` |

All IDs use 3-digit zero-padded numbers (NNN format).

## Schema Documentation

Each table JSON file contains a `$meta.schema` object documenting the fields. This is for documentation only — it is not enforced by code. The `?` suffix on a type string indicates nullable fields.

The entities table also has `$meta.typeSchemas` documenting the `details` object structure for each entity type.
