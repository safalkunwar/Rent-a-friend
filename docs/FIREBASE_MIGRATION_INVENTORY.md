# Firebase Migration Inventory

**Project:** hamrosathi1  
**Source Database:** ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4 (ENTERPRISE)  
**Target Database:** (default) (STANDARD)  
**Date:** 2026-08-13  
**Status:** INVENTORY COMPLETE  

---

## Executive Summary

The SATHI project currently uses two Firestore databases within the same Firebase project `hamrosathi1`:

1. **Legacy Database:** `ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4` (ENTERPRISE edition) — created during AI Studio development. Contains the bulk of production data.
2. **Default Database:** `(default)` (STANDARD edition) — contains partial development data.

All five SATHI applications (User Web, Admin, Android, iOS, PWA) must be unified to use ONLY the default database `(default)`.

---

## Firebase Projects

| Project Display Name | Project ID | Project Number | Status |
|----------------------|------------|----------------|--------|
| Default Gemini Project | gen-lang-client-0671751663 | 411021355208 | Unrelated / Not used |
| Sathi | hamrosathi1 | 932995524964 | **PRIMARY** |

No data migration is required from `gen-lang-client-0671751663`. It is an unrelated Gemini/AI Studio project.

---

## Source Database: ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4

### Authentication

| Metric | Value |
|--------|-------|
| Total Auth Users | 107 |
| Verified Emails | Partial |
| Anonymous Users | Unknown |

#### Auth User Sample
- `admin1@gmail.com` — SATHI Admin
- `sawfallkunwar@gmail.com` — sawfall
- `safal@gmail.com` — Safal Kunwar
- `sanjeeb@gmail.com` — sanjeeb
- `harri@gmail.com` — Hari
- `salinakunwar14@gmail.com` — salinakunwar
- `fallkunwar@gmail.com` — Safal Kunwar
- `wfallkunwar@gmail.com` — Safal Kunwar
- `safallkunwr@gmail.com` — sawfall
- `migration_admin@sathi.np`
- `fallsaw95@gmail.com` — sawfall
- Seeded test users: `companion.1@sathi.com` through `companion.40@sathi.com`, `traveler.1@sathi.com` through `traveler.45@sathi.com`, `admin.1@sathi.com` through `admin.4@sathi.com`, `chloe@example.com`, `emma@example.com`, `raj@example.com`, `sophia@example.com`, `liam@example.com`

### Firestore Collections

| Collection | Document Count | Subcollections | Notes |
|------------|---------------|----------------|-------|
| users | 99 | favorites | Auth users (107) > user docs (99). 8 users have no Firestore profile. |
| companions | 40 | — | Linked to users via UID |
| activities | 85 | — | Owned by companions |
| bookings | 104 | — | Links userId + companionId |
| conversations | 34 | messages | Participant pairs |
| messages | 304 | — | Linked to conversations |
| community_posts | 150 | comments, likes | Author is userId |
| comments | 6 | — | Linked to community_posts |
| likes | 2 | — | Linked to community_posts |
| stories | 100 | story_likes | User-generated content |
| story_likes | 844 | — | Linked to stories |
| events | 55 | — | Admin-managed |
| notifications | 54 | — | Per-user notifications |
| partners | 35 | — | Business partners |
| reviews | 40 | — | Linked to bookings / companions |
| test_collection | 1 | — | Development artifact. **Should NOT be migrated.** |

### Storage

| Bucket | Status | Files |
|--------|--------|-------|
| hamrosathi1.firebasestorage.app | **NOT FOUND** | 0 |

**Finding:** No Storage bucket exists under `hamrosathi1.firebasestorage.app`. Media may be stored elsewhere or was never uploaded to this bucket.

---

## Target Database: (default)

### Authentication

| Metric | Value |
|--------|-------|
| Total Auth Users | 107 |

Auth users are shared across all databases within the same Firebase project. No migration needed.

### Firestore Collections

| Collection | Document Count | Notes |
|------------|---------------|-------|
| companions | 25 | Partial/development data |
| activities | 3 | Partial/development data |
| events | 4 | Partial/development data |
| stories | 5 | Partial/development data |
| auditLogs | 6 | Admin audit logs from recent operations |

**Finding:** The default database contains partial development data. This data must be reconciled during migration.

---

## Relationship Map

```
users (99)
  ├── favorites (subcollection)
  ├── companions (1:1 via uid)
  ├── activities (1:N)
  ├── bookings (1:N)
  ├── conversations (1:N via participantIds)
  ├── community_posts (1:N)
  ├── stories (1:N)
  └── notifications (1:N)

companions (40)
  ├── activities (1:N)
  ├── bookings (1:N)
  └── reviews (1:N)

bookings (104)
  ├── userId → users/{uid}
  ├── companionId → companions/{uid}
  └── reviews (1:N)

conversations (34)
  ├── participantIds[] → users/{uid}
  └── messages (1:N)

messages (304)
  ├── conversationId → conversations/{id}
  └── senderId → users/{uid}

community_posts (150)
  ├── userId → users/{uid}
  ├── comments (1:N)
  └── likes (1:N)

stories (100)
  ├── userId → users/{uid}
  └── story_likes (1:N)

events (55)
  └── (standalone)

notifications (54)
  └── userId → users/{uid}

partners (35)
  └── (standalone)

reviews (40)
  ├── userId → users/{uid}
  └── companionId → companions/{uid}
```

---

## Indexes Required

Based on existing query patterns in the codebase:

### Companions
- `status` + `createdAt` (desc)
- `category` + `createdAt` (desc)
- `location` + `createdAt` (desc)
- `rating` (desc)
- `gender` + `createdAt` (desc)

### Bookings
- `userId` + `createdAt` (desc)
- `companionId` + `createdAt` (desc)
- `status` + `createdAt` (desc)

### Messages
- `conversationId` + `createdAt` (asc)
- `conversationId` + `isRead` + `createdAt` (asc)

### Community Posts
- `createdAt` (desc)
- `category` + `createdAt` (desc)
- `userId` + `createdAt` (desc)

### Notifications
- `userId` + `read` + `createdAt` (desc)

### Reviews
- `companionId` + `createdAt` (desc)
- `userId` + `createdAt` (desc)

### Stories
- `userId` + `createdAt` (desc)
- `createdAt` (desc)

### Activities
- `companionId` + `createdAt` (desc)
- `category` + `createdAt` (desc)

---

## Deduplication Analysis

### Potential Duplicates Found

| Entity | Issue | Action |
|--------|-------|--------|
| Auth users | Multiple accounts for same person (e.g., `sawfallkunwar@gmail.com`, `fallkunwar@gmail.com`, `wfallkunwar@gmail.com`, `safallkunwr@gmail.com`, `fallsaw95@gmail.com`) | **MARK FOR MANUAL REVIEW** |
| companions | 25 exist in default DB + 40 in legacy DB | Merge by UID, keep most recent |
| activities | 3 in default + 85 in legacy | Merge by UID |
| events | 4 in default + 55 in legacy | Merge by ID |
| stories | 5 in default + 100 in legacy | Merge by ID |

### Test Data
- `test_collection` in legacy DB — **SKIP** (development artifact)
- Seeded `companion.X@sathi.com` and `traveler.X@sathi.com` users — **EVALUATE** whether to keep or purge

---

## Security & Compliance

- No plaintext passwords were exposed during inventory
- Auth migration will use Firebase's built-in user migration (UID preservation)
- KYC/private documents: **None found** in Storage
- No cross-project data leakage detected

---

## Migration Strategy

1. **Export** all documents from legacy database using Admin SDK
2. **Transform** data to canonical schema
3. **Deduplicate** against existing default database records
4. **Validate** referential integrity
5. **Import** to default database in dependency order:
   - users
   - companions
   - activities
   - events
   - partners
   - stories
   - community_posts
   - comments
   - likes
   - story_likes
   - bookings
   - conversations
   - messages
   - notifications
   - reviews
6. **Verify** counts, relationships, and sample data
7. **Update** all application configs to use `(default)`
8. **Retire** legacy database after verification

---

## Rollback Plan

- Legacy database `ai-studio-ccc6f8a5-34d2-4bfc-a68f-689d7d401cb4` will remain intact until migration is verified
- All applications will continue to point to legacy database until final switchover
- Migration scripts support `--dry-run` mode

---

## Next Steps

1. Create migration scripts (`/scripts/firebase-migration/`)
2. Run `npm run migrate:dry-run`
3. Review duplicate report
4. Run `npm run migrate:production`
5. Update `firebase.json` and app configs
6. Run verification tests
7. Delete legacy database
