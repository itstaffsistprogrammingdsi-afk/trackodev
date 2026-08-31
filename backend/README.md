<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).


## Sinkronisasi user dari HRIS

Isi konfigurasi berikut di `.env` backend. Token dan password awal tidak boleh
disimpan di repository:

```dotenv
HRIS_EMPLOYEES_URL=https://hris-holding.dsicorp.id/api/employees
HRIS_API_TOKEN=
HRIS_DEFAULT_PASSWORD=
HRIS_API_TIMEOUT=30
```

Jalankan sinkronisasi manual bila diperlukan:

```bash
php artisan app:sync-hris-users
```

Scheduler menjalankannya otomatis setiap hari pukul 00.00 WIB. Sinkronisasi hanya mengambil
nama dan email karyawan aktif. Password awal hanya dibuat untuk akun baru dan
tidak akan ditimpa setelah user mengubah password. Role dari HRIS tidak pernah
digunakan; akun baru memperoleh role default `user` dari Tracko satu kali saat
dibuat. Perubahan role berikutnya dikelola secara mandiri melalui User Manager
Tracko dan tidak ditimpa oleh sinkronisasi. Repository ini tidak menyediakan
seeder data demo; seluruh data operasional dibuat melalui aplikasi atau
sinkronisasi HRIS.

`DatabaseSeeder` membuat satu super-admin bootstrap dari `SUPER_ADMIN_NAME`,
`SUPER_ADMIN_EMAIL`, dan `SUPER_ADMIN_PASSWORD`. Ketiga variabel ini wajib
disediakan di environment server dan tidak boleh memakai kredensial contoh.

php artisan schedule:work
php artisan queue:work

## Deployment dan clear cache server

Perubahan API/backend harus ikut di-upload; meng-upload folder `frontend/dist`
saja hanya memperbarui tampilan frontend. Setelah file backend terbaru berada di
server, jalankan dari folder `backend`:

```bash
php artisan optimize:clear
php artisan permission:cache-reset
php artisan queue:restart
```

Jika production memang memakai cache konfigurasi dan route, bangun kembali
cache setelah perintah di atas:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Upload seluruh isi `frontend/dist` (termasuk `index.html` dan folder `assets`),
lalu lakukan hard refresh browser agar `index.html` lama tidak dipakai lagi.
