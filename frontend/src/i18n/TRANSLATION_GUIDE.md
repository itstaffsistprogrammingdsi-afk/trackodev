# TRACKO Translation Guide (ID ⇄ EN)

This app has a two-language UI. Every **static UI string** must come from the
translation helper so switching language never leaves mixed copy. User content
must never be translated.

## API

React components:

```tsx
import { useLanguage } from "@/context/LanguageContext";

export function Example() {
  const { t } = useLanguage();

  return <button>{t("Simpan", "Save")}</button>;
}
```

- First argument: the exact Indonesian copy shown today.
- Second argument: natural English copy. It is optional only when both
  languages are identical (e.g. `t("Email")`).
- Placeholders: `t("{count} anggota", "{count} members", { count })`.
- For non-React code (toast helpers, API modules, utils) use:

```ts
import { translate } from "@/i18n/translate";
translate("Gagal memuat data", "Failed to load data");
```

- Dates/numbers: use `getLocale()` from `@/i18n/translate` instead of hardcoded
  `"id-ID"`, or `locale` from `useLanguage()` inside components.

## What to translate

- JSX text, buttons, headings, helper text, empty states, errors, toasts.
- `placeholder`, `title`, `aria-label`, `alt`, `label`, `description` props that
  contain static UI copy.
- Labels defined in constants: add an English field or translate at render
  (`{t(option.label, option.labelEn)}`). Never translate the stored `value`.
- Relative time, counts, date formats and plural wording.
- Accessibility text.

## What NOT to translate

- Anything the user or API supplies: names, emails, division/workspace/
  campaign/board/card titles, descriptions, comments, chat bodies, form answers,
  notification titles/bodies, uploaded file names.
- Enum/status/priority values used in logic (`"completed"`, `"urgent"`), routes,
  query keys, localStorage keys, CSS classes, permission strings.
- Backend data and seed content. Do not call `t(variable)` on arbitrary data.
- Code comments may stay Indonesian.
- Brand name `TRACKO` / `Tracko`.

## Style

- Use sentence case for English buttons, labels and descriptions
  ("Save changes", "Create division"), except proper nouns and existing product
  names ("My Work", "Virtual Office").
- Keep copy short; match the visual density of the Indonesian original.
- Keep terminology consistent:

| Indonesia | English |
| --- | --- |
| Divisi | Division |
| Workspace | Workspace |
| Campaign | Campaign |
| Board | Board |
| Kartu / Card | Card |
| Lintas divisi | Cross-division |
| Anggota | Members |
| Kolaborator | Collaborators |
| Prioritas | Priority |
| Rendah / Normal / Tinggi / Urgent | Low / Medium / High / Urgent |
| Tenggat / Deadline | Deadline |
| Terlambat | Overdue |
| Selesai | Completed |
| Belum selesai | Incomplete |
| Aktivitas | Activity |
| Komentar | Comments |
| Lampiran | Attachments |
| Subtask | Subtasks |
| Deskripsi | Description |
| Label | Labels |
| Pengguna | Users |
| Peran | Role |
| Hak akses | Permissions |
| Pengaturan | Settings |
| Akun | Account |
| Profil | Profile |
| Integrasi | Integrations |
| Laporan | Reports |
| Kalender | Calendar |
| Notifikasi | Notifications |
| Pengingat | Reminder |
| Undang | Invite |
| Keluar | Sign out |
| Masuk | Sign in |
| Daftar | Sign up |
| Kata sandi | Password |
| Simpan | Save |
| Batal | Cancel |
| Hapus | Delete |
| Ubah / Edit | Edit |
| Tambah | Add |
| Buat | Create |
| Cari | Search |
| Pilih | Select |
| Kembali | Back |
| Tutup | Close |
| Buka | Open |
| Lihat | View |
| Unduh | Download |
| Unggah | Upload |
| Ekspor | Export |
| Impor | Import |
| Semua | All |
| Belum ada | None yet / No … |
| Memuat | Loading |
| Gagal | Failed |
| Berhasil | Success |
| Wajib diisi | Required |
| Opsional | Optional |
| Tindakan ini tidak dapat dibatalkan. | This action cannot be undone. |

## Gotchas

- `t` is reactive through `useLanguage()`; every component that calls it
  re-renders when the language changes.
- If a translated string lives inside `useMemo` / `useCallback`, add `language`
  from `useLanguage()` to the dependency list so it refreshes.
- Do not wrap strings that are already passed through `t` twice.
- Do not change component structure, styles, business logic, API calls or types.
- Type-check before finishing:

```
cd frontend
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json --pretty false
```

Do not run `vite build`; the main agent does that at the end.
