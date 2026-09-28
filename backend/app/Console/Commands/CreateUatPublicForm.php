<?php

namespace App\Console\Commands;

use App\Models\Form;
use App\Models\FormField;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class CreateUatPublicForm extends Command
{
    protected $signature = 'app:create-uat-public-form
        {--created-by= : UUID atau email user pemilik form (default: super admin pertama)}';

    protected $description = 'Buat atau perbarui kuesioner UAT user sebagai public form';

    private const SLUG = 'uat-tracko-user';

    private const MODE_QUICK = 'Quick UAT (10–15 menit)';

    private const MODE_FULL = 'Full UAT (QA lengkap)';

    private const SCOPE_USER = 'Fitur user reguler';

    private const SCOPE_ADMIN = 'Fitur admin / super admin';

    private const SCOPE_FORMS = 'Forms';

    private const SCOPE_REPORTS = 'Report & QC';

    private const STATUS_OPTIONS = ['PASS', 'PASS dengan catatan', 'FAIL', 'BLOCKED', 'N/A'];

    /**
     * Test case kritis yang tetap tampil pada Quick UAT. Case lain hanya
     * tampil ketika tester memilih Full UAT.
     */
    private const QUICK_CASE_IDS = [
        'PUB-01', 'PUB-04',
        'AUTH-01', 'AUTH-02', 'AUTH-07', 'NAV-01', 'NAV-02',
        'MYW-01', 'MYW-09',
        'DIV-01', 'WSP-01', 'WSP-04',
        'CAM-01', 'CAM-04', 'CAM-08', 'CAM-09',
        'BRD-01', 'BRD-07', 'BRD-09', 'BRD-11', 'BRD-15',
        'CARD-01', 'CARD-07', 'CARD-13',
        'CAL-01',
        'CHAT-01', 'CHAT-03',
        'NOTIF-01',
        'ACC-04', 'ACC-06',
        'SYNC-01', 'SYNC-05', 'SYNC-06',
        'SEC-01', 'SEC-02',
        'ADM-01', 'ADM-04', 'ADM-07',
        'FORM-01', 'FORM-04',
        'RPT-01', 'RPT-03',
        'GEN-01', 'GEN-02',
    ];

    /**
     * Field names dari kuesioner ringkas versi lama. Dihapus saat rekonsiliasi
     * agar form lama tidak menyimpan pertanyaan duplikat.
     */
    private const LEGACY_FIELD_NAMES = [
        'login_status',
        'my_work_status',
        'division_workspace_status',
        'campaign_status',
        'board_card_status',
        'board_search_status',
        'card_detail_status',
        'calendar_status',
        'chat_status',
        'notification_status',
        'account_status',
        'sync_status',
        'permission_status',
        'issue_details',
    ];

    public function handle(): int
    {
        $creator = $this->resolveCreator();

        if (! $creator) {
            $this->error('Pemilik form tidak ditemukan. Buat user admin terlebih dahulu atau gunakan --created-by.');

            return self::FAILURE;
        }

        $definition = $this->definition();

        try {
            $form = DB::transaction(function () use ($creator, $definition): Form {
                $form = Form::query()->updateOrCreate(
                    ['slug' => self::SLUG],
                    [
                        'name' => $definition['name'],
                        'description' => $definition['description'],
                        'show_note' => true,
                        'note_content' => $definition['note_content'],
                        'created_by' => $creator->id,
                        'is_active' => true,
                    ],
                );

                $fieldModels = [];

                foreach ($definition['fields'] as $order => $field) {
                    $fieldModels[$field['name']] = FormField::query()->updateOrCreate(
                        [
                            'form_id' => $form->id,
                            'name' => $field['name'],
                        ],
                        [
                            'label' => $field['label'],
                            'type' => $field['type'],
                            'description' => $field['description'] ?? null,
                            'is_required' => $field['is_required'] ?? false,
                            'options' => $field['options'] ?? null,
                            'allow_other' => $field['allow_other'] ?? false,
                            'other_label' => $field['other_label'] ?? null,
                            'order' => $order,
                            'depends_on_field_id' => null,
                            'depends_on_value' => null,
                        ],
                    );
                }

                foreach ($definition['fields'] as $field) {
                    $dependencyName = $field['depends_on_name'] ?? null;

                    if (! $dependencyName) {
                        continue;
                    }

                    $dependency = $fieldModels[$dependencyName] ?? null;
                    if (! $dependency) {
                        throw new \RuntimeException("Dependency field {$dependencyName} tidak ditemukan.");
                    }

                    $fieldModels[$field['name']]->update([
                        'depends_on_field_id' => $dependency->id,
                        'depends_on_value' => $field['depends_on_value'] ?? null,
                    ]);
                }

                FormField::query()
                    ->where('form_id', $form->id)
                    ->whereIn('name', self::LEGACY_FIELD_NAMES)
                    ->delete();

                return $form->fresh('fields');
            });
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Gagal membuat public form UAT: '.$exception->getMessage());

            return self::FAILURE;
        }

        $frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', config('app.url'))), '/');
        $publicUrl = $frontendUrl.'/public/forms/'.self::SLUG;

        $this->info($form->wasRecentlyCreated ? 'Public form UAT berhasil dibuat.' : 'Public form UAT berhasil diperbarui.');
        $this->line('Nama: '.$form->name);
        $this->line('Field: '.$form->fields->count());
        $this->line('Link publik: '.$publicUrl);
        $this->line('Link response (login admin): '.$frontendUrl.'/forms');

        return self::SUCCESS;
    }

    private function resolveCreator(): ?User
    {
        // Sebagian shell/markdown mengirim email sebagai `nama\@domain`.
        // Normalisasi agar lookup email tetap cocok dengan data HRIS.
        $requested = str_replace('\\@', '@', trim((string) $this->option('created-by')));

        if ($requested !== '') {
            // PostgreSQL akan melempar error jika string email dibandingkan
            // langsung dengan kolom UUID `id`. Query ID hanya dijalankan
            // ketika argumen memang UUID yang valid.
            if (Str::isUuid($requested)) {
                return User::query()->where('id', $requested)->first()
                    ?? User::query()->where('email', $requested)->first();
            }

            return User::query()->where('email', $requested)->first();
        }

        return User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', User::ROLE_SUPER_ADMIN))
            ->first()
            ?? User::query()->whereHas('roles', fn ($query) => $query->where('name', User::ROLE_ADMIN))->first();
    }

    /**
     * Susun section "Profil & konteks", lalu satu section per area UAT.
     * Setiap test case = satu dropdown status + satu kotak saran.
     */
    private function definition(): array
    {
        $fields = [
            [
                'name' => 'section_profile',
                'label' => 'Profil & konteks pengujian',
                'type' => 'section',
                'description' => 'Isi data singkat ini satu kali per sesi pengujian.',
            ],
            ['name' => 'tester_name', 'label' => 'Nama tester', 'type' => 'text', 'is_required' => true],
            ['name' => 'tester_email', 'label' => 'Email tester', 'type' => 'email', 'is_required' => true],
            ['name' => 'tester_role', 'label' => 'Role saat menguji', 'type' => 'select', 'options' => ['User reguler', 'Admin', 'Manager', 'Super Admin', 'Lainnya'], 'is_required' => true],
            ['name' => 'uat_mode', 'label' => 'Pilih mode pengujian', 'type' => 'radio', 'options' => [self::MODE_QUICK, self::MODE_FULL], 'is_required' => true, 'description' => 'Quick UAT hanya menampilkan alur kritis. Full UAT menampilkan seluruh test case.'],
            ['name' => 'test_platform', 'label' => 'Platform yang diuji (boleh pilih lebih dari satu)', 'type' => 'checkbox', 'options' => ['Web desktop', 'Web mobile browser', 'Android APK'], 'is_required' => true],
            ['name' => 'tested_modules', 'label' => 'Area yang benar-benar Anda uji (boleh pilih lebih dari satu)', 'type' => 'checkbox', 'options' => [self::SCOPE_USER, self::SCOPE_ADMIN, self::SCOPE_FORMS, self::SCOPE_REPORTS], 'is_required' => true],
            ['name' => 'test_date', 'label' => 'Tanggal pengujian', 'type' => 'date', 'is_required' => true],
            ['name' => 'execution_mode', 'label' => 'Jenis pengujian', 'type' => 'select', 'options' => ['End-to-end UAT', 'Regression setelah perbaikan', 'Smoke test', 'Exploratory test'], 'is_required' => true],
            // Field berikut opsional agar tidak membebani tester di awal.
            ['name' => 'app_version', 'label' => 'Versi aplikasi/APK dan browser (contoh: APK v1.0.4, Chrome 140)', 'type' => 'text', 'is_required' => false],
            ['name' => 'device_model', 'label' => 'Device/laptop yang digunakan (contoh: Redmi Note 14 / Dell Latitude)', 'type' => 'text', 'is_required' => false],
            ['name' => 'os_version', 'label' => 'OS dan versi (contoh: Android 15 / Windows 11)', 'type' => 'text', 'is_required' => false],
            ['name' => 'browser_version', 'label' => 'Browser dan versi (isi N/A jika hanya menguji APK)', 'type' => 'text', 'is_required' => false],
            ['name' => 'network_type', 'label' => 'Koneksi saat menguji', 'type' => 'select', 'options' => ['Wi-Fi kantor', 'Wi-Fi rumah', 'Mobile data', 'VPN', 'Lainnya'], 'is_required' => false],
            ['name' => 'data_preparation', 'label' => 'Kesiapan data uji', 'type' => 'select', 'options' => ['Data uji lengkap dan valid', 'Sebagian data tersedia', 'Data uji tidak tersedia'], 'is_required' => false],
            ['name' => 'test_scope', 'label' => 'Scope data yang diuji (division / workspace / campaign)', 'type' => 'text', 'is_required' => false],
            ['name' => 'critical_flows', 'label' => 'Alur kritis yang benar-benar dijalankan (boleh pilih lebih dari satu)', 'type' => 'checkbox', 'options' => ['Login dan logout', 'Buat campaign/card', 'Pindahkan card antar status', 'Search card', 'Scroll board di APK', 'Attachment/komentar', 'Web ↔ APK sync', 'Permission/unauthorized access'], 'is_required' => false],
        ];

        foreach ($this->caseSections() as $section) {
            $sectionName = 'section_'.strtolower($section['code']);

            $fields[] = [
                'name' => $sectionName,
                'label' => $section['title'],
                'type' => 'section',
                'description' => $section['how'] ?? null,
                'is_required' => false,
                'depends_on_name' => $section['depends_on_name'] ?? null,
                'depends_on_value' => $section['depends_on_value'] ?? null,
            ];

            $fields[] = [
                'name' => $sectionName.'_note',
                'label' => 'Saran / catatan untuk bagian ini (opsional)',
                'type' => 'textarea',
                'is_required' => false,
                'description' => 'Tulis saran atau kendala umum pada bagian ini bila ada.',
            ];

            foreach ($section['cases'] as $case) {
                $caseName = strtolower(str_replace('-', '_', $case['id']));

                $statusField = [
                    'name' => $caseName,
                    'label' => $case['id'].' — '.$case['label'],
                    'type' => 'select',
                    'options' => self::STATUS_OPTIONS,
                    'is_required' => true,
                    'description' => 'Harapan: '.$case['expect'],
                ];

                if (! in_array($case['id'], self::QUICK_CASE_IDS, true)) {
                    $statusField['depends_on_name'] = 'uat_mode';
                    $statusField['depends_on_value'] = self::MODE_FULL;
                }

                $fields[] = $statusField;

                $noteField = [
                    'name' => $caseName.'_note',
                    'label' => 'Kotak saran untuk '.$case['id'],
                    'type' => 'textarea',
                    'is_required' => false,
                    'description' => 'Opsional untuk PASS. Wajib diisi bila status FAIL atau BLOCKED.',
                ];

                if (! in_array($case['id'], self::QUICK_CASE_IDS, true)) {
                    $noteField['depends_on_name'] = 'uat_mode';
                    $noteField['depends_on_value'] = self::MODE_FULL;
                }

                $fields[] = $noteField;
            }
        }

        $fields = array_merge($fields, [
            ['name' => 'data_integrity_status', 'label' => 'Akurasi dan konsistensi data (nama, status, assignee, due date, jumlah card)', 'type' => 'select', 'options' => self::STATUS_OPTIONS, 'is_required' => true],
            ['name' => 'performance_status', 'label' => 'Performa yang dirasakan saat memuat halaman atau menyimpan perubahan', 'type' => 'select', 'options' => ['Cepat (< 3 detik)', 'Cukup (3–5 detik)', 'Lambat (> 5 detik)', 'Tidak dapat diukur'], 'is_required' => true],
            ['name' => 'recovery_status', 'label' => 'Pemulihan setelah error/koneksi terputus (retry, refresh, dan state data)', 'type' => 'select', 'options' => self::STATUS_OPTIONS, 'is_required' => true],
            ['name' => 'defect_count', 'label' => 'Perkiraan jumlah defect yang ditemukan pada sesi ini (isi 0 jika tidak ada)', 'type' => 'number', 'is_required' => true],
            ['name' => 'defect_severity', 'label' => 'Severity defect tertinggi pada sesi ini', 'type' => 'select', 'options' => ['Tidak ada defect', 'P0 — Blocker/kritis', 'P1 — Tinggi', 'P2 — Sedang', 'P3 — Rendah'], 'is_required' => true],
            ['name' => 'reproducibility', 'label' => 'Jika ada defect, seberapa mudah direproduksi?', 'type' => 'select', 'options' => ['Selalu terjadi', 'Kadang terjadi', 'Tidak dapat direproduksi', 'N/A — tidak ada defect'], 'is_required' => true],
            ['name' => 'overall_rating', 'label' => 'Seberapa mudah Tracko digunakan secara keseluruhan?', 'type' => 'select', 'options' => ['5 — Sangat mudah', '4 — Mudah', '3 — Cukup', '2 — Sulit', '1 — Sangat sulit'], 'is_required' => true],
            ['name' => 'summary_notes', 'label' => 'Ringkasan saran / temuan utama sesi ini', 'type' => 'textarea', 'is_required' => false, 'description' => 'Opsional. Rangkum saran atau kendala utama bila ada.'],
            ['name' => 'evidence_file', 'label' => 'Lampiran bukti (opsional: screenshot/video singkat/log tanpa data sensitif)', 'type' => 'file', 'is_required' => false],
            ['name' => 'evidence_url', 'label' => 'Link bukti tambahan (opsional)', 'type' => 'text', 'is_required' => false],
            ['name' => 'improvement_suggestions', 'label' => 'Saran perbaikan atau fitur yang paling membantu', 'type' => 'textarea', 'is_required' => false],
            ['name' => 'uat_decision', 'label' => 'Keputusan UAT dari sisi Anda', 'type' => 'radio', 'options' => ['LULUS', 'LULUS DENGAN CATATAN', 'BELUM LULUS'], 'is_required' => true],
            ['name' => 'signoff_name', 'label' => 'Nama untuk sign-off/persetujuan', 'type' => 'text', 'is_required' => true],
            ['name' => 'signoff_confirmation', 'label' => 'Konfirmasi tester', 'type' => 'checkbox', 'options' => ['Saya mengisi berdasarkan pengujian nyata dan menyetujui hasil ini ditinjau oleh tim Tracko.'], 'is_required' => true],
        ]);

        return [
            'name' => 'UAT Tracko — Questionnaire & Sign-off',
            'description' => implode("\n", [
                'Terima kasih sudah membantu menguji Tracko.',
                'Quick UAT menampilkan alur kritis untuk user bisnis. Full UAT menampilkan seluruh menu, fungsi, dan fitur untuk QA.',
                'Setiap test case punya pilihan status dan kotak saran. Isi kotak saran bila ada catatan; wajib diisi untuk status FAIL/BLOCKED.',
                'Section Admin, Forms, Report, dan Mobile hanya muncul bila dipilih pada scope/platform. Draft jawaban teks tersimpan otomatis di perangkat ini.',
                'Satu pengisian mewakili satu sesi. Estimasi Quick UAT 10–15 menit; Full UAT 30–45 menit untuk pengisian form.',
            ]),
            'note_content' => 'PASS = berjalan sesuai harapan. PASS dengan catatan = berjalan tetapi ada saran kecil. FAIL = fungsi tidak berjalan. BLOCKED = tidak bisa diuji karena environment/data. Untuk FAIL/BLOCKED, isi kotak saran plus severity, reproduksi, dan bukti. Pilih N/A hanya jika test case memang tidak berlaku untuk role Anda. Jangan tulis password atau token pada jawaban.',
            'fields' => $fields,
        ];
    }

    /**
     * Satu item di sini menjadi satu dropdown status + satu kotak saran pada
     * public form. `expect` menjelaskan hasil yang diharapkan agar tester tahu
     * kapan sebuah test case dinyatakan PASS.
     */
    private function caseSections(): array
    {
        return [
            ['code' => 'public', 'title' => 'A. Landing page dan public form', 'how' => 'Buka tanpa login, lalu cek setiap alur publik.', 'cases' => [
                ['id' => 'PUB-01', 'label' => 'Landing page, branding, dan link Sign In dapat dibuka', 'expect' => 'Landing tampil rapi dan tombol Sign In mengarah ke halaman login.'],
                ['id' => 'PUB-02', 'label' => 'Public UAT form dapat dibuka tanpa login', 'expect' => 'Form terbuka tanpa meminta login.'],
                ['id' => 'PUB-03', 'label' => 'Validasi pertanyaan wajib dan format input bekerja', 'expect' => 'Submit tanpa mengisi pertanyaan wajib menampilkan pesan validasi yang jelas.'],
                ['id' => 'PUB-04', 'label' => 'Submit response dan upload evidence berhasil tersimpan', 'expect' => 'Setelah submit muncul konfirmasi sukses dan bukti tersimpan.'],
                ['id' => 'PUB-05', 'label' => 'Success state, clear form, dan isi jawaban lain bekerja', 'expect' => 'Tombol "Isi jawaban lain" mengosongkan form dan bisa mengisi ulang.'],
            ]],
            ['code' => 'auth_nav', 'title' => 'B. Authentication dan navigasi umum', 'how' => 'Uji login/logout dan menu sesuai role Anda.', 'cases' => [
                ['id' => 'AUTH-01', 'label' => 'Login dengan akun user valid', 'expect' => 'Berhasil masuk dan diarahkan ke halaman awal yang benar.'],
                ['id' => 'AUTH-02', 'label' => 'Password salah ditolak dengan pesan aman', 'expect' => 'Ditolak dengan pesan umum tanpa membocorkan detail akun.'],
                ['id' => 'AUTH-03', 'label' => 'Validasi field login kosong', 'expect' => 'Field kosong ditandai dan tidak bisa submit.'],
                ['id' => 'AUTH-04', 'label' => 'Akun tidak dikenal/nonaktif ditolak', 'expect' => 'Akun tidak valid tidak bisa masuk.'],
                ['id' => 'AUTH-05', 'label' => 'Session bertahan saat refresh/tab dibuka ulang', 'expect' => 'Tetap login setelah refresh.'],
                ['id' => 'AUTH-06', 'label' => 'Token expired/invalid mengarahkan ke Sign In', 'expect' => 'Diarahkan kembali ke login dengan aman.'],
                ['id' => 'AUTH-07', 'label' => 'Logout membersihkan sesi dan route protected', 'expect' => 'Sesi bersih; membuka route protected kembali ke login.'],
                ['id' => 'AUTH-08', 'label' => 'Sign up mengikuti policy aplikasi', 'expect' => 'Perilaku sign up sesuai kebijakan (dibuka/dibatasi).'],
                ['id' => 'AUTH-09', 'label' => 'Forgot password mengirim alur reset yang benar', 'expect' => 'Permintaan reset terkirim/tampil sesuai konfigurasi.'],
                ['id' => 'AUTH-10', 'label' => 'Reset password dengan token valid/invalid', 'expect' => 'Token valid bisa reset; token invalid ditolak dengan pesan jelas.'],
                ['id' => 'AUTH-11', 'label' => 'Current-user profile mengembalikan role, permission, dan session context yang benar', 'expect' => 'Role dan permission yang dikembalikan sesuai akun.'],
                ['id' => 'NAV-01', 'label' => 'Menu sidebar/header sesuai role dan permission', 'expect' => 'Menu yang muncul hanya yang diizinkan untuk role Anda.'],
                ['id' => 'NAV-02', 'label' => 'Sidebar desktop/mobile dan hamburger/backdrop bekerja', 'expect' => 'Sidebar bisa dibuka/tutup di desktop dan mobile.'],
                ['id' => 'NAV-03', 'label' => 'Submenu dan breadcrumb Task Management benar', 'expect' => 'Submenu dan breadcrumb menampilkan posisi halaman dengan benar.'],
                ['id' => 'NAV-04', 'label' => 'Route invalid menampilkan Not Found/empty state', 'expect' => 'URL tidak valid menampilkan halaman Not Found yang rapi.'],
            ]],
            ['code' => 'my_work', 'title' => 'C. Dashboard user dan My Work', 'how' => 'Bandingkan angka dan daftar kerja dengan data yang Anda miliki.', 'cases' => [
                ['id' => 'MYW-01', 'label' => 'Summary total, completed, dan completion rate hanya milik user', 'expect' => 'Hanya menghitung pekerjaan milik user yang login.'],
                ['id' => 'MYW-02', 'label' => 'Filter periode mengubah data dengan benar', 'expect' => 'Mengganti periode mengubah angka sesuai rentang.'],
                ['id' => 'MYW-03', 'label' => 'Movement feed membuka card/campaign yang benar', 'expect' => 'Klik aktivitas membuka card/campaign yang sesuai.'],
                ['id' => 'MYW-04', 'label' => 'Panel attachment kerja mengikuti scope/periode', 'expect' => 'Lampiran yang tampil sesuai user dan periode.'],
                ['id' => 'MYW-05', 'label' => 'Export pribadi menghasilkan file dan log yang benar', 'expect' => 'File terunduh dan tercatat di log ekspor.'],
                ['id' => 'MYW-06', 'label' => 'Empty state My Work tanpa aktivitas', 'expect' => 'Menampilkan pesan kosong yang jelas, bukan error.'],
                ['id' => 'MYW-07', 'label' => 'Ranking tersembunyi untuk user tanpa permission', 'expect' => 'Panel ranking tidak muncul tanpa izin.'],
                ['id' => 'MYW-08', 'label' => 'Daily todo tampil dan dapat diperbarui bila diaktifkan', 'expect' => 'Daftar todo harian tampil dan bisa diperbarui.'],
                ['id' => 'MYW-09', 'label' => 'Refresh/realtime My Work mencerminkan perubahan terbaru', 'expect' => 'Perubahan terbaru muncul tanpa refresh manual.'],
                ['id' => 'MYW-10', 'label' => 'Daily todo mengikuti tanggal dan scope user', 'expect' => 'Todo sesuai tanggal aktif dan scope user.'],
                ['id' => 'MYW-11', 'label' => 'My activities feed, pagination, dan empty state bekerja', 'expect' => 'Feed & pagination berjalan; kosong tampil rapi.'],
                ['id' => 'MYW-12', 'label' => 'Completion ranking hanya tampil bila permission dan urutannya akurat', 'expect' => 'Ranking muncul sesuai izin dan urutan benar.'],
                ['id' => 'MYW-13', 'label' => 'Attachment aktivitas membuka atau mengunduh target yang benar', 'expect' => 'File terbuka/terunduh sesuai baris.'],
                ['id' => 'MYW-14', 'label' => 'Export aktivitas pribadi menghasilkan file dan audit log', 'expect' => 'File terunduh dan tercatat.'],
            ]],
            ['code' => 'division_workspace', 'title' => 'D. Division dan Workspace', 'how' => 'Pastikan hanya data dalam scope Anda yang tampil.', 'cases' => [
                ['id' => 'DIV-01', 'label' => 'Daftar division sesuai scope user', 'expect' => 'Hanya division yang relevan yang tampil.'],
                ['id' => 'DIV-02', 'label' => 'Pencarian/pilih division membuka data yang benar', 'expect' => 'Memilih division membuka workspace terkait.'],
                ['id' => 'DIV-03', 'label' => 'Daftar anggota division dapat dilihat sesuai permission', 'expect' => 'Roster tampil hanya bila diizinkan.'],
                ['id' => 'DIV-04', 'label' => 'User tidak dapat create/edit/delete/manage member division', 'expect' => 'Aksi mutasi division ditolak untuk user biasa.'],
                ['id' => 'DIV-05', 'label' => 'My divisions auto-discovery memilih division pertama yang valid', 'expect' => 'Division pertama yang valid otomatis terpilih.'],
                ['id' => 'WSP-01', 'label' => 'Daftar workspace pada division sesuai scope', 'expect' => 'Workspace yang tampil sesuai akses.'],
                ['id' => 'WSP-02', 'label' => 'Search workspace berdasarkan nama/deskripsi', 'expect' => 'Pencarian menyaring workspace dengan tepat.'],
                ['id' => 'WSP-03', 'label' => 'Mutasi workspace tersembunyi/ditolak untuk user', 'expect' => 'User biasa tidak bisa mengubah workspace.'],
                ['id' => 'WSP-04', 'label' => 'Workspace di luar scope ditolak termasuk akses URL langsung', 'expect' => 'Akses langsung ke URL workspace lain ditolak.'],
            ]],
            ['code' => 'campaign', 'title' => 'E. Campaign, detail, analitik, dan collaborator', 'how' => 'Uji dari daftar campaign sampai detail dan anggota.', 'cases' => [
                ['id' => 'CAM-01', 'label' => 'List campaign menampilkan metadata yang benar', 'expect' => 'Nama, tipe, due, dan jumlah member benar.'],
                ['id' => 'CAM-02', 'label' => 'Search campaign dan counter hasil akurat', 'expect' => 'Hasil pencarian dan jumlahnya akurat.'],
                ['id' => 'CAM-03', 'label' => 'Refresh campaign memuat data terbaru tanpa duplikasi', 'expect' => 'Data terbaru muncul tanpa kartu ganda.'],
                ['id' => 'CAM-04', 'label' => 'Create campaign dengan nama, tipe, due date, dan member', 'expect' => 'Campaign tersimpan dengan data yang diisi.'],
                ['id' => 'CAM-05', 'label' => 'Validasi create campaign mencegah data kosong/lampau', 'expect' => 'Field wajib & tanggal lampau dicegah.'],
                ['id' => 'CAM-06', 'label' => 'Edit campaign menyimpan perubahan', 'expect' => 'Perubahan tersimpan dan tampil.'],
                ['id' => 'CAM-07', 'label' => 'Delete campaign dengan confirm/cancel yang benar', 'expect' => 'Konfirmasi muncul; cancel membatalkan.'],
                ['id' => 'CAM-08', 'label' => 'Tambah collaborator via nama/email tanpa duplikasi', 'expect' => 'Member unik ditambahkan tanpa duplikat.'],
                ['id' => 'CAM-09', 'label' => 'Scope collaborator mengikuti role/division policy', 'expect' => 'Kandidat yang muncul sesuai kebijakan.'],
                ['id' => 'CAM-10', 'label' => 'Remove collaborator hanya pada target yang dipilih', 'expect' => 'Hanya member terpilih yang dihapus.'],
                ['id' => 'CAM-11', 'label' => 'Campaign di luar scope tidak membocorkan data', 'expect' => 'Campaign di luar akses tidak terlihat.'],
                ['id' => 'CAM-12', 'label' => 'Detail periode, stats, progress, Gantt, health, overdue sesuai permission', 'expect' => 'Angka & tampilan sesuai izin dan data.'],
                ['id' => 'CAM-13', 'label' => 'Endpoint stats/progress/Gantt/overdue/health memiliki loading, error, dan data konsisten', 'expect' => 'Loading/error state benar dan data konsisten.'],
            ]],
            ['code' => 'board', 'title' => 'F. Board, column, Kanban/List, dan card search', 'how' => 'Uji board, perpindahan card, dan pencarian.', 'cases' => [
                ['id' => 'BRD-01', 'label' => 'Board memuat seluruh column dan jumlah card benar', 'expect' => 'Semua kolom tampil dengan jumlah card tepat.'],
                ['id' => 'BRD-02', 'label' => 'Switch Kanban dan List mempertahankan data/urutan', 'expect' => 'Data & urutan tetap saat berpindah tampilan.'],
                ['id' => 'BRD-03', 'label' => 'Create column dengan nama dan warna', 'expect' => 'Kolom baru muncul dengan nama & warna.'],
                ['id' => 'BRD-04', 'label' => 'Edit column menyimpan perubahan', 'expect' => 'Perubahan kolom tersimpan.'],
                ['id' => 'BRD-05', 'label' => 'Delete column memakai confirmation dan aturan bisnis', 'expect' => 'Konfirmasi tampil; kolom terkunci tidak terhapus.'],
                ['id' => 'BRD-06', 'label' => 'Reorder column tersimpan; column terkunci tetap terkunci', 'expect' => 'Urutan tersimpan dan kolom terkunci tidak pindah.'],
                ['id' => 'BRD-07', 'label' => 'Create card dengan title, due date, priority, assignee', 'expect' => 'Card tersimpan dengan data yang diisi.'],
                ['id' => 'BRD-08', 'label' => 'Validasi card kosong dan cancel/Escape', 'expect' => 'Judul kosong ditolak; Escape menutup form.'],
                ['id' => 'BRD-09', 'label' => 'Move card antar-column/board', 'expect' => 'Card pindah kolom/board dan status ikut berubah.'],
                ['id' => 'BRD-10', 'label' => 'Reorder card dalam column', 'expect' => 'Urutan card tersimpan.'],
                ['id' => 'BRD-11', 'label' => 'Search card berdasarkan judul dan counter hasil', 'expect' => 'Hasil & jumlah sesuai kata kunci.'],
                ['id' => 'BRD-12', 'label' => 'Search case-insensitive, trim, clear, Escape, dan hasil 0', 'expect' => 'Pencarian tidak sensitif huruf besar/kecil dan bisa dibersihkan.'],
                ['id' => 'BRD-13', 'label' => 'Drag aman/nonaktif saat search aktif', 'expect' => 'Drag tidak aktif saat pencarian, tidak error.'],
                ['id' => 'BRD-14', 'label' => 'Klik card membuka detail yang tepat', 'expect' => 'Detail card yang dibuka sesuai kartu.'],
                ['id' => 'BRD-15', 'label' => 'Board empty/loading/error state', 'expect' => 'State loading/kosong/error tampil jelas.'],
                ['id' => 'BRD-16', 'label' => 'Create/update/delete/reorder board refresh dan rollback aman saat request gagal', 'expect' => 'Perubahan tersimpan; saat gagal, data kembali konsisten.'],
            ]],
            ['code' => 'card', 'title' => 'G. Detail card, task, checklist, attachment, komentar', 'how' => 'Uji seluruh isi modal detail card.', 'cases' => [
                ['id' => 'CARD-01', 'label' => 'Edit title card dan sinkronisasi ke semua tampilan', 'expect' => 'Judul baru muncul di semua tampilan.'],
                ['id' => 'CARD-02', 'label' => 'Edit description dan pending save sebelum modal ditutup', 'expect' => 'Perubahan deskripsi tersimpan sebelum modal tertutup.'],
                ['id' => 'CARD-03', 'label' => 'Assign/unassign member dengan picker', 'expect' => 'Member bisa ditambah/dilepas dengan benar.'],
                ['id' => 'CARD-04', 'label' => 'Move card dari detail/mobile status picker', 'expect' => 'Status card berubah sesuai pilihan.'],
                ['id' => 'CARD-05', 'label' => 'Ubah priority low/medium/high/urgent', 'expect' => 'Prioritas tersimpan dan tampil.'],
                ['id' => 'CARD-06', 'label' => 'Set/ubah/hapus due date dan status overdue', 'expect' => 'Due date tersimpan; overdue mengikuti aturan.'],
                ['id' => 'CARD-07', 'label' => 'Tambah/complete/edit/reorder/delete task/checklist', 'expect' => 'Checklist tersimpan dan progress benar.'],
                ['id' => 'CARD-08', 'label' => 'Tambah/edit/complete/delete subtask', 'expect' => 'Subtask berjalan sesuai aksi.'],
                ['id' => 'CARD-09', 'label' => 'Attach/detach/toggle label tanpa duplikasi', 'expect' => 'Label menempel/lepas tanpa ganda.'],
                ['id' => 'CARD-10', 'label' => 'Attach/detach brand sesuai permission', 'expect' => 'Brand mengikuti izin pengguna.'],
                ['id' => 'CARD-11', 'label' => 'Create/edit/delete komentar sesuai ownership/policy', 'expect' => 'Hanya komentar yang berhak bisa diubah/dihapus.'],
                ['id' => 'CARD-12', 'label' => 'Upload/preview/download/delete brief attachment', 'expect' => 'Lampiran brief berfungsi penuh.'],
                ['id' => 'CARD-13', 'label' => 'Upload hasil file/link, metadata, preview/download/delete', 'expect' => 'Lampiran hasil berfungsi penuh.'],
                ['id' => 'CARD-14', 'label' => 'Pilih/buat template deskripsi hasil sesuai permission', 'expect' => 'Template tampil/pembuatan sesuai izin.'],
                ['id' => 'CARD-15', 'label' => 'Activity timeline dan Load more tidak duplikasi', 'expect' => 'Aktivitas termuat bertahap tanpa duplikat.'],
                ['id' => 'CARD-16', 'label' => 'Card detail mobile, Card tools, Back, X, backdrop, dan scroll', 'expect' => 'Navigasi modal di mobile berjalan mulus.'],
                ['id' => 'CARD-17', 'label' => 'Delete card mengikuti aturan overdue/permission', 'expect' => 'Card telat tidak bisa dihapus; lainnya sesuai izin.'],
                ['id' => 'CARD-18', 'label' => 'Archive/restore result attachment dan status aksesnya konsisten', 'expect' => 'Arsip/pulih lampiran konsisten.'],
            ]],
            ['code' => 'calendar', 'title' => 'H. Calendar dan due date', 'how' => 'Cek kalender dan konsistensi due date.', 'cases' => [
                ['id' => 'CAL-01', 'label' => 'Calendar menampilkan pekerjaan sesuai scope dan tanggal', 'expect' => 'Hanya pekerjaan relevan pada tanggal yang benar.'],
                ['id' => 'CAL-02', 'label' => 'Navigasi bulan/minggu/hari dan Today', 'expect' => 'Navigasi tanggal berjalan benar.'],
                ['id' => 'CAL-03', 'label' => 'Event membuka card yang benar', 'expect' => 'Klik event membuka card sesuai.'],
                ['id' => 'CAL-04', 'label' => 'Create card dari tanggal calendar bila tersedia', 'expect' => 'Card dibuat pada tanggal terpilih.'],
                ['id' => 'CAL-05', 'label' => 'Due date/status konsisten Web dan APK', 'expect' => 'Due date/status sama di web dan APK.'],
            ]],
            ['code' => 'chat', 'title' => 'I. Chat dan komunikasi realtime', 'how' => 'Uji kirim/terima pesan dan status baca.', 'cases' => [
                ['id' => 'CHAT-01', 'label' => 'Daftar room dan unread count sesuai user', 'expect' => 'Room & unread sesuai akun.'],
                ['id' => 'CHAT-02', 'label' => 'Create direct message room', 'expect' => 'DM baru terbentuk dengan benar.'],
                ['id' => 'CHAT-03', 'label' => 'Kirim pesan satu kali dengan author/time benar', 'expect' => 'Pesan terkirim sekali dengan waktu & pengirim benar.'],
                ['id' => 'CHAT-04', 'label' => 'Hapus pesan sendiri; pesan orang lain terlindungi', 'expect' => 'Hanya pesan sendiri bisa dihapus.'],
                ['id' => 'CHAT-05', 'label' => 'Read state/unread badge berubah saat room dibuka', 'expect' => 'Badge berkurang setelah dibuka.'],
                ['id' => 'CHAT-06', 'label' => 'Pesan realtime Web ↔ APK tanpa duplikasi', 'expect' => 'Pesan muncul realtime tanpa dobel.'],
                ['id' => 'CHAT-07', 'label' => 'Error/retry saat koneksi kirim pesan terputus', 'expect' => 'Ada umpan balik & bisa coba lagi.'],
                ['id' => 'CHAT-08', 'label' => 'Room detail, message pagination, dan empty state bekerja', 'expect' => 'Pesan termuat bertahap; kosong tampil rapi.'],
            ]],
            ['code' => 'notification', 'title' => 'J. Notifikasi', 'how' => 'Cek notifikasi yang masuk dan aksinya.', 'cases' => [
                ['id' => 'NOTIF-01', 'label' => 'Bell menampilkan unread count dan notifikasi milik user', 'expect' => 'Hanya notifikasi milik user yang muncul.'],
                ['id' => 'NOTIF-02', 'label' => 'Klik notifikasi menandai read dan membuka target benar', 'expect' => 'Notifikasi jadi terbaca & membuka target.'],
                ['id' => 'NOTIF-03', 'label' => 'Mark all as read mengubah semua item user', 'expect' => 'Semua notifikasi user jadi terbaca.'],
                ['id' => 'NOTIF-04', 'label' => 'Delete hanya menghapus item target', 'expect' => 'Hanya item terpilih yang terhapus.'],
                ['id' => 'NOTIF-05', 'label' => 'Notifikasi assignment/comment/chat sinkron Web ↔ APK', 'expect' => 'Notifikasi konsisten di web dan APK.'],
            ]],
            ['code' => 'account', 'title' => 'K. Profile, avatar, password, dan account', 'how' => 'Uji pengaturan akun pribadi.', 'cases' => [
                ['id' => 'ACC-01', 'label' => 'Edit profile hanya akun sendiri', 'expect' => 'Hanya profil sendiri yang bisa diubah.'],
                ['id' => 'ACC-02', 'label' => 'Update nama/profile dan aturan email HRIS', 'expect' => 'Nama tersimpan; email mengikuti aturan HRIS.'],
                ['id' => 'ACC-03', 'label' => 'Upload avatar valid dan invalid', 'expect' => 'File valid tersimpan; file invalid ditolak.'],
                ['id' => 'ACC-04', 'label' => 'Ganti password dengan password lama/baru valid', 'expect' => 'Password berhasil diganti dengan data valid.'],
                ['id' => 'ACC-05', 'label' => 'Validasi password lama, panjang, dan konfirmasi', 'expect' => 'Password salah/pendek/konfirmasi beda ditolak.'],
                ['id' => 'ACC-06', 'label' => 'Logout web dan APK', 'expect' => 'Berhasil keluar dari web dan APK.'],
            ]],
            ['code' => 'sync_mobile', 'title' => 'L. Mobile, realtime, dan konsistensi Web ↔ APK', 'how' => 'Uji khusus jika memakai Android APK.', 'depends_on_name' => 'test_platform', 'depends_on_value' => 'Android APK', 'cases' => [
                ['id' => 'SYNC-01', 'label' => 'Entity baru dari web muncul di APK sesuai scope', 'expect' => 'Data baru web muncul di APK.'],
                ['id' => 'SYNC-02', 'label' => 'Perubahan dari APK muncul di web', 'expect' => 'Perubahan APK terlihat di web.'],
                ['id' => 'SYNC-03', 'label' => 'Event Reverb card/comment/assignment tidak hilang/dobel', 'expect' => 'Realtime tidak hilang/berulang.'],
                ['id' => 'SYNC-04', 'label' => 'Fallback refetch aman saat realtime gagal', 'expect' => 'Data tetap ter-refresh saat realtime gagal.'],
                ['id' => 'SYNC-05', 'label' => 'Scroll vertikal column APK untuk banyak card', 'expect' => 'Kolom bisa di-scroll vertikal di APK.'],
                ['id' => 'SYNC-06', 'label' => 'Search card APK dan auto-select status yang memiliki hasil', 'expect' => 'Pencarian memilih status berisi hasil.'],
                ['id' => 'SYNC-07', 'label' => 'Install/update APK kandidat demo dan API environment benar', 'expect' => 'APK terpasang dan mengarah ke API yang benar.'],
            ]],
            ['code' => 'security', 'title' => 'M. Permission, scope, validasi, dan keamanan', 'how' => 'Pastikan tidak ada akses di luar hak.', 'cases' => [
                ['id' => 'SEC-01', 'label' => 'Menu/route admin Forms, Report, Profile tidak bypass untuk user baseline', 'expect' => 'Route admin ditolak untuk user biasa.'],
                ['id' => 'SEC-02', 'label' => 'ID entity di luar scope ditolak server', 'expect' => 'Permintaan ID di luar scope ditolak.'],
                ['id' => 'SEC-03', 'label' => 'Input XSS, panjang, unicode, URL, dan file invalid aman', 'expect' => 'Input berbahaya tidak dieksekusi.'],
                ['id' => 'SEC-04', 'label' => 'Permission read-only menolak semua mutasi', 'expect' => 'Semua aksi ubah ditolak.'],
                ['id' => 'SEC-05', 'label' => 'Resource/komentar/attachment/pesan user lain terlindungi', 'expect' => 'Data user lain tetap terlindungi.'],
                ['id' => 'SEC-06', 'label' => 'Logout membersihkan token dan data storage', 'expect' => 'Token & storage bersih setelah logout.'],
            ]],
            ['code' => 'admin', 'title' => 'N. Menu dan fungsi admin/super admin', 'how' => 'Uji bila Anda memakai akun admin/super admin.', 'depends_on_name' => 'tested_modules', 'depends_on_value' => self::SCOPE_ADMIN, 'cases' => [
                ['id' => 'ADM-01', 'label' => 'User list, search, detail, activity, dan stats', 'expect' => 'Daftar & detail user berjalan sesuai izin.'],
                ['id' => 'ADM-02', 'label' => 'Create/edit/delete user dan role', 'expect' => 'CRUD user & role tersimpan dengan benar.'],
                ['id' => 'ADM-03', 'label' => 'View/update permission tambahan user', 'expect' => 'Permission tambahan bisa dilihat/diubah.'],
                ['id' => 'ADM-04', 'label' => 'Reset password user HRIS dan login awal', 'expect' => 'Password bisa direset dan login awal berhasil.'],
                ['id' => 'ADM-05', 'label' => 'Impersonation/bypass dan audit log', 'expect' => 'Bypass berjalan dan tercatat di audit.'],
                ['id' => 'ADM-06', 'label' => 'Create/edit/delete division', 'expect' => 'CRUD division tersimpan.'],
                ['id' => 'ADM-07', 'label' => 'Tambah/ubah role/remove anggota division', 'expect' => 'Keanggotaan division berubah sesuai aksi.'],
                ['id' => 'ADM-08', 'label' => 'Create/edit/delete workspace', 'expect' => 'CRUD workspace tersimpan.'],
                ['id' => 'ADM-09', 'label' => 'CRUD master label', 'expect' => 'Label master bisa dikelola.'],
                ['id' => 'ADM-10', 'label' => 'CRUD master brand', 'expect' => 'Brand master bisa dikelola.'],
                ['id' => 'ADM-11', 'label' => 'CRUD result description template', 'expect' => 'Template deskripsi bisa dikelola.'],
                ['id' => 'ADM-12', 'label' => 'Global dashboard, system insights, activities, dan ranking', 'expect' => 'Dashboard & insight tampil sesuai scope.'],
            ]],
            ['code' => 'forms', 'title' => 'O. Forms, builder, public response, dan forwarding', 'how' => 'Uji modul form bila Anda memakainya.', 'depends_on_name' => 'tested_modules', 'depends_on_value' => self::SCOPE_FORMS, 'cases' => [
                ['id' => 'FORM-01', 'label' => 'List/create/update/delete form', 'expect' => 'CRUD form tersimpan.'],
                ['id' => 'FORM-02', 'label' => 'Builder field text/textarea/number/date/file/select/radio/checkbox, required, options', 'expect' => 'Semua tipe field berfungsi di builder.'],
                ['id' => 'FORM-03', 'label' => 'Conditional field dan opsi Other', 'expect' => 'Field kondisional & opsi Other berjalan.'],
                ['id' => 'FORM-04', 'label' => 'Public form validation, submit, dan attachment', 'expect' => 'Validasi, submit, dan lampiran bekerja.'],
                ['id' => 'FORM-05', 'label' => 'Response detail, expand, export/preview', 'expect' => 'Detail & ekspor response berjalan.'],
                ['id' => 'FORM-06', 'label' => 'Assign/forward submission menjadi card', 'expect' => 'Submission bisa diteruskan menjadi card.'],
                ['id' => 'FORM-07', 'label' => 'Public form index hanya menampilkan form aktif dan slug invalid ditolak', 'expect' => 'Hanya form aktif tampil; slug invalid ditolak.'],
            ]],
            ['code' => 'reports', 'title' => 'P. Report dan QC', 'how' => 'Uji laporan, filter, dan QC.', 'depends_on_name' => 'tested_modules', 'depends_on_value' => self::SCOPE_REPORTS, 'cases' => [
                ['id' => 'RPT-01', 'label' => 'Filter report user/division/workspace/campaign/periode', 'expect' => 'Filter menyaring data dengan benar.'],
                ['id' => 'RPT-02', 'label' => 'Preview report dan attachment', 'expect' => 'Preview & lampiran tampil benar.'],
                ['id' => 'RPT-03', 'label' => 'Export PDF/Excel dan secure password', 'expect' => 'Ekspor menghasilkan file yang benar.'],
                ['id' => 'RPT-04', 'label' => 'QC verification dan activity log', 'expect' => 'QC tersimpan dan tercatat.'],
                ['id' => 'RPT-05', 'label' => 'Activity logs per user dapat dibuka sesuai scope dan pagination', 'expect' => 'Activity log sesuai scope & berpaginasi.'],
            ]],
            ['code' => 'quality', 'title' => 'Q. Kualitas umum dan usability', 'how' => 'Penilaian pengalaman pakai secara umum.', 'cases' => [
                ['id' => 'GEN-01', 'label' => 'Responsive layout desktop, tablet, dan mobile', 'expect' => 'Tata letak rapi di semua ukuran layar.'],
                ['id' => 'GEN-02', 'label' => 'Loading, empty, error, retry, dan no-crash state', 'expect' => 'Semua state tampil jelas dan tidak crash.'],
                ['id' => 'GEN-03', 'label' => 'Browser Back, deep link, dan route restore', 'expect' => 'Navigasi kembali & deep link berjalan.'],
                ['id' => 'GEN-04', 'label' => 'Keyboard focus, touch target, label, dan accessibility dasar', 'expect' => 'Fokus keyboard & touch target nyaman.'],
            ]],
        ];
    }
}
