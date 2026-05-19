# Project-Context.md — R6AC
> This file is the single source of truth for the R6AC project.
> Every agent MUST read this fully before starting any task.

---

## 🎯 Project Identity

| Field | Value |
|---|---|
| **Project Name** | R6AC (Rainbow Six Anti-Cheat) |
| **Domain** | r6ac.ir |
| **Type** | Full-Stack Esport Anti-Cheat Platform |
| **Primary Language** | Farsi (FA) — RTL |
| **Secondary Language** | English (EN) — toggle |
| **Target Region** | Iran (primary), expandable internationally |
| **Phase** | Phase 0 — Foundation |
| **Status** | In Development |

---

## 🧭 Vision & Mission

**Vision:** Build the most trusted, professional, and technically advanced anti-cheat platform for Persian-speaking esport communities — eventually expanding to serve international tournaments.

**Mission:** Give Iranian tournament organizers and players a fair, transparent, and verifiable competitive environment, starting with Rainbow Six Siege LAN tournaments, with a platform architected to support any game in the future.

---

## 🏆 Tournament Context

- **Format:** Persian-language LAN tournaments for Farsi-speaking players
- **Scale:** Minimum 16 teams, up to 32 teams; 5 players per team (80–160 players per event)
- **Entry Model:** Paid entry fees — trust and fairness are the product
- **Network:** Uses **ElectroLAN** (electro.org) — a LAN simulator app built for Iran's internet restrictions
  - Players create a host in ElectroLAN and share a code; others join to simulate LAN connectivity
  - R6AC must function fully within ElectroLAN sessions — no reliance on external internet during matches
- **Game:** A configured offline version of Rainbow Six Siege (no BattleEye, no Ubisoft servers)
- **Audience:** Farsi-speaking competitive players and teams in Iran

---

## 🛡️ Anti-Cheat Scope

R6AC must detect and flag all known cheat categories, including but not limited to:

### Software Cheats
- Aimbots (all types: silent aim, bone aim, FOV-based)
- Wallhacks / ESP (enemy position overlays)
- Radar hacks (minimap manipulation)
- Trigger bots (auto-fire on target acquisition)
- No-recoil scripts (macro or software-based)
- Speed hacks / movement manipulation
- Spoofers (HWID, MAC, disk serial manipulation)

### Hardware Cheats
- **DMA Cards** (Direct Memory Access — reads game memory from a second PC)
- **KMBox** (hardware mouse/keyboard signal injector)
- **Arduino / Raspberry Pi** USB device-based input manipulation
- **Dual-PC streaming setups** (game on one PC, cheat software on another)
- External capture cards used for pixel-reading cheats

### Behavioral / Statistical
- Inhuman aim consistency (statistical outlier detection)
- Macro timing patterns (inhuman input regularity)
- Suspicious match-over-match performance spikes

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    R6AC PLATFORM                        │
├──────────────┬──────────────────┬───────────────────────┤
│  CLIENT AGENT│   BACKEND API    │   ADMIN DASHBOARD     │
│  (Windows)   │  (Liara/Arvan)   │   (React Web App)     │
│              │                  │                       │
│ - User mode  │ - REST API v1    │ - Tournament mgmt     │
│ - Kernel drv │ - WebSocket      │ - Match monitor       │
│ - HW detect  │ - Report ingestion│ - Player registry    │
│ - Process scan│ - Ban management │ - Report viewer       │
│ - Memory scan│ - Auth service   │ - Live alerts         │
└──────────────┴──────────────────┴───────────────────────┘
        │               │                    │
        └───────────────┴────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   DATABASE LAYER   │
              │  PostgreSQL (main) │
              │  Redis (sessions)  │
              │  ClickHouse (logs) │
              └────────────────────┘
```

---

## 💻 Technology Stack

### Frontend (Dashboard)
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + custom design tokens |
| Animation | Framer Motion |
| State | Zustand + React Query (TanStack) |
| i18n | i18next (FA primary, EN secondary) |
| Charts | Recharts |
| Component Dev | Storybook |
| Testing | Vitest + React Testing Library |

### Backend (API)
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Fastify (high-performance, low-overhead) |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Validation | Zod |
| Auth | JWT + Refresh tokens |
| WebSocket | Fastify WebSocket plugin |
| Queue | BullMQ (Redis-backed) |
| Caching | Redis |

### Database
| Purpose | Technology |
|---|---|
| Main data | PostgreSQL 16 |
| Sessions / Cache | Redis 7 |
| Detection logs | ClickHouse (columnar, fast analytics) |

### Anti-Cheat Client Agent
| Layer | Technology |
|---|---|
| Primary language | C++ (performance-critical) |
| Secondary | C# (Windows API integration) |
| Kernel driver | C++ / WDK (Windows Driver Kit) |
| IPC | Named pipes (client ↔ kernel driver) |
| Packaging | NSIS installer (signed executable) |
| Obfuscation | LLVM-based obfuscation pass |

### Infrastructure
| Service | Provider |
|---|---|
| App Hosting | Liara (liara.ir) |
| CDN / Edge | ArvanCloud |
| Object Storage | ArvanCloud S3-compatible |
| DNS | ArvanCloud DNS |
| SSL | ArvanCloud (free TLS) |
| CI/CD | GitHub Actions → Liara deploy |

---

## 🌐 Network & Offline Resilience

**Critical constraint:** All anti-cheat core functions must work **without internet access** during a match.

Strategy:
- Client agent operates **fully offline** during matches — no phone-home required to block cheating
- Detection reports are **queued locally** and synced to the server when connectivity is available
- Tournament session tokens are **pre-issued** before the match starts
- Server **validates sessions on reconnect** — not in real-time during gameplay
- All detection signatures and rules are **bundled in the client** and updated between tournaments, not during

---

## 🎨 Design Direction

**Aesthetic:** Dark, high-contrast, esport-grade. Think VALORANT's UI meets a cybersecurity dashboard.

**Design Principles:**
- RTL-first — every layout, every component
- Dark mode only (Phase 1) — light mode in future phases
- Persian typography: **Vazirmatn** font (best Persian web font)
- English typography: **Inter**
- Primary color: Deep crimson / blood red (`#C8102E` — inspired by R6S branding)
- Accent: Electric blue (`#00BFFF`)
- Background: Near-black (`#0D0D0F`)
- Surface: Dark gray (`#161618`)
- Success / Warning / Danger system colors

---

## 👤 User Roles

| Role | Description |
|---|---|
| **Player** | Registers, installs agent, joins tournaments, views own stats |
| **Team Captain** | Manages team roster, submits team to tournaments |
| **Tournament Admin** | Creates/manages tournaments, reviews reports, issues bans |
| **Super Admin** | Full platform access, system configuration, anti-cheat rule tuning |

---

## 📦 Monorepo Structure

```
r6ac/
├── apps/
│   ├── dashboard/        # React frontend
│   ├── api/              # Fastify backend
│   └── agent/            # Anti-cheat client (C++/C#)
├── packages/
│   ├── ui/               # Shared React component library
│   ├── i18n/             # FA/EN translation files
│   ├── types/            # Shared TypeScript types/interfaces
│   └── config/           # Shared configs
├── docs/
│   ├── architecture/
│   └── api/
├── Agent-Rules.md
├── Project-Context.md
├── Project-Rules.md
├── CHANGELOG.md
└── README.md
```

---

## 🚧 Current Constraints & Decisions

| Constraint | Decision |
|---|---|
| No Microsoft driver signing (private tournament) | Self-signed driver with test-mode deployment for LAN events; document the tradeoff |
| Iran internet restrictions | All infrastructure on Liara + ArvanCloud; no foreign CDN dependencies |
| Solo developer | Use Antigravity parallel agents aggressively; prioritize MVP feature set |
| Limited budget | Open-source stack only; no paid SaaS dependencies in Phase 1 |
| No Ubisoft / official game integration | Build game-agnostic detection layer; game-specific modules are plugins |

---

## 🗺️ Project Phases

| Phase | Name | Goal |
|---|---|---|
| **0** | Foundation | Docs, monorepo setup, CI/CD, design system |
| **1** | Frontend & Design | Full dashboard UI, bilingual, RTL-first |
| **2** | Backend & API | Auth, player registry, tournament management, report API |
| **3** | Anti-Cheat Client | User-mode agent, process/memory scanning, HW detection |
| **4** | Kernel Driver | Kernel-level monitoring, DMA/KMBox detection |
| **5** | Hardening | Anti-tamper, obfuscation, driver signing strategy, load testing |
| **6+** | Expansion | Multi-game support, cloud-based ML behavioral analysis |

---

## 📌 Key Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Project Init | Monorepo (Turborepo) | Shared types and configs across frontend, backend, and docs |
| Project Init | Fastify over Express | 2-3x faster, TypeScript-native, lower overhead |
| Project Init | ClickHouse for detection logs | Columnar DB built for high-volume analytics queries |
| Project Init | Drizzle ORM | Type-safe, lightweight, works perfectly with PostgreSQL |
| Project Init | Vazirmatn font | Best open-source Persian font, excellent web rendering |
| Project Init | Offline-first agent | ElectroLAN matches may have no internet — must not fail |

---

*Last updated: Phase 0 — Project Init*
*Owner: R6AC Project Lead*
