# Deployment Realtime, Redis, dan Email

Realtime dan email memerlukan proses background yang tetap hidup; menjalankan
web server saja belum cukup.

## Environment backend

Gunakan nilai produksi berikut sebagai acuan. Jangan commit secret asli.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tracko.example.com
CORS_ALLOWED_ORIGINS=https://tracko.example.com

BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=redis
CACHE_STORE=redis

REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=secret-yang-kuat
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_QUEUE=default

REVERB_APP_ID=tracko
REVERB_APP_KEY=ganti-dengan-random-key
REVERB_APP_SECRET=ganti-dengan-random-secret
REVERB_HOST=tracko.example.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_ALLOWED_ORIGINS=https://tracko.example.com
REVERB_SCALING_ENABLED=false

MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.provider.example
MAIL_PORT=587
MAIL_USERNAME=akun-smtp
MAIL_PASSWORD=password-smtp
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME=Tracko
```

`predis` sudah menjadi dependency Composer aplikasi. Jika server memakai
`REDIS_CLIENT=phpredis`, pastikan ekstensi PHP Redis terpasang dan aktif pada PHP
CLI maupun PHP-FPM.

Pada port SMTP 587, `MAIL_SCHEME=null` membuat transport melakukan STARTTLS
secara otomatis bila didukung server. Untuk implicit TLS port 465, gunakan
`MAIL_SCHEME=smtps`.

Aktifkan `REVERB_SCALING_ENABLED=true` hanya bila ada lebih dari satu proses
Reverb atau lebih dari satu application server yang berbagi Redis.

## Environment frontend

Nilai ini dibaca saat proses build, bukan saat browser membuka aplikasi.

```dotenv
VITE_API_URL=https://tracko.example.com/api
VITE_REVERB_APP_KEY=ganti-dengan-random-key
VITE_REVERB_HOST=tracko.example.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

`VITE_REVERB_APP_KEY` harus sama dengan `REVERB_APP_KEY`. Setelah mengubahnya,
build ulang frontend.

## Proses yang wajib selalu hidup

Kelola proses berikut dengan Supervisor atau systemd:

```text
php artisan queue:work redis --queue=default --sleep=1 --tries=3 --timeout=90
php artisan reverb:start --host=127.0.0.1 --port=8080
```

Tambahkan cron scheduler:

```cron
* * * * * cd /var/www/tracko/backend && php artisan schedule:run >> /dev/null 2>&1
```

Queue worker memproses broadcast Reverb dan email. Scheduler dibutuhkan untuk
email pengingat due date.

## Reverse proxy WebSocket

Tempatkan blok berikut pada virtual host HTTPS Nginx aplikasi:

```nginx
location /app/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_read_timeout 60s;
    proxy_pass http://127.0.0.1:8080;
}
```

Port 8080 tidak perlu dibuka ke internet. TLS berhenti di Nginx pada port 443.

## Urutan deploy dan verifikasi

```text
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
npm ci
npm run build
sudo supervisorctl restart tracko-queue tracko-reverb
```

Verifikasi setelah deploy:

1. Redis merespons `PONG` saat diperiksa dengan `redis-cli`.
2. `php artisan queue:monitor redis:default --max=100` berhasil dijalankan.
3. `php artisan schedule:list` menampilkan `reminder:due-date`.
4. Assign task ke akun uji. Bell akun penerima harus bertambah tanpa refresh.
5. Pastikan job selesai dan email diterima; cek `php artisan queue:failed`.
6. DevTools browser menunjukkan koneksi `wss://.../app/...` berstatus `101`.

Setelah setiap deploy kode, jalankan `php artisan queue:restart` agar worker tidak
menjalankan kode versi lama.
