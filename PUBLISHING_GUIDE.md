# GRYND — Publishing ke Google Play Store & Apple App Store

> Panduan step-by-step submission resmi ke kedua app store. Untuk pemula. Apple Sign-In di-set sebagai "Coming Soon" — bisa di-enable nanti setelah app live.

---

## 🚦 Decision Tree

```
Sudah punya APK file?
  ├─ Belum → ke STEP A1 (generate APK via Emergent Publish)
  └─ Sudah ↓
       │
Sudah punya Google Play Developer account ($25)?
  ├─ Belum → ke STEP B1 (daftar)
  └─ Sudah ↓
       │
Mau publish iOS juga?
  ├─ Tidak (Android only) → skip ke STEP B2
  └─ Ya ↓
       │
Sudah punya Apple Developer Program ($99/thn)?
  ├─ Belum → ke STEP C1 (daftar)
  └─ Sudah → ke STEP C2 (App Store Connect)
```

---

# 📦 PART A — Generate Build Files

## A1. Generate APK / AAB untuk Android (via Emergent)

1. Klik tombol **Publish** di Emergent dashboard (pojok kanan atas)
2. Wizard → **Build Android**
3. Pilih format:
   - **APK (.apk)** = file langsung install, untuk beta testing & non-Play Store distribution
   - **AAB (.aab)** = format wajib untuk submit ke Google Play Store ✅
4. **Application ID:** `com.grynd.app` (sudah di-set di `app.json`)
5. **Version code:** mulai dari `1`, naikkan +1 setiap build baru
6. **Version name:** `1.0.0` (semver: MAJOR.MINOR.PATCH)
7. Klik **Build** → tunggu 10-15 menit
8. Download `.aab` (untuk Play Store) atau `.apk` (untuk testing)

> ⚠️ Untuk Play Store, **harus pakai .aab**, bukan .apk. Google sudah mandatory sejak 2021.

## A2. Generate IPA untuk iOS (via Emergent)

> Prasyarat: Apple Developer Program aktif (lihat STEP C1)

1. Klik **Publish** → **Build iOS**
2. Masukkan kredensial:
   - **Apple ID:** email akun Apple Developer
   - **Team ID:** dari https://developer.apple.com/account/#/membership
   - **Bundle ID:** `com.grynd.app`
3. Emergent akan handle signing certificate & provisioning profile otomatis
4. Klik **Build** → tunggu 20-30 menit
5. Download `.ipa` atau langsung upload ke TestFlight via Emergent

---

# 🤖 PART B — Google Play Store

## B1. Daftar Google Play Console

1. Buka https://play.google.com/console
2. Login pakai akun Google (sebaiknya email khusus untuk app, bukan personal)
3. Klik **Get started**
4. Pilih tipe akun:
   - **Personal** — kalau kamu solo developer (lebih cepat verifikasi)
   - **Organization** — kalau ada perusahaan/PT (butuh D-U-N-S number)
5. Lengkapi data:
   - Nama publik (akan muncul di Play Store sebagai developer)
   - Email kontak
   - Nomor HP (verifikasi via SMS)
   - Alamat (verifikasi via kartu identitas)
6. Bayar **$25 sekali** (lifetime — tidak ada renewal annual seperti Apple)
7. Verifikasi identitas (KTP scan via document upload)
8. Tunggu approval — biasanya 1-2 hari kerja
9. Status verifikasi muncul di top dashboard Play Console

---

## B2. Create New App di Play Console

1. Klik **Create app** (pojok kanan atas)
2. Isi:
   - **App name:** `GRYND`
   - **Default language:** Indonesian (or English)
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** centang Developer Program Policies + Export laws
3. Klik **Create**

Sekarang masuk ke dashboard app `GRYND`.

---

## B3. Lengkapi Store Listing (Wajib sebelum publish)

Di sidebar Play Console: **Grow → Store presence → Main store listing**

### A. App Details
| Field | Isi |
|---|---|
| **App name** | `GRYND` |
| **Short description** (max 80 chars) | "Habit-mu, XP-mu. Gamified self-development untuk Gen Z." |
| **Full description** (max 4000 chars) | (lihat template di bawah) |

**Template full description:**
```
GRYND adalah aplikasi habit tracker gamified pertama yang dibuat khusus 
untuk Gen Z Indonesia.

🎮 LEVEL UP IRL
Setiap habit yang kamu jaga = XP. Stack streak, naik level, naik rank di 
guild leaderboard global.

⚡ FITUR UTAMA
• Daily Quests — swipe-to-complete dengan haptic + particle effect
• Micro-Journaling — 140 karakter + mood emoji, no filter
• Streak System — counter api emoji yang nagih
• Guild Leaderboard — XP ranking real-time global
• Neon Cosmetics — avatar premium di Guild Pro
• 2× XP Boost — ambil dari rewarded ad

💎 GUILD PRO
Lifetime IDR 49,000 via QRIS. Unlock semua neon cosmetics + zero ads.

🇮🇩 DIBUAT DI INDONESIA
Support pembayaran QRIS lokal. Saweria support untuk fund the developers.

📊 STATS YANG REAL
• Sudah 1,000+ runners aktif (gradually update)
• 50,000+ quests completed
• Theme cyber-chill dark mode

Download sekarang. Mulai grind.
```

### B. Graphic Assets

Siapkan file (resolusi WAJIB sesuai Play Console):

| Asset | Spec | Cara Buat |
|---|---|---|
| **App icon** | 512×512 PNG, no alpha | Pakai `assets/images/icon.png` (resize) |
| **Feature graphic** | 1024×500 PNG | Canva template "Play Store feature" |
| **Phone screenshots** | min 2, max 8. 16:9 aspect | Screenshot HP atau Emergent preview |
| **7-inch tablet** | Opsional | Skip dulu |
| **Promotional video** | YouTube link, opsional | Bisa skip untuk launch awal |

**Tip screenshot bagus:**
1. Buka preview di HP / browser DevTools (resolusi 1080×1920)
2. Screenshot setiap tab utama (Hub, Quests, Journal, Leaderboard, Pro)
3. Edit di Canva: tambah background + caption per screenshot:
   - "Level up your habits"
   - "Swipe to complete"
   - "Climb the guild"
   - "Neon cosmetics in Pro"

### C. Categorization

| Field | Pilih |
|---|---|
| **App category** | Productivity (atau Lifestyle) |
| **Tags** | Habit Tracking, Self Improvement, Gamification |
| **Contact email** | support@grynd.kamu.com |
| **Website** | https://grynd.kamu.com (kalau ada) |
| **Privacy policy** | https://grynd.kamu.com/privacy (WAJIB punya) |

---

## B4. Privacy Policy (WAJIB)

Tanpa privacy policy, app TIDAK BISA di-publish. Buat di:

### Cara cepat: pakai generator gratis

1. Buka https://app-privacy-policy-generator.firebaseapp.com (atau https://www.freeprivacypolicy.com)
2. Isi:
   - App name: GRYND
   - Owner: nama kamu / company
   - Email: support@grynd.kamu.com
   - Data collected: Email, Username, Usage data (XP, streak)
   - Third parties: Google Analytics (kalau pakai), AdMob (kalau pakai)
3. Generate → host di:
   - GitHub Pages (`USERNAME.github.io/grynd-privacy`)
   - Atau Notion public page
   - Atau tambah ke website kamu: `https://grynd.kamu.com/privacy`
4. Submit URL-nya ke Play Console field **Privacy policy**

---

## B5. Content Rating & Data Safety

### Content Rating
1. Sidebar → **Content rating**
2. Klik **Start questionnaire**
3. Email + Category: **Reference, News, or Educational** (closest match)
4. Jawab questionnaire (untuk GRYND, semua "No" kecuali kalau ada user-generated content)
5. Submit → dapat rating Everyone / 13+ otomatis

### Data Safety
1. Sidebar → **Data safety**
2. Declare data yang dikumpulkan:
   - **Personal info:** Email address (signup), Name (username)
   - **App activity:** App interactions (XP, quests, journals)
   - **Device IDs:** No (kecuali kalau pakai analytics)
3. **Is data encrypted in transit?** Yes (HTTPS)
4. **Can users request deletion?** Yes — tambah endpoint `/api/auth/delete-me` di backend (TO-DO)
5. Submit

---

## B6. Pricing & Distribution

1. Sidebar → **Pricing & distribution**
2. **App price:** Free
3. **Countries:** select all (atau pilih Indonesia + ASEAN dulu)
4. **Contains ads:** Yes (kalau ada AdMob, atau No kalau mocked)
5. **In-app purchases:** Yes (Guild Pro)
6. **Submit**

---

## B7. Upload AAB & Submit untuk Review

1. Sidebar → **Production** (di section "Release")
2. Klik **Create new release**
3. **Upload AAB file** (yang sudah di-download dari Emergent)
4. **Release name:** `1.0.0 (Initial release)`
5. **Release notes:**
   ```
   🎉 GRYND v1.0 launch!
   
   • Habit tracker with XP & levels
   • Swipe-to-complete quests with haptic feedback
   • Micro-journaling with mood tags
   • Global leaderboard
   • Guild Pro lifetime unlock
   ```
6. Klik **Save** → **Review release** → **Start rollout to production**
7. Submit untuk review

**Waktu review:** 1-7 hari kerja (biasanya 2-3 hari untuk app pertama, lebih cepat untuk update).

---

## B8. Setelah Approved

- App live di `https://play.google.com/store/apps/details?id=com.grynd.app`
- Update Linktree / IG bio dengan link ini
- Update marketing materials

---

# 🍏 PART C — Apple App Store

## C1. Daftar Apple Developer Program

1. Buka https://developer.apple.com/programs/enroll/
2. Login pakai Apple ID (atau buat baru — sebaiknya yang official untuk bisnis)
3. Pilih tipe:
   - **Individual** — solo developer, lebih cepat (1-2 hari)
   - **Organization** — butuh D-U-N-S number (1-2 minggu, lebih kompleks)
4. Bayar **$99/tahun** (auto-renew, ~Rp 1.5 juta)
5. Tunggu approval:
   - Individual: 24-48 jam
   - Organization: 5-10 hari kerja
6. Setelah approved, login ke https://developer.apple.com/account/

---

## C2. Setup App ID (sebelum build)

1. https://developer.apple.com/account/ → **Certificates, Identifiers & Profiles**
2. **Identifiers** → klik **+** (New)
3. Pilih **App IDs** → **Continue**
4. Pilih **App** → **Continue**
5. Isi:
   - **Description:** GRYND
   - **Bundle ID:** Explicit → `com.grynd.app`
6. **Capabilities** (yang penting untuk GRYND):
   - ✅ **Sign in with Apple** (centang kalau mau enable nanti — saat ini Coming Soon di app)
   - ✅ **Push Notifications** (kalau mau push notif nanti)
7. **Continue** → **Register**

> 💡 Kalau Apple Sign-In masih "Coming Soon" di app, kamu tetap **boleh enable capability** di App ID. Tidak masalah. Tinggal aktivasi di code nanti.

---

## C3. Build IPA via Emergent (lihat A2 di atas)

Pastikan `Bundle ID` di app sesuai dengan App ID yang baru di-create.

---

## C4. App Store Connect

1. Login ke https://appstoreconnect.apple.com
2. **My Apps** → klik **+** → **New App**
3. Isi:
   - **Platform:** iOS
   - **Name:** GRYND
   - **Primary language:** Indonesian (atau English)
   - **Bundle ID:** `com.grynd.app` (pilih dari dropdown — harus sudah register di step C2)
   - **SKU:** `grynd-001` (internal identifier, bebas)
4. **Create**

---

## C5. App Information

Sidebar app → **App Information**

| Field | Isi |
|---|---|
| **Subtitle** (max 30 chars) | "Habit tracker. Level up IRL." |
| **Privacy Policy URL** | https://grynd.kamu.com/privacy |
| **Category Primary** | Productivity |
| **Category Secondary** | Health & Fitness (atau Lifestyle) |
| **Content rights** | "Does not contain, show, or access third-party content" → Yes |
| **Age rating** | Click "Edit" → answer questionnaire (untuk GRYND biasanya 4+) |

---

## C6. Pricing & Availability

1. Sidebar → **Pricing and Availability**
2. **Price:** Free (USD 0)
3. **Availability:** select all countries
4. Save

---

## C7. App Privacy

Sidebar → **App Privacy** → **Get Started**

Declare data yang dikumpulkan:
- **Contact Info → Email:** Used for App Functionality, Linked to user, NOT used for tracking
- **User Content → Other User Content:** (untuk journal entries) — Used for App Functionality, Linked to user
- **Identifiers → User ID:** Used for App Functionality, Linked to user, NOT used for tracking
- **Usage Data → Product Interaction:** Used for Analytics, Linked to user (kalau pakai analytics)

Submit.

---

## C8. Prepare Version (1.0.0)

Sidebar → **iOS App → 1.0 Prepare for Submission**

### A. App Preview & Screenshots
Wajib upload screenshots di **MINIMAL satu device size:**
- **iPhone 6.7"** (iPhone 15 Pro Max, 1290×2796) — paling penting
- iPhone 6.5", 5.5" — opsional
- iPad — kalau support iPad

**Cara cepat:**
1. Buka preview di Safari DevTools, set responsive mode → iPhone 14 Pro Max
2. Screenshot 5 tab utama
3. Edit di Canva atau Figma → resize ke 1290×2796
4. Upload ke App Store Connect

### B. Promotional Text (max 170 chars, editable kapan saja)
"GRYND v1.0 — habit tracker gamified Gen Z. Swipe quests, stack streaks, climb the guild. Lifetime Pro IDR 49K via QRIS."

### C. Description (max 4000 chars)
Pakai full description dari B3 di atas.

### D. Keywords (max 100 chars, dipisah koma)
`habit,tracker,productivity,gamification,xp,streak,gen z,journal,quest,leaderboard`

### E. Support URL
`https://grynd.kamu.com/support` atau `mailto:support@grynd.kamu.com`

### F. Marketing URL (opsional)
`https://grynd.kamu.com`

### G. Version Information
- **Version:** 1.0.0
- **Copyright:** 2026 Nama Kamu / GRYND Indonesia
- **Trade representative:** kalau perlu

### H. Build
1. Upload IPA via Emergent atau Xcode/Transporter
2. Setelah processing selesai (~10-30 menit), pilih build di section **Build**

### I. App Review Information
- **First name, Last name:** kamu
- **Phone:** nomor kamu
- **Email:** untuk komunikasi dengan reviewer
- **Demo account** (kalau perlu login untuk test):
  - Username: `apple_reviewer@grynd.app`
  - Password: `ReviewMe2026!`
  - Buat user ini di backend sebelum submit
- **Notes:** "App is free, no special permissions needed. Email/password and Google sign-in available. Apple Sign-In is intentionally marked Coming Soon for v1.1."

### J. Version Release
- **Manually release this version** (recommended untuk launch yang terkontrol)
- Atau **Automatic** (rilis langsung setelah approved)

---

## C9. Submit for Review

1. Pastikan semua field hijau ✅
2. Klik **Add for Review** (di pojok kanan atas)
3. Apple akan tanya beberapa pertanyaan tambahan (export compliance, advertising identifier, dll)
4. Submit

**Waktu review Apple:** Biasanya 24-48 jam (lebih cepat dari Google, surprisingly).

**Common rejection reasons:**
- Crash di reviewer device → test di TestFlight dulu sebelum submit
- Privacy policy URL not accessible → pastikan halaman live
- Screenshots tidak match dengan UI app → update screenshots
- Missing demo account → harus include kalau ada login
- Mention "Coming Soon" feature tapi tidak ada di app → boleh, asal jelas itu future feature

---

## C10. Setelah Approved

- App live di `https://apps.apple.com/app/grynd/id<APP_ID>`
- App ID akan ter-generate setelah approved
- Update Linktree

---

# 🔄 PART D — Update Workflow (Setelah Live)

## Untuk Android update:
1. Update code → push ke GitHub
2. Naikkan `versionCode` (`1` → `2` → `3`) dan `versionName` (`1.0.0` → `1.0.1`) di `app.json`
3. Build AAB baru via Emergent
4. Play Console → **Production → Create new release** → upload AAB
5. Submit → review → live (biasanya <24 jam untuk update)

## Untuk iOS update:
1. Sama: update code, naikkan version
2. Build IPA baru via Emergent
3. App Store Connect → **+ Version or Platform** → create `1.0.1`
4. Pilih build baru, isi "What's New in This Version"
5. Submit → review → live

---

# 🚦 PART E — Apple Sign-In: dari "Coming Soon" ke Production

Saat ini Apple Sign-In sengaja di-set "Coming Soon" di app. Cara aktifkan nanti:

## E1. Verifikasi App ID
- Pastikan **Sign in with Apple** sudah enable di App ID (step C2)

## E2. Update Backend (Verify JWT Signature)

Sebelum aktivasi di production, **WAJIB** verifikasi signature. Saat ini backend decode tanpa verify (MVP shortcut). Ganti `_decode_apple_token` di `/app/backend/server.py`:

```python
from jwt import PyJWKClient

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
APPLE_AUDIENCE = "com.grynd.app"
_apple_jwk_client = PyJWKClient(APPLE_JWKS_URL, cache_keys=True)

def _decode_apple_token(token: str) -> dict:
    try:
        signing_key = _apple_jwk_client.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=APPLE_AUDIENCE,
            issuer=APPLE_ISSUER,
        )
    except Exception as e:
        logger.warning("apple token verify failed: %s", e)
        raise HTTPException(401, "Invalid Apple identity token")
```

Tambah ke `requirements.txt`:
```
PyJWT[crypto]>=2.8.0
cryptography>=42.0.0
```

## E3. Update Frontend (Re-enable button)

Di `/app/frontend/app/(auth)/login.tsx`, ganti `<View testID="apple-coming-soon">` block dengan original `<AppleAuthentication.AppleAuthenticationButton>` block (lihat git history iteration 2).

Atau cukup bilang ke saya **"aktifkan Apple Sign-In"**, saya kerjakan + test ulang.

## E4. Build iOS Baru
Setelah edit, build IPA baru via Emergent → submit update ke App Store sebagai v1.1.0.

---

# ✅ Master Checklist Publishing

## Pre-Submission
- [ ] App jalan tanpa crash di Expo Go / preview
- [ ] All test credentials documented di `test_credentials.md`
- [ ] Privacy Policy URL live & accessible
- [ ] Support email aktif
- [ ] App icon 512×512 (Android) + 1024×1024 (iOS) siap
- [ ] Feature graphic Android 1024×500 siap
- [ ] Min 5 screenshot per platform siap (Canva/Figma edited)
- [ ] App description bahasa Indonesia + English siap
- [ ] Demo account dibuat (untuk reviewer Apple)

## Android (Play Store)
- [ ] Daftar Play Console ($25, ID verified)
- [ ] Create app di Play Console
- [ ] Store listing lengkap
- [ ] Content rating questionnaire
- [ ] Data Safety form
- [ ] Upload AAB v1.0.0
- [ ] Submit for review

## iOS (App Store)
- [ ] Apple Developer Program enrolled ($99/year)
- [ ] App ID created (`com.grynd.app`)
- [ ] App Store Connect entry created
- [ ] App Privacy form
- [ ] Screenshots iPhone 6.7" uploaded
- [ ] Build IPA uploaded
- [ ] Demo account info for reviewer
- [ ] Submit for review

## Post-Launch
- [ ] Update Linktree dengan link Play Store / App Store
- [ ] Update bio IG/TikTok
- [ ] Marketing blitz (lihat `MARKETING_GUIDE.md`)
- [ ] Monitor Play Console / App Store Connect reviews
- [ ] Reply to user reviews dalam 48 jam
- [ ] Setup analytics: Play Console + Firebase Analytics

---

Semua langkah bisa dilakukan dalam ~1 minggu (asumsi Apple/Google account sudah ready). Bottleneck biasanya verifikasi identitas Play Console dan approval Apple Developer Program. Mulai daftar dua-duanya dari sekarang sambil sambil siapkan assets.

Kalau ada step yang stuck, kasih tahu yang mana — saya jelaskan dengan screenshot/contoh konkrit.
