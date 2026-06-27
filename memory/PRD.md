# GRYND — Product Requirements

## Original Problem Statement
> Ambil proyek di github saya terus improve lanjutan pembuatannya hingga selsai 100%
> Tidak hanya bahasa Indonesia tapi wordwide! Dan apa fitur untuk bagikan ke sosmed sudah tersedia jika belum reseach dan tambahkan/improve dengan benar

Source repo: https://github.com/ariaeren/Newone (cloned to /app, env files re-created).

## Concept
Gen Z gamified productivity & self-development app. Habits become quests, completing quests earns XP, XP levels you up, streaks compound. Cyber-Chill theme: true-black OLED, neon cyan/acid-green/neon-purple accents.

## Tech Stack
- Frontend: Expo SDK 54 / React Native 0.81 / expo-router 6 / TypeScript / react-i18next + expo-localization
- Backend: FastAPI + Motor + MongoDB
- Auth: JWT email/password (bcrypt) + Google (Emergent-managed) + Apple Sign-In (iOS native)

## What's already implemented (inherited)
1. Auth (email/password + Google + Apple)
2. Hub dashboard with avatar/XP/level/streak
3. Quests (create, complete, swipe-to-uncomplete, swipe-to-delete) with particle burst + level-up sheet
4. Micro Journal (140 chars + mood emoji)
5. Leaderboard (top 50 + sticky my-rank row)
6. Profile (free + Pro avatar picker, support devs, account info)
7. Paywall (procedural QRIS QR, mocked confirm Pro)
8. Rewarded ad (mocked 5s ad → 1h 2× XP boost)

## What was added in this session (Jan 2026)
1. **12-language i18n** (EN, ID, ES, FR, DE, PT, RU, JA, KO, ZH, AR, HI) via `react-i18next` + `expo-localization`. Auto-detects device locale, persists choice in AsyncStorage, applies RTL for Arabic.
2. **LanguagePicker** bottom-sheet modal (globe icon on Login + row on Profile). Live language switching.
3. **Comprehensive Social Sharing**:
   - `ShareSheet` modal with native OS share button + 7 targets (X/Twitter, Facebook, WhatsApp, Telegram, LinkedIn, Reddit, Pinterest) + Copy Link.
   - `ShareCard` preview component (5 variants: level / streak / quest / rank / invite).
   - Entry points: Hub (share level + share streak), Quests (auto-prompt on completion), Leaderboard (share rank by tapping the sticky bar), Profile (Invite friends row), LevelUpSheet (share button on level-up).
4. **Locale-aware starter quests** — backend now accepts `lang` field on register/google/apple and seeds quests in 12 languages.
5. **Email/password login fallback** UI on Login screen (Google OAuth still primary).
6. **Backend rebrand & polish**: QRIS merchant label `Cyber-Chill Guild` → `GRYND Guild`; error string `Belum diselesaikan hari ini` → `Not completed today`.

## Tests status
- Backend: 19/19 PASS (test_reports/iteration_3.json)
- Frontend: 20/20 PASS (test_reports/iteration_4.json)

## Test credentials
See `/app/memory/test_credentials.md`:
- Email: tester@grynd.app
- Password: Tester123!

## File map (additions)
- `/app/frontend/src/i18n.ts` (rewritten)
- `/app/frontend/src/locales/{en,id,es,fr,de,ja,zh,ar,pt,ru,ko,hi}.json` (new)
- `/app/frontend/src/utils/share.ts` (new)
- `/app/frontend/src/components/ShareSheet.tsx` (new)
- `/app/frontend/src/components/ShareCard.tsx` (new)
- `/app/frontend/src/components/LanguagePicker.tsx` (new)
- Backend: `/app/backend/server.py` — added STARTER_QUESTS_BY_LANG and lang fields on auth payloads.

## Backlog (P1/P2 - not blocking, future iterations)
- P1: Push notifications (daily reminder, streak warning).
- P1: Friend system + private guilds.
- P2: Achievement badges (silver/gold tiers).
- P2: Real AdMob integration (requires native build).
- P2: Real QRIS via Midtrans/Xendit.
- P3: Open Graph image generation for share links so Twitter/FB unfurl the ShareCard preview.
- P3: Migrate shadow* style props to boxShadow and pointerEvents prop to style.pointerEvents (React Native Web deprecations).

## Next Action Items
- Optional: implement OG meta tags for share links so each shared URL unfurls with a beautiful preview.
- Optional: invite referral tracking (count signups from `?ref=username`).
