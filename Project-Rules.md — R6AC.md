# Project-Rules.md — R6AC
> Coding standards, architecture rules, and agent boundaries for the R6AC platform.
> These rules are NON-NEGOTIABLE. Agents must follow them exactly.

---

## 📐 CODE STYLE & FORMATTING

### Universal
- **Formatter:** Prettier (config in `packages/config/prettier.config.js`)
- **Linter:** ESLint with `@typescript-eslint` strict rules
- **Line length:** 100 characters max
- **Indentation:** 2 spaces (no tabs, ever)
- **Quotes:** Single quotes in TS/JS, double in JSX attributes
- **Semicolons:** Always
- **Trailing commas:** Always (ES5 compatible)

### TypeScript
- `strict: true` in all `tsconfig.json` files — no exceptions
- No `any` type — use `unknown` and narrow it, or define a proper type
- No type assertions (`as SomeType`) unless absolutely necessary and commented why
- All exported functions must have explicit return types
- Prefer `interface` over `type` for object shapes; use `type` for unions/intersections

### Naming Conventions
| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `player-stats-card.tsx` |
| React Components | PascalCase | `PlayerStatsCard` |
| Functions | camelCase | `getPlayerStats()` |
| Constants | SCREAMING_SNAKE | `MAX_TEAM_SIZE` |
| Types/Interfaces | PascalCase | `PlayerProfile` |
| DB tables | snake_case | `tournament_matches` |
| API routes | kebab-case | `/api/v1/player-stats` |
| i18n keys | dot.notation | `dashboard.player.rankLabel` |
| CSS classes | kebab-case (Tailwind) | `text-primary-red` |
| Environment vars | SCREAMING_SNAKE | `DATABASE_URL` |

---

## 🗂️ FOLDER & MODULE RULES

### Frontend (`apps/dashboard`)
```
src/
├── assets/           # Static files (fonts, images, icons)
├── components/       # Purely presentational, no business logic
│   └── ui/           # Base design system components (Button, Card, Badge...)
├── features/         # Feature modules (each feature = self-contained)
│   ├── auth/
│   ├── tournament/
│   ├── player/
│   └── reports/
├── pages/            # Route-level components (thin wrappers only)
├── hooks/            # Custom React hooks
├── stores/           # Zustand stores
├── lib/              # Utilities, helpers, API clients
├── i18n/             # i18next config + namespace loaders
├── constants/        # All named constants
├── types/            # Local TypeScript types (shared types go in packages/types)
└── styles/           # Global CSS, RTL overrides, Tailwind config
```

### Backend (`apps/api`)
```
src/
├── routes/           # Route handlers (thin — delegate to services)
│   └── v1/
├── services/         # Business logic (pure functions where possible)
├── repositories/     # Database access layer (all DB queries here only)
├── middleware/        # Auth, rate-limit, logging, error handler
├── schemas/          # Zod validation schemas
├── plugins/          # Fastify plugins (db, redis, websocket, etc.)
├── jobs/             # BullMQ job handlers
├── constants/
├── types/
└── utils/
```

### Rule: No Cross-Layer Imports
- Routes → Services → Repositories (one direction only)
- A repository must never import from a service
- A route must never import from a repository directly
- Violations are a hard blocker — do not merge

---

## 🌐 INTERNATIONALIZATION (i18n) RULES

### Setup
- Library: `i18next` + `react-i18next`
- Default locale: `fa` (Farsi)
- Secondary locale: `en` (English)
- Namespace structure: one file per feature (`auth.json`, `dashboard.json`, `tournament.json`)

### Rules
1. **No raw strings in JSX** — ever. Use `t('key')` always.
2. All new keys must be added to **both** `fa.json` and `en.json` simultaneously.
3. Untranslated keys must be marked `[NEEDS_TRANSLATION]` in the English file — never left blank.
4. Numbers, dates, and currencies use `i18next` formatters with `fa-IR` locale for FA.
5. Persian text must always use **Vazirmatn** font class.
6. English text must always use **Inter** font class.

### RTL Rules
- HTML `dir` attribute is set to `rtl` by default on `<html>`.
- All flex/grid layouts use logical properties: `margin-inline-start` not `margin-left`.
- Tailwind: use `ms-`, `me-`, `ps-`, `pe-` (logical) instead of `ml-`, `mr-`, `pl-`, `pr-`.
- Icons that indicate direction (arrows, chevrons) must mirror in RTL using `rtl:scale-x-[-1]`.
- Absolutely no hard-coded `left`/`right` values in layout CSS.

---

## 🔌 API CONTRACT RULES

### Response Shape (mandatory for every endpoint)
```typescript
// Success
{
  success: true,
  data: T,           // typed payload
  meta: {
    page?: number,
    total?: number,
    timestamp: string  // ISO 8601
  },
  error: null
}

// Error
{
  success: false,
  data: null,
  meta: { timestamp: string },
  error: {
    code: string,      // machine-readable e.g. "PLAYER_NOT_FOUND"
    message: string,   // human-readable in English
    messageFA: string  // human-readable in Farsi
  }
}
```

### Route Rules
- All routes under `/api/v1/` — version bump requires new folder, never modify v1 breaking
- Every route must declare its Zod schema for `body`, `params`, and `query`
- Every route must declare which roles can access it (`@roles(['admin', 'player'])`)
- Every route must be documented in `docs/api/` with request/response examples

### WebSocket Rules
- All WS messages follow: `{ type: string, payload: T, timestamp: string }`
- Client must send a heartbeat every 30s; server drops connection after 60s silence
- All WS events are documented in `docs/api/websocket-events.md`

---

## 🔐 SECURITY RULES

### Authentication
- JWT access tokens: 15 min expiry
- Refresh tokens: 7 days, stored in httpOnly cookie
- All tokens are invalidated on password change or explicit logout
- Rate limit login: 5 attempts per 15 minutes per IP

### Data Handling
- Player passwords: bcrypt (cost factor 12)
- Hardware fingerprints: SHA-256 hashed before storage, never raw
- Player IPs: stored only as hashed values for ban matching — never in plain text
- All PII fields in DB must be noted in `docs/architecture/data-privacy.md`

### Anti-Cheat Specific
- Every detection event must include:
  ```typescript
  {
    playerId: string;
    matchId: string;
    detectionType: DetectionType;  // enum
    confidence: number;            // 0.0 – 1.0
    reasonCode: string;            // e.g. "AIMBOT_AIM_LOCK_PATTERN"
    evidence: EncryptedBlob;       // raw data, encrypted at rest
    requiresHumanReview: boolean;  // always true for confidence < 0.95
    autoAction: 'none' | 'flag' | 'kick';  // never 'ban' automatically
  }
  ```
- **No automated permanent bans.** The system can auto-kick from a match. Bans require admin action.
- All detection evidence is encrypted at rest using AES-256.

---

## 🗄️ DATABASE RULES

### General
- All schema changes require a migration file (`drizzle-kit generate`)
- Migration files are never edited after being applied — create a new one
- Every table must have: `id` (UUID), `createdAt`, `updatedAt`
- Soft deletes only — add `deletedAt` nullable column, never `DELETE` records

### Naming
- Tables: plural, snake_case (`players`, `tournament_matches`, `detection_reports`)
- Columns: snake_case (`player_id`, `created_at`)
- Indexes: `idx_tablename_columnname` (`idx_players_email`)
- Foreign keys: `fk_tablename_referencedtable` (`fk_matches_players`)

---

## 🔀 GIT WORKFLOW

### Branch Strategy
```
main              ← production only, protected
  └── develop     ← integration branch
        ├── feat/phase1-design-system
        ├── feat/phase2-auth-api
        ├── fix/rtl-layout-broken
        └── chore/update-dependencies
```

### Commit Format
```
[PHASE-X] type(scope): short description

Types: feat | fix | refactor | docs | chore | test | style
Scope: dashboard | api | agent | driver | i18n | db | ci

Examples:
[PHASE-1] feat(dashboard): add player profile card component
[PHASE-2] fix(api): handle empty tournament roster edge case
[PHASE-0] docs(context): update ElectroLAN network constraints
```

### PR Rules
- Every PR must reference a task or milestone
- PRs must pass lint + type-check + tests before merge
- No self-merging — at minimum, review with Antigravity artifact output before merging

---

## 🤖 AGENT DECISION BOUNDARIES

### Agents CAN decide autonomously:
- File structure within the defined folder rules
- Which utility function to use or create
- Component composition and prop design
- SQL query optimization
- Which Tailwind classes to use

### Agents MUST ask before deciding:
- Adding a new npm package or dependency
- Changing the API response shape
- Adding a new DB table or column
- Changing the authentication flow
- Any detection rule or confidence threshold
- Any change to the ban/flag system logic
- Switching or adding a new infrastructure provider

### Agents MUST NEVER:
- Delete existing migration files
- Change committed translation keys (add new ones only)
- Modify `Agent-Rules.md`, `Project-Context.md`, or `Project-Rules.md` without explicit instruction
- Implement a permanent ban logic without human review gate
- Remove RTL support from any component
- Store any hardware or player identifier in plain text

---

## 📊 PERFORMANCE BUDGETS

| Metric | Target |
|---|---|
| Dashboard initial load | < 2.5s on 4G |
| Largest Contentful Paint | < 2.0s |
| API response time (p95) | < 200ms |
| API response time (p99) | < 500ms |
| WebSocket latency | < 100ms |
| Detection report ingestion | < 50ms per event |
| Client agent CPU usage (idle) | < 1% |
| Client agent CPU usage (scanning) | < 5% |
| Client agent RAM | < 80MB |

---

## ✅ PHASE 1 SPECIFIC RULES (Frontend)

- Build the **design system first** before any page
- Every design token (color, spacing, typography) must be in `tailwind.config.js` — no hard-coded values
- Use **Storybook** to build and review components in isolation before integrating into pages
- All components must render correctly in **both FA (RTL) and EN (LTR)** before being marked done
- Responsive breakpoints: Mobile (375px) → Tablet (768px) → Desktop (1280px) → Wide (1920px)
- All data-display components must handle: loading state, empty state, and error state

---

*Last updated: Phase 0 — Project Init*
*Owner: R6AC Project Lead*
