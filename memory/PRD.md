# Cyber-Chill — Product Requirements

## Concept
Gen Z gamified productivity & self-development app. Habits become quests, completing quests earns XP, XP levels you up, streaks compound. Cyber-Chill theme: true-black OLED, neon cyan/acid-green/neon-purple accents.

## Tech Stack
- Frontend: Expo SDK 54 / React Native 0.81 / expo-router 6 / TypeScript
- Animations: react-native-reanimated v4
- Gestures: react-native-gesture-handler
- Haptics: expo-haptics
- Blur: expo-blur
- Icons: lucide-react-native + emojis
- Backend: FastAPI + Motor + MongoDB
- Auth: Custom JWT email/password (bcrypt, expo-secure-store)

## Core Features
1. **Auth** — Email/password signup & login with JWT. Seeds 4 starter quests on signup.
2. **Hub Dashboard** (`/(tabs)/hub`) — Avatar, total XP, level + animated XP bar, streak badge (pulsing fire), quick actions, Pro upsell.
3. **Quests** (`/(tabs)/quests`) — List of daily quests. Swipe RIGHT to complete (heavy haptic + screen-wide particle burst + XP gain). Swipe LEFT to delete. Add quest via bottom-sheet modal (title, icon picker, XP reward).
4. **Micro-Journaling** (`/(tabs)/journal`) — 140-char entries with mood emoji picker, character counter, bottom-sheet input.
5. **Leaderboard** (`/(tabs)/leaderboard`) — Top 50 global ranked by total XP. Medals for 1-3. Sticky "Your rank" row at bottom. Pull-to-refresh.
6. **Profile** (`/(tabs)/profile`) — Avatar picker (free + locked Pro neon cosmetics), Support the Devs (opens Saweria webview), 2× XP boost link, sign out.
7. **Guild Pro Paywall** (`/paywall`) — Lifetime IDR 49,000. Mock QRIS QR code (procedurally drawn). "I've paid" button activates Pro server-side.
8. **Rewarded Ad** (`/rewarded-ad`) — 5-second mock ad. Claim button activates 2× XP boost for 1 hour.

## Backend API (all under `/api`)
- `POST /auth/register` — email, password, username → JWT + user
- `POST /auth/login` — email, password → JWT + user
- `GET /auth/me` — current user
- `PATCH /auth/me` — update username/avatar_emoji
- `GET /quests` — list (with completed_today flag)
- `POST /quests` — create
- `DELETE /quests/{id}` — delete
- `POST /quests/{id}/complete` — log completion, award XP (2× if boost active), update level/streak
- `GET /journals` — list
- `POST /journals` — create
- `DELETE /journals/{id}` — delete
- `GET /leaderboard` — top 50 + my rank
- `POST /monetization/xp-boost` — activate 1-hour 2× boost
- `POST /monetization/pro/activate` — set is_pro=true (mock QRIS confirmation)
- `GET /monetization/qris` — get mock QRIS string + amount

## XP/Level System
- XP needed for level N = 100 + (N-1) × 150 → 100, 250, 400, 550...
- Completing a quest awards `xp_reward` (doubled while `xp_boost_until` > now).
- Levels can compound from a single completion if XP gain is huge.

## Monetization Notes
- QRIS: NO Coda Payments. Pure mocked UI for now. Real integration would use Midtrans/Xendit QRIS API.
- AdMob: MOCKED 5s placeholder modal — real AdMob requires native build.
- Saweria: Real webview via `expo-web-browser`.

## Design tokens
See `/app/design_guidelines.json` and `/app/frontend/src/theme.ts`. True black bg, neon cyan primary, acid green success, neon purple premium, warning red.
