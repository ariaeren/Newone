# GRYND — Panduan Build APK & Deploy untuk Pemula

> Panduan lengkap end-to-end. Ikuti urutannya. Setiap langkah ada estimasi waktu & checkpoint.

---

## 🗺️ Peta Jalan Singkat

```
1. Test di Expo Go (preview)            ← 5 menit  · gratis · tanpa setup
2. Push ke GitHub (private)             ← 3 menit  · butuh akun GitHub
3. Deploy lewat Emergent "Publish"      ← 10 menit · cara TERMUDAH ✅
   ├─ a. Backend & MongoDB jalan online
   ├─ b. Generate Android APK (.apk)
   └─ c. Generate iOS build (.ipa)        ← butuh Apple Developer ($99/thn)
4. (Opsional) Submit ke Play Store / App Store
```

**Rekomendasi pemula:** pakai **Emergent Publish** untuk semuanya. Sudah otomatis, tidak perlu EAS CLI atau Xcode lokal.

---

## STEP 0 — Sebelum Mulai: Apa yang Sudah Kita Punya

✅ **Sudah jadi:** Aplikasi GRYND (5 tab, swipe quests, QRIS paywall, dll)
✅ **Sudah online di preview:** `https://levelhub-app.preview.emergentagent.com`
✅ **Backend FastAPI + MongoDB:** running di pod Emergent
✅ **Test credentials:** lihat `/app/memory/test_credentials.md`

❌ **Belum dilakukan:**
- Push ke GitHub
- Generate APK (`.apk` Android) / IPA (`.ipa` iOS)
- Configure Apple Developer (untuk Apple Sign-In + App Store)
- Production environment variables

---

## STEP 1 — Test di Expo Go (Optional, 5 menit)

Sebelum build APK, pastikan app jalan di HP asli via Expo Go.

### Android / iOS
1. Install **Expo Go** dari Play Store atau App Store
2. Buka preview URL `https://levelhub-app.preview.emergentagent.com` di browser HP — atau klik QR code di Emergent dashboard
3. Scan QR pakai Expo Go
4. App akan terbuka. Test semua tab.

> ⚠️ Apple Sign-In **tidak akan muncul** di Expo Go — itu placeholder, hanya muncul setelah build native iOS (step 3c).

---

## STEP 2 — Push ke GitHub Private (3 menit)

1. Klik tombol **"Save to GitHub"** di pojok kanan atas Emergent dashboard
2. Pertama kali: connect akun GitHub kamu (Authorize Emergent)
3. Pilih:
   - **Repository name:** `grynd` (atau apa saja)
   - **Visibility:** ✅ **Private** (pastikan ini dicentang!)
   - **Description:** "GRYND — Gen Z gamified habits app"
4. Klik **"Push"**
5. Verifikasi: buka https://github.com/USERNAME-KAMU/grynd → harus ada folder `app/`, `backend/`, `frontend/`, `README.md`

> 💡 Setiap kali kamu mau update GitHub, klik tombol "Save to GitHub" lagi. Otomatis commit & push.

> ⚠️ **JANGAN** delete `.git` atau `.emergent` folder dari project — Emergent perlu folder ini untuk berfungsi.

---

## STEP 3 — Deploy via Emergent Publish (CARA TERMUDAH ✅)

Ini metode resmi & paling gampang. Tidak perlu EAS CLI, Xcode, atau setup Apple manual.

### Klik tombol **"Publish"** di pojok kanan atas Emergent dashboard.

Akan muncul wizard 3-step. Mari kita bahas satu per satu.

### 3a. Deploy Backend + Database (otomatis)

Emergent otomatis:
- Deploy FastAPI server ke cloud
- Provision MongoDB production
- Update `EXPO_PUBLIC_BACKEND_URL` di mobile app
- Migrasi semua data dari preview ke production

**Yang perlu kamu lakukan:**
1. Klik "Publish" → "Continue"
2. Tunggu ~3-5 menit
3. Catat URL backend production yang muncul (misal `https://grynd.emergentapp.com/api`)

**Checkpoint:** Buka `<production-url>/api/` di browser. Harus return `{"ok":true,"service":"grynd"}`

### 3b. Generate Android APK

Setelah backend deploy:

1. Di wizard Publish, pilih **"Build Android"**
2. Pilih tipe build:
   - **APK** (file `.apk`) — bisa langsung install di HP, untuk testing
   - **AAB** (Android App Bundle) — untuk submit ke Play Store
3. Tidak perlu Google Developer account untuk generate APK (hanya untuk publish ke Play Store)
4. Klik **"Build"** → tunggu ~10-15 menit
5. Setelah selesai, kamu dapat link download `.apk`

**Cara install APK di HP Android:**
1. Download `.apk` ke HP
2. Buka file → muncul prompt "Install"
3. Mungkin perlu enable "Install from unknown sources" di Settings → Security
4. Install → buka GRYND
5. Test login, quests, journal, dll

> 📦 APK ini siap dibagikan ke teman / beta tester via Google Drive, WhatsApp, dll.

### 3c. Generate iOS Build (butuh Apple Developer)

iOS build memerlukan **Apple Developer Program** ($99 USD/tahun).

#### Kalau belum punya Apple Developer:
1. Daftar di https://developer.apple.com/programs/enroll/
2. Bayar $99/tahun (~Rp 1.5 juta)
3. Tunggu 1-2 hari kerja untuk approval

#### Setelah punya akun:

1. Di Apple Developer Portal, **enable "Sign In with Apple"** untuk App ID `com.grynd.app`:
   - Login ke https://developer.apple.com/account/
   - **Certificates, Identifiers & Profiles** → **Identifiers** → **+** (New)
   - **App IDs** → **App**
   - Bundle ID: **Explicit** → `com.grynd.app`
   - Capabilities: ✅ centang **"Sign In with Apple"**
   - Save

2. Di Emergent Publish wizard, pilih **"Build iOS"**
3. Masukkan credentials:
   - Apple ID (email akun Apple Developer)
   - Apple Developer Team ID (dari https://developer.apple.com/account/#/membership)
   - Emergent akan handle signing certificate & provisioning profile otomatis
4. Klik **"Build"** → tunggu ~20-30 menit
5. Setelah selesai, dapat link download `.ipa`

**Cara install iOS build di iPhone:**
- **TestFlight** (recommended): Emergent bisa upload otomatis ke TestFlight. Invite email kamu sendiri sebagai tester. Install via app TestFlight di iPhone.
- **Ad-hoc install:** kalau iPhone kamu sudah registered di Apple Developer Devices, install langsung via Xcode atau Diawi.

**Apple Sign-In akan bekerja di build ini.** 🍎

---

## STEP 4 — Konfigurasi Production (Penting!)

Setelah deploy, ada beberapa hal yang sebaiknya kamu lakukan.

### 4a. Verifikasi Apple Sign-In Signature (Critical sebelum public release)

Saat ini backend **TIDAK memverifikasi** signature Apple JWT (MVP shortcut). Sebelum app dipakai user beneran:

**File yang perlu diedit:** `/app/backend/server.py` fungsi `_decode_apple_token`

Ganti dengan kode berikut (saya bisa lakukan ini kalau kamu minta):

```python
import httpx
from jwt import PyJWKClient

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
APPLE_AUDIENCE = "com.grynd.app"  # bundle ID
_jwk_client = PyJWKClient(APPLE_JWKS_URL)

def _decode_apple_token(token: str) -> dict:
    try:
        signing_key = _jwk_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=APPLE_AUDIENCE,
            issuer=APPLE_ISSUER,
        )
        return claims
    except Exception as e:
        logger.warning("apple token verify failed: %s", e)
        raise HTTPException(401, "Invalid Apple identity token")
```

Tambahkan `PyJWT[crypto]` ke `requirements.txt` jika belum ada.

### 4b. Test Google Sign-In End-to-End di Preview

1. Buka https://levelhub-app.preview.emergentagent.com/login di laptop
2. Klik **"Continue with Google"**
3. Browser akan redirect ke `auth.emergentagent.com`
4. Pilih akun Google kamu → Allow
5. Browser otomatis kembali ke preview URL dengan `#session_id=...` di URL
6. Frontend exchange session → masuk ke Hub sebagai user baru/existing

**Cek di backend log** untuk konfirmasi:
```bash
tail -20 /var/log/supervisor/backend.out.log
# harus terlihat: POST /api/auth/google 200 OK
```

### 4c. Environment Variables Production

Pastikan production memiliki secrets yang BENAR (Emergent biasanya generate ulang):

- `JWT_SECRET` — harus random 32+ chars (Emergent generate otomatis)
- `MONGO_URL` — auto-set ke MongoDB production
- `DB_NAME` — sebaiknya `grynd_prod` (bukan `grynd_db`)

Lihat & edit via Emergent dashboard → **Settings** → **Environment Variables**.

### 4d. Rate Limiting & Security Hardening (Recommended)

Sebelum public launch, tambahkan:
- Rate limiting di `/api/auth/*` (misal 5 attempt/menit per IP) — pakai `slowapi`
- Email verification untuk signup
- Stronger password policy (currently min 6 chars)

---

## STEP 5 — Submit ke App Store / Play Store (Opsional)

### Google Play Store
1. Daftar akun Play Console di https://play.google.com/console ($25 sekali bayar, lifetime)
2. Di Emergent wizard, pilih build **AAB** (bukan APK)
3. Upload AAB ke Play Console → **Production** → **Releases**
4. Lengkapi store listing: screenshot, description, privacy policy URL
5. Submit review → biasanya 1-3 hari

### Apple App Store
1. Pastikan punya Apple Developer Program ($99/tahun)
2. Buat app baru di https://appstoreconnect.apple.com
3. Bundle ID: `com.grynd.app`
4. Upload IPA dari Emergent (atau pakai TestFlight terlebih dahulu)
5. Lengkapi store listing
6. Submit review → biasanya 1-3 hari

---

## 🆘 Troubleshooting

### "Build gagal" di Emergent Publish
- Cek log build di dashboard
- Pastikan `app.json` valid JSON (tidak ada koma extra)
- Pastikan `bundleIdentifier` dan `package` di app.json sesuai App ID di Apple/Google

### APK terinstall tapi crash saat dibuka
- Cek `EXPO_PUBLIC_BACKEND_URL` di production env → harus URL backend production, bukan preview
- Buka backend URL di browser → harus return JSON, bukan error

### Apple Sign-In tetap tidak muncul di build iOS
- Verifikasi `"usesAppleSignIn": true` ada di `app.json` → `ios` section ✅ (sudah ada)
- Verifikasi "Sign In with Apple" capability enabled di Apple Developer App ID
- Verifikasi `expo-apple-authentication` ada di `app.json` → `plugins` ✅ (sudah ada)

### Google Sign-In stuck di preview / "session not found"
- Clear browser cookies → coba lagi
- Cek backend log: `tail /var/log/supervisor/backend.err.log`

---

## 📊 Estimasi Biaya untuk Pemula

| Item | Biaya | Wajib? |
|---|---|---|
| GitHub private repo | Gratis | ✅ |
| Emergent Publish (preview + production hosting) | Sesuai paket Emergent | ✅ |
| Generate APK (no Play Store) | Gratis | ✅ |
| Google Play Console | $25 sekali | Opsional (kalau mau Play Store) |
| Apple Developer Program | $99/tahun | Opsional (kalau mau iOS + Apple Sign-In) |
| Custom domain | ~$10/tahun | Opsional |

**Minimum untuk launch publik:**
- Hanya Android via APK: **Gratis** (bagikan via WhatsApp/link)
- Android Play Store: **$25** sekali
- iOS App Store + Apple Sign-In: **$99/tahun**

---

## 🚀 Quick Reference: Tombol Penting di Emergent

| Tombol | Lokasi | Fungsi |
|---|---|---|
| **Save to GitHub** | Top right | Push code ke GitHub |
| **Publish** | Top right | Deploy backend + build APK/IPA |
| **Rollback** | Top right | Kembali ke checkpoint sebelumnya (gratis, recommended daripada `git reset`) |
| **Settings → Env Vars** | Sidebar | Edit production environment variables |

---

## ✅ Checklist Final Sebelum Launch

- [ ] Push ke GitHub private (Step 2)
- [ ] Deploy backend via Publish (Step 3a) → catat URL production
- [ ] Test backend production: `curl <prod-url>/api/` returns `{"ok":true}`
- [ ] Generate APK (Step 3b) → test install di HP Android
- [ ] (Opsional) Apple Developer enrolled + Sign In with Apple enabled di App ID
- [ ] (Opsional) Generate iOS build → test via TestFlight
- [ ] Verifikasi Apple JWT signature (Step 4a) — JANGAN skip untuk production
- [ ] Test Google sign-in di preview (Step 4b)
- [ ] Rotate `JWT_SECRET` di production env
- [ ] Buat halaman privacy policy (wajib untuk Play Store & App Store)

---

Semua step di atas bisa diulang kapan pun. Kalau ada error spesifik di salah satu step, kasih tahu saya dengan screenshot error / log, saya bantu debug.
