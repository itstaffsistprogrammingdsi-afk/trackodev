# TRACKO Design System

Ringkasan arah visual dan token yang dipakai setelah polishing UI. Tujuannya
satu: permukaan tenang, hierarki jelas, dan warna dipakai hanya saat membawa
arti.

## Arah

- **Produk:** tracker task & campaign internal untuk tim multi-divisi.
- **Karakter:** tenang, presisi, sedikit editorial.
- **Dunia:** papan produksi studio — kertas kerja, jadwal, dan pita warna.
- **Momen:** kartu task dengan tick brand, timeline campaign, dan grafik completion.
- **Signature:** tick warna brand 3px di tepi kartu. Warna hanya berarti brand
  atau prioritas, bukan dekorasi.

## Token warna

Token semantik ada di `frontend/src/index.css` (`:root`, `html.dark`, dan
`@theme inline`). Komponen baru memakai nama peran, bukan nama warna mentah.

| Peran | Light | Dark | Dipakai untuk |
|---|---|---|---|
| `canvas` | `#f7f7f4` | `#0f100e` | latar halaman |
| `surface` | `#ffffff` | `#171815` | kartu, panel, modal |
| `surface-muted` | `#f2f1ec` | `#1e1f1b` | area sunken, chip netral |
| `surface-hover` | `#f6f5f1` | `#22231f` | hover baris/kartu |
| `line` | `#e7e5de` | `#2b2c27` | hairline |
| `line-strong` | `#d6d3ca` | `#3a3b35` | hover border, pemisah tegas |
| `fg` | `#1f1f1c` | `#f2f1ec` | teks utama |
| `fg-muted` | `#5f5e57` | `#b3b2a9` | teks sekunder |
| `fg-subtle` | `#6e6d65` | `#8d8c84` | caption, meta |
| `accent` | `#3f51f5` | `#8a9bff` | aksi utama, tautan |
| `accent-strong` | `#3641f5` | `#a5b2ff` | hover aksi utama |
| `accent-soft` | `#eef0ff` | rgba | latar chip/aksi lembut |
| `success` | `#0f7a55` | `#5fd0a3` | selesai |
| `warning` | `#a4570a` | `#f0b45c` | segera / perlu dipantau |
| `danger` | `#b93832` | `#ff8c84` | terlambat / gagal |
| `info` | `#0b6a94` | `#74c8e8` | informasi |

Aturan pakai:

- Satu aksen. Jangan memberi warna berbeda ke setiap KPI atau ikon.
- Hijau/kuning/merah hanya untuk status. Deadline yang masih jauh tetap netral.
- Warna buatan user (brand/label) tampil sebagai dot + teks netral, bukan teks
  putih di atas warna yang belum tentu kontras.
- Semua pasangan teks kecil di atas `surface`, `surface-muted`, dan `canvas`
  memenuhi WCAG AA (≥4.5:1).

## Radius

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `rounded-control` | 10px | tombol, input, tab, chip besar |
| `rounded-card` | 12px | kartu task, baris list, dropdown |
| `rounded-panel` | 16px | panel/section, modal di desktop |
| `rounded-modal` | 20px | sheet mobile dan dialog besar |

Jangan memakai `rounded-3xl` (24px) untuk elemen baru. Radius dalam harus lebih
kecil dari radius luar.

## Elevasi

| Token | Dipakai untuk |
|---|---|
| `shadow-e1` | kartu diam, kontrol terangkat tipis |
| `shadow-e2` | hover kartu, dropdown, sidebar |
| `shadow-e3` | modal, drag overlay, sheet |

Di dark mode, kedalaman utama berasal dari perbedaan `surface` dan hairline,
bukan shadow besar.

## Tipografi

- Satu keluarga: **Plus Jakarta Sans** (dipakai lewat `--font-sans`). Tidak perlu font kedua.
- Weight: 400 body, 500 UI/label, 600 judul. Hindari 700–900.
- Skala: 10/11 (caption), 12/13 (meta), 14 (body), 16 (section), 20–28 (judul).
- Angka memakai `tabular-nums`. Label section memakai sentence case, bukan
  uppercase + letter-spacing.

## Gerak

- Durasi 150ms untuk feedback, 200ms untuk masuk/keluar, maksimal 250ms.
- Easing: `--ease-soft` (`cubic-bezier(0.22, 1, 0.36, 1)`).
- Transisikan `color`, `background-color`, `border-color`, `box-shadow`, dan
  `transform` saja. Jangan animasikan `height`, `width`, `top`, atau `left`
  untuk daftar panjang.
- Tidak ada bounce, `animate-ping` loop, atau `hover:-translate-y-1` pada kartu.
- `prefers-reduced-motion` sudah dimatikan global; tetap tambahkan
  `motion-reduce:animate-none` pada spinner/skeleton baru.

## Komponen bersama

- `components/ui/EmptyState.tsx` — ikon, judul, penjelasan, satu aksi.
- `components/ui/Skeleton.tsx` — skeleton dengan `aria-hidden`; bungkus dengan
  `role="status"` dan teks `sr-only`.
- `lib/cn.ts` — `clsx` + `tailwind-merge`.

## Pola layar

- **Kanban:** kolom = sumur (`surface-muted`), kartu = permukaan terangkat
  (`surface` + `shadow-e1`). Drop state memakai `accent-soft` + ring tipis.
- **Detail card:** satu panel dengan pemisah hairline, bukan tumpukan kartu
  berbingkai. Sidebar memakai baris alat yang tenang, bukan kartu per tool.
- **Dashboard:** satu strip statistik dengan pemisah hairline; angka besar,
  label kecil. Grafik memakai warna kolom board yang memang punya arti.
- **Form:** label 12px, input 40px, error di bawah field dengan `role="alert"`,
  tombol submit punya state loading dan disabled.
- **Tabel:** header sentence case dan bisa sticky, baris hover `surface-muted`,
  aksi netral (bukan merah/hijau/oranye) kecuali aksi destruktif.
- **Metrik ringkas:** angka workspace/campaign/task memakai `tabular-nums` dan
  progress bar 6px dengan `success`; jangan jadikan kartu statistik terpisah.
- **Dialog:** pakai `Modal` bersama (focus trap + Escape + return focus) atau
  `confirmDialog` global; jangan membuat overlay baru dengan warna mentah.

## Aksesibilitas

- Focus ring: `focus-visible:ring-2 ring-accent/40` + offset 2.
- Target sentuh minimal 40×40 di mobile dan 36×36 di desktop.
- Setiap ikon-only button punya `aria-label`.
- Dialog: `role="dialog"`, `aria-modal`, focus trap, Escape untuk menutup.
- Jangan mengandalkan warna saja: sertakan teks atau ikon untuk status.
