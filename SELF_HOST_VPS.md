# GRYND — Panduan Self-Host di VPS

> Untuk kamu yang mau punya kontrol penuh atas server, lebih murah jangka panjang, dan tidak mau bergantung pada platform managed. Cocok kalau sudah ada 100-10,000+ user aktif.

---

## 💡 Kapan Self-Host? Kapan Pakai Managed?

| Skenario | Rekomendasi |
|---|---|
| < 100 user, masih iterasi cepat | **Emergent Publish** (managed, gampang) |
| 100-1,000 user, mulai care soal cost | Hybrid: backend di VPS, frontend tetap di Emergent |
| 1,000+ user, butuh kontrol penuh | **Full self-host di VPS** |
| Sangat sensitif privasi (data user di Indonesia) | Self-host di VPS Indonesia (Biznet, IDcloudHost) |

---

## 💰 Estimasi Biaya VPS (per bulan)

| Provider | Spec | Harga | Lokasi terdekat |
|---|---|---|---|
| **Hetzner CX22** | 2 vCPU, 4GB RAM, 40GB | €4.51 (~Rp 80K) | Singapore (latency ~30ms ke ID) |
| **DigitalOcean Droplet** | 2 vCPU, 4GB RAM, 80GB | $24 (~Rp 380K) | Singapore |
| **Vultr** | 2 vCPU, 4GB RAM, 80GB | $12 (~Rp 190K) | Singapore/Jakarta |
| **Contabo VPS-S** | 4 vCPU, 8GB RAM, 200GB | €6.99 (~Rp 120K) | Singapore |
| **Biznet Gio** | 2 vCPU, 4GB RAM | ~Rp 150K | Jakarta 🇮🇩 |
| **IDcloudHost** | 2 vCPU, 4GB RAM | ~Rp 130K | Jakarta 🇮🇩 |

**Rekomendasi pemula:** **Hetzner CX22 Singapore** (€4.51/bulan ≈ Rp 80K) — best price/perf, dashboard mudah, latency oke untuk user Indonesia.

**Tambahan domain:** ~Rp 150K/tahun di Niagahoster/Domainesia (.com / .id).

---

## 🏗️ Arsitektur Self-Host yang Akan Kita Bangun

```
                   Internet
                       │
                       ▼
            ┌──────────────────┐
            │  Cloudflare DNS  │  ← gratis, SSL, DDoS protection
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │   VPS (Ubuntu)   │
            │  ─────────────   │
            │   Nginx :443     │  ← reverse proxy + SSL termination
            │       │          │
            │       ├─→ :8001  │  FastAPI (uvicorn, systemd)
            │       │          │
            │       └─→ /      │  Static frontend build (Expo Web)
            │                  │
            │   MongoDB :27017 │  (localhost only, no public)
            │                  │
            │   UFW firewall   │  ← 22, 80, 443 only
            └──────────────────┘
```

---

## STEP 1 — Provisioning VPS (10 menit)

### A. Daftar di Hetzner (atau provider pilihan)

1. Daftar di https://accounts.hetzner.com/signUp
2. Verifikasi email + nomor HP
3. Tambahkan metode pembayaran (kartu kredit / PayPal)
4. Buka **Cloud Console** → **New Project** → "GRYND Production"

### B. Buat Server

1. Klik **Add Server**
2. Pilih:
   - **Location:** Singapore (Asia-Pacific terdekat)
   - **Image:** Ubuntu 24.04
   - **Type:** CX22 (2 vCPU, 4GB RAM)
   - **Networking:** ✅ Public IPv4
   - **SSH keys:** add SSH key (lihat sub-step C kalau belum punya)
   - **Name:** `grynd-prod-01`
3. Klik **Create & Buy now**
4. Catat IP publik server (misal `159.203.45.67`)

### C. Generate SSH Key (kalau belum punya)

Di laptop kamu (Mac/Linux/WSL):
```bash
ssh-keygen -t ed25519 -C "kamu@email.com"
# Tekan Enter terus untuk default location
# Tekan Enter (no passphrase) atau set passphrase

cat ~/.ssh/id_ed25519.pub
# Copy seluruh output → paste ke Hetzner SSH keys
```

Windows (Powershell):
```powershell
ssh-keygen -t ed25519
type $HOME\.ssh\id_ed25519.pub
```

### D. Test SSH Connection

```bash
ssh root@159.203.45.67
# Pertama kali akan tanya "yes/no" → ketik yes
```

Kalau berhasil login, lanjut step 2.

---

## STEP 2 — Initial Server Hardening (15 menit)

Login ke server via SSH.

### A. Update sistem

```bash
apt update && apt upgrade -y
```

### B. Buat user non-root

```bash
adduser grynd
# Set password (catat baik-baik)
usermod -aG sudo grynd

# Copy SSH key dari root ke user baru
mkdir -p /home/grynd/.ssh
cp /root/.ssh/authorized_keys /home/grynd/.ssh/
chown -R grynd:grynd /home/grynd/.ssh
chmod 700 /home/grynd/.ssh
chmod 600 /home/grynd/.ssh/authorized_keys
```

### C. Disable root SSH login

```bash
nano /etc/ssh/sshd_config
# Cari & ubah:
#   PermitRootLogin no
#   PasswordAuthentication no
# Save (Ctrl+O, Enter, Ctrl+X)

systemctl restart ssh
```

**Test login user baru di terminal LAIN (jangan logout dulu!):**
```bash
ssh grynd@159.203.45.67
```

Kalau berhasil, lanjut. Kalau gagal, fix dulu sebelum logout root.

### D. Setup firewall (UFW)

```bash
# Sebagai user grynd
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
sudo ufw status
```

### E. Install Fail2Ban (auto-block brute force)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## STEP 3 — Install Dependencies (10 menit)

```bash
# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
sudo npm install -g yarn

# MongoDB 7
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-7.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb-7.gpg] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod

# Verifikasi MongoDB
mongosh --eval "db.runCommand({ ping: 1 })"
# Harus return: { ok: 1 }

# Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## STEP 4 — Clone Repo dari GitHub (5 menit)

```bash
cd /home/grynd
git clone https://github.com/USERNAME-KAMU/grynd.git
cd grynd
```

> Kalau repo private, generate **Personal Access Token (PAT)** di GitHub: Settings → Developer settings → Personal access tokens → Generate new token (classic) → scope `repo` → copy token. Login dengan: `git clone https://USERNAME:TOKEN@github.com/USERNAME/grynd.git`

---

## STEP 5 — Setup Backend (FastAPI + MongoDB)

```bash
cd /home/grynd/grynd/backend

# Buat virtualenv
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### A. Buat file `.env` production

```bash
nano /home/grynd/grynd/backend/.env
```

Isi:
```ini
MONGO_URL=mongodb://localhost:27017
DB_NAME=grynd_prod
JWT_SECRET=<GENERATE_NEW_SECRET>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
```

Generate secret baru:
```bash
openssl rand -hex 32
# Copy output ke JWT_SECRET di atas
```

### B. Test run backend

```bash
cd /home/grynd/grynd/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
# Buka terminal lain, test:
curl http://localhost:8001/api/
# Harus return: {"ok":true,"service":"grynd"}
# Ctrl+C untuk stop
```

### C. Setup systemd service untuk auto-restart

```bash
sudo nano /etc/systemd/system/grynd-backend.service
```

Isi:
```ini
[Unit]
Description=GRYND FastAPI Backend
After=network.target mongod.service

[Service]
Type=simple
User=grynd
WorkingDirectory=/home/grynd/grynd/backend
Environment="PATH=/home/grynd/grynd/backend/venv/bin"
ExecStart=/home/grynd/grynd/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable grynd-backend
sudo systemctl start grynd-backend
sudo systemctl status grynd-backend
# Harus "active (running)"
```

Cek log kalau ada error:
```bash
sudo journalctl -u grynd-backend -f
```

---

## STEP 6 — Build Frontend (Expo Web)

```bash
cd /home/grynd/grynd/frontend
yarn install

# Set production backend URL di .env
nano .env
```

Isi (sesuaikan dengan domain kamu — kalau belum ada domain, pakai IP dulu):
```ini
EXPO_PUBLIC_BACKEND_URL=https://grynd.kamu.com
```

Build web bundle:
```bash
yarn expo export --platform web
# Output di: dist/
ls dist/
```

---

## STEP 7 — Setup Domain + Nginx + SSL

### A. Beli & Point Domain

1. Beli domain di Niagahoster/Cloudflare (~Rp 150K/tahun)
2. Di DNS settings, tambah A record:
   - Type: A
   - Name: `@` (atau `grynd`)
   - Value: `159.203.45.67` (IP VPS kamu)
   - TTL: 300
3. Tunggu propagasi DNS 5-15 menit
4. Test: `dig grynd.kamu.com +short` → harus return IP VPS

### B. Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/grynd
```

Isi:
```nginx
server {
    listen 80;
    server_name grynd.kamu.com;

    # Static frontend
    root /home/grynd/grynd/frontend/dist;
    index index.html;

    # API proxy ke FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets cache
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;

    client_max_body_size 10M;
}
```

Aktifkan:
```bash
sudo ln -s /etc/nginx/sites-available/grynd /etc/nginx/sites-enabled/
sudo nginx -t                # Test config
sudo systemctl reload nginx
```

### C. Setup SSL dengan Let's Encrypt (gratis, auto-renew)

```bash
sudo certbot --nginx -d grynd.kamu.com
# Ikuti prompt:
#   Email: kamu@email.com
#   Agree to TOS: Y
#   Share email: N (opsional)
#   Redirect HTTP to HTTPS: 2 (Yes)
```

Test renewal:
```bash
sudo certbot renew --dry-run
```

Sekarang buka `https://grynd.kamu.com` — harus muncul GRYND web app ✅

---

## STEP 8 — Security Hardening Production

### A. MongoDB authentication (Recommended)

```bash
mongosh
```

Di mongo shell:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "GANTI_DENGAN_PASSWORD_KUAT",
  roles: ["root"]
})

use grynd_prod
db.createUser({
  user: "grynd_app",
  pwd: "GANTI_DENGAN_PASSWORD_KUAT_LAGI",
  roles: [{ role: "readWrite", db: "grynd_prod" }]
})
exit
```

Enable auth:
```bash
sudo nano /etc/mongod.conf
# Tambahkan:
#   security:
#     authorization: enabled
sudo systemctl restart mongod
```

Update backend `.env`:
```ini
MONGO_URL=mongodb://grynd_app:PASSWORD_KAMU@localhost:27017/grynd_prod?authSource=grynd_prod
```

Restart backend:
```bash
sudo systemctl restart grynd-backend
```

### B. Rate limiting di Nginx

Tambah di `/etc/nginx/nginx.conf` (di dalam `http` block):
```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
```

Lalu di server block:
```nginx
location /api/auth/ {
    limit_req zone=auth_limit burst=5 nodelay;
    proxy_pass http://127.0.0.1:8001/api/auth/;
    # ... headers sama
}

location /api/ {
    limit_req zone=api_limit burst=10 nodelay;
    proxy_pass http://127.0.0.1:8001/api/;
    # ... headers sama
}
```

Reload: `sudo nginx -t && sudo systemctl reload nginx`

### C. Cloudflare di depan (Opsional, sangat recommended)

1. Daftar Cloudflare → Add Site `grynd.kamu.com`
2. Ganti nameservers domain ke Cloudflare nameservers
3. Tunggu propagasi
4. Enable: SSL Full (strict), Brotli, Auto Minify, Rate Limiting, Bot Fight Mode
5. Manfaat: DDoS protection, CDN gratis, analytics, hide IP server

---

## STEP 9 — Backup Strategy

### Daily MongoDB backup

```bash
sudo nano /home/grynd/backup.sh
```

```bash
#!/bin/bash
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/home/grynd/backups
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://grynd_app:PASSWORD@localhost:27017/grynd_prod" --out=$BACKUP_DIR/$TS
# Compress
tar -czf $BACKUP_DIR/grynd_$TS.tar.gz -C $BACKUP_DIR $TS
rm -rf $BACKUP_DIR/$TS
# Keep only last 14 days
find $BACKUP_DIR -name "grynd_*.tar.gz" -mtime +14 -delete
```

```bash
chmod +x /home/grynd/backup.sh

# Cronjob harian 03:00
crontab -e
# Tambah:
# 0 3 * * * /home/grynd/backup.sh >> /home/grynd/backups/backup.log 2>&1
```

### Offsite backup (recommended)

Upload backup ke S3/Cloudflare R2/Backblaze B2:
```bash
# Install rclone
sudo apt install rclone -y
rclone config
# Setup remote bernama "b2" (Backblaze B2 ~$0.005/GB/bulan, super murah)

# Tambah di backup.sh sebelum baris find:
rclone copy $BACKUP_DIR/grynd_$TS.tar.gz b2:grynd-backups/
```

---

## STEP 10 — Deploy Updates dari GitHub

Kalau ada update baru, deploy ulang:

```bash
cd /home/grynd/grynd
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart grynd-backend

# Update frontend
cd ../frontend
yarn install
yarn expo export --platform web
sudo systemctl reload nginx
```

**Tip:** buat script `deploy.sh` agar 1 command:
```bash
nano /home/grynd/deploy.sh
chmod +x /home/grynd/deploy.sh
```

```bash
#!/bin/bash
set -e
cd /home/grynd/grynd
git pull origin main
cd backend && source venv/bin/activate && pip install -q -r requirements.txt
sudo systemctl restart grynd-backend
cd ../frontend && yarn install --silent && yarn expo export --platform web
sudo systemctl reload nginx
echo "✅ Deploy done"
```

Run: `/home/grynd/deploy.sh`

---

## STEP 11 — Monitoring (Opsional tapi recommended)

### A. UptimeRobot (gratis)
- Daftar di https://uptimerobot.com
- Add monitor: `https://grynd.kamu.com/api/` setiap 5 menit
- Alert via email/Telegram kalau down

### B. Resource monitoring di server
```bash
sudo apt install -y htop
htop  # liat CPU/RAM realtime

# Disk usage
df -h

# Backend logs realtime
sudo journalctl -u grynd-backend -f

# Nginx access log
sudo tail -f /var/log/nginx/access.log
```

### C. Netdata (dashboard cantik, gratis)
```bash
bash <(curl -SsL https://my-netdata.io/kickstart.sh)
# Akses di http://IP_VPS:19999
# JANGAN expose public — pakai SSH tunnel:
#   ssh -L 19999:localhost:19999 grynd@IP_VPS
#   buka localhost:19999 di browser laptop
```

---

## 🆘 Troubleshooting

### "502 Bad Gateway" di browser
- Backend down: `sudo systemctl status grynd-backend`
- Restart: `sudo systemctl restart grynd-backend`
- Cek log: `sudo journalctl -u grynd-backend -n 50`

### "Connection refused" ke MongoDB
- `sudo systemctl status mongod`
- Cek log: `sudo tail -f /var/log/mongodb/mongod.log`

### SSL renew gagal
- `sudo certbot renew --dry-run` → cek error
- Pastikan port 80 tidak diblok dan domain masih point ke VPS

### Frontend tidak update setelah deploy
- Hard refresh browser (Ctrl+Shift+R)
- Cek `dist/` folder updated: `ls -la /home/grynd/grynd/frontend/dist/`

### Mobile app tetap call ke backend lama
- Mobile app pakai `EXPO_PUBLIC_BACKEND_URL` yang di-build saat APK dibuat
- Harus rebuild APK dengan env baru, lalu push update ke user

---

## 💸 Total Cost Self-Host (Per Bulan)

| Item | Cost |
|---|---|
| VPS Hetzner CX22 | ~Rp 80K |
| Domain | ~Rp 13K (Rp 150K/thn ÷ 12) |
| Cloudflare | Gratis |
| Let's Encrypt SSL | Gratis |
| UptimeRobot | Gratis |
| Backblaze B2 backup (~10GB) | ~Rp 1K |
| **Total** | **~Rp 95K/bulan** |

Bandingkan: Emergent managed ~Rp 200K-500K/bulan untuk paket setara.

---

## 🚀 Hybrid Approach (Best of Both Worlds)

Kalau gak mau full self-host:
- **Frontend (mobile + web):** tetap di Emergent (kemudahan deploy + APK build)
- **Backend + MongoDB:** self-host di VPS Hetzner
- **Setup:** Hanya update `EXPO_PUBLIC_BACKEND_URL` di Emergent frontend ke domain VPS kamu

Saving: ~Rp 100K/bulan tanpa kehilangan kemudahan build APK.

---

## ✅ Checklist Self-Host Selesai

- [ ] VPS up dan SSH login pakai user non-root
- [ ] Firewall UFW aktif
- [ ] MongoDB running dengan auth
- [ ] FastAPI running via systemd (auto-restart)
- [ ] Nginx + SSL (HTTPS bekerja)
- [ ] Domain pointed dan resolved
- [ ] Daily backup cronjob jalan
- [ ] UptimeRobot monitoring aktif
- [ ] `deploy.sh` script ready
- [ ] Test full user flow: register → quest → leaderboard

---

Kalau stuck di salah satu step, kirim screenshot error + output `journalctl -u grynd-backend -n 50` ke saya, saya bantu debug.
