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
     * Field names from the previous compact questionnaire. They are removed
     * during reconciliation so an existing form does not retain duplicate
     * area-level questions after upgrading to the exhaustive matrix.
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
     * Susun metadata, section, dan satu pertanyaan status untuk setiap test
     * case. Dengan pola ini response dapat ditelusuri langsung ke matriks UAT
     * tanpa meminta tester menulis ulang langkah pengujian secara manual.
     */
    private function definition(): array
    {
        $statusOptions = ['PASS', 'PASS dengan catatan', 'FAIL', 'BLOCKED', 'N/A'];

        $fields = [
            ['name' => 'tester_name', 'label' => 'Nama tester', 'type' => 'text', 'is_required' => true],
            ['name' => 'tester_email', 'label' => 'Email tester', 'type' => 'text', 'is_required' => true],
            ['name' => 'tester_role', 'label' => 'Role saat menguji', 'type' => 'select', 'options' => ['User reguler', 'Admin', 'Super Admin', 'Lainnya'], 'is_required' => true],
            ['name' => 'uat_mode', 'label' => 'Pilih mode pengujian', 'type' => 'radio', 'options' => [self::MODE_QUICK, self::MODE_FULL], 'is_required' => true],
            ['name' => 'test_platform', 'label' => 'Platform yang diuji (boleh pilih lebih dari satu)', 'type' => 'checkbox', 'options' => ['Web desktop', 'Web mobile browser', 'Android APK'], 'is_required' => true],
            ['name' => 'tested_modules', 'label' => 'Area yang benar-benar Anda uji (boleh pilih lebih dari satu)', 'type' => 'checkbox', 'options' => [self::SCOPE_USER, self::SCOPE_ADMIN, self::SCOPE_FORMS, self::SCOPE_REPORTS], 'is_required' => true],
            ['name' => 'app_version', 'label' => 'Versi aplikasi/APK dan browser (contoh: APK v1.0.4, Chrome 140)', 'type' => 'text', 'is_required' => true],
            ['name' => 'test_date', 'label' => 'Tanggal pengujian', 'type' => 'date', 'is_required' => true],
            ['name' => 'test_scope', 'label' => 'Scope data yang diuji (division / workspace / campaign)', 'type' => 'text', 'is_required' => true],
            ['name' => 'execution_mode', 'label' => 'Jenis pengujian', 'type' => 'select', 'options' => ['End-to-end UAT', 'Regression setelah perbaikan', 'Smoke test', 'Exploratory test'], 'is_required' => true],
            ['name' => 'device_model', 'label' => 'Device/laptop yang digunakan (contoh: Redmi Note 14 / Dell Latitude)', 'type' => 'text', 'is_required' => true],
            ['name' => 'os_version', 'label' => 'OS dan versi (contoh: Android 15 / Windows 11)', 'type' => 'text', 'is_required' => true],
            ['name' => 'browser_version', 'label' => 'Browser dan versi (isi N/A jika hanya menguji APK)', 'type' => 'text', 'is_required' => true],
            ['name' => 'network_type', 'label' => 'Koneksi saat menguji', 'type' => 'select', 'options' => ['Wi-Fi kantor', 'Wi-Fi rumah', 'Mobile data', 'VPN', 'Lainnya'], 'is_required' => true],
            ['name' => 'data_preparation', 'label' => 'Kesiapan data uji', 'type' => 'select', 'options' => ['Data uji lengkap dan valid', 'Sebagian data tersedia', 'Data uji tidak tersedia'], 'is_required' => true],
            ['name' => 'critical_flows', 'label' => 'Alur kritis yang benar-benar dijalankan (boleh pilih lebih dari satu)', 'type' => 'checkbox', 'options' => ['Login dan logout', 'Buat campaign/card', 'Pindahkan card antar status', 'Search card', 'Scroll board di APK', 'Attachment/komentar', 'Web ↔ APK sync', 'Permission/unauthorized access'], 'is_required' => true],
        ];

        foreach ($this->caseSections() as $section) {
            $fields[] = [
                'name' => 'section_'.strtolower($section['code']),
                'label' => $section['title'],
                'type' => 'section',
                'is_required' => false,
                'depends_on_name' => $section['depends_on_name'] ?? null,
                'depends_on_value' => $section['depends_on_value'] ?? null,
            ];

            foreach ($section['cases'] as $case) {
                $caseField = [
                    'name' => strtolower(str_replace('-', '_', $case['id'])),
                    'label' => $case['id'].' — '.$case['label'],
                    'type' => 'select',
                    'options' => $statusOptions,
                    'is_required' => true,
                ];

                if (! in_array($case['id'], self::QUICK_CASE_IDS, true)) {
                    $caseField['depends_on_name'] = 'uat_mode';
                    $caseField['depends_on_value'] = self::MODE_FULL;
                }

                $fields[] = $caseField;
            }
        }

        $fields = array_merge($fields, [
            ['name' => 'data_integrity_status', 'label' => 'Akurasi dan konsistensi data (nama, status, assignee, due date, jumlah card)', 'type' => 'select', 'options' => $statusOptions, 'is_required' => true],
            ['name' => 'performance_status', 'label' => 'Performa yang dirasakan saat memuat halaman atau menyimpan perubahan', 'type' => 'select', 'options' => ['Cepat (< 3 detik)', 'Cukup (3–5 detik)', 'Lambat (> 5 detik)', 'Tidak dapat diukur'], 'is_required' => true],
            ['name' => 'recovery_status', 'label' => 'Pemulihan setelah error/koneksi terputus (retry, refresh, dan state data)', 'type' => 'select', 'options' => $statusOptions, 'is_required' => true],
            ['name' => 'defect_count', 'label' => 'Perkiraan jumlah defect yang ditemukan pada sesi ini (isi 0 jika tidak ada)', 'type' => 'number', 'is_required' => true],
            ['name' => 'defect_severity', 'label' => 'Severity defect tertinggi pada sesi ini', 'type' => 'select', 'options' => ['Tidak ada defect', 'P0 — Blocker/kritis', 'P1 — Tinggi', 'P2 — Sedang', 'P3 — Rendah'], 'is_required' => true],
            ['name' => 'reproducibility', 'label' => 'Jika ada defect, seberapa mudah direproduksi?', 'type' => 'select', 'options' => ['Selalu terjadi', 'Kadang terjadi', 'Tidak dapat direproduksi', 'N/A — tidak ada defect'], 'is_required' => true],
            ['name' => 'overall_rating', 'label' => 'Seberapa mudah Tracko digunakan secara keseluruhan?', 'type' => 'select', 'options' => ['5 — Sangat mudah', '4 — Mudah', '3 — Cukup', '2 — Sulit', '1 — Sangat sulit'], 'is_required' => true],
            ['name' => 'issue_details', 'label' => 'Jika ada FAIL/BLOCKED, jelaskan menu, langkah, hasil aktual, dan bukti/link screenshot (jangan sertakan password/token)', 'type' => 'textarea', 'is_required' => false],
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
                'Section Admin, Forms, Report, dan Mobile hanya muncul bila dipilih pada scope/platform. Draft jawaban teks tersimpan otomatis di perangkat ini.',
                'Satu pengisian mewakili satu sesi. Estimasi Quick UAT 10–15 menit; Full UAT 30–45 menit untuk pengisian form.',
            ]),
            'note_content' => 'PASS = berjalan sesuai harapan. PASS dengan catatan = berjalan tetapi ada saran kecil. FAIL = fungsi tidak berjalan. BLOCKED = tidak bisa diuji karena environment/data. Untuk FAIL/BLOCKED, isi detail, severity, reproduksi, dan bukti. Pilih N/A hanya jika test case memang tidak berlaku untuk role Anda. Jangan tulis password atau token pada jawaban.',
            'fields' => $fields,
        ];
    }

    /**
     * Satu item di sini menjadi satu pertanyaan status pada public form.
     * Dengan demikian response dapat ditelusuri langsung ke UAT_USER.md.
     */
    private function caseSections(): array
    {
        return [
            ['code' => 'public', 'title' => 'A. Landing page dan public form', 'cases' => [
                ['id' => 'PUB-01', 'label' => 'Landing page, branding, dan link Sign In dapat dibuka'],
                ['id' => 'PUB-02', 'label' => 'Public UAT form dapat dibuka tanpa login'],
                ['id' => 'PUB-03', 'label' => 'Validasi pertanyaan wajib dan format input bekerja'],
                ['id' => 'PUB-04', 'label' => 'Submit response dan upload evidence berhasil tersimpan'],
                ['id' => 'PUB-05', 'label' => 'Success state, clear form, dan isi jawaban lain bekerja'],
            ]],
            ['code' => 'auth_nav', 'title' => 'B. Authentication dan navigasi umum', 'cases' => [
                ['id' => 'AUTH-01', 'label' => 'Login dengan akun user valid'],
                ['id' => 'AUTH-02', 'label' => 'Password salah ditolak dengan pesan aman'],
                ['id' => 'AUTH-03', 'label' => 'Validasi field login kosong'],
                ['id' => 'AUTH-04', 'label' => 'Akun tidak dikenal/nonaktif ditolak'],
                ['id' => 'AUTH-05', 'label' => 'Session bertahan saat refresh/tab dibuka ulang'],
                ['id' => 'AUTH-06', 'label' => 'Token expired/invalid mengarahkan ke Sign In'],
                ['id' => 'AUTH-07', 'label' => 'Logout membersihkan sesi dan route protected'],
                ['id' => 'AUTH-08', 'label' => 'Sign up mengikuti policy aplikasi'],
                ['id' => 'AUTH-09', 'label' => 'Forgot password mengirim alur reset yang benar'],
                ['id' => 'AUTH-10', 'label' => 'Reset password dengan token valid/invalid'],
                ['id' => 'AUTH-11', 'label' => 'Current-user profile mengembalikan role, permission, dan session context yang benar'],
                ['id' => 'NAV-01', 'label' => 'Menu sidebar/header sesuai role dan permission'],
                ['id' => 'NAV-02', 'label' => 'Sidebar desktop/mobile dan hamburger/backdrop bekerja'],
                ['id' => 'NAV-03', 'label' => 'Submenu dan breadcrumb Task Management benar'],
                ['id' => 'NAV-04', 'label' => 'Route invalid menampilkan Not Found/empty state'],
            ]],
            ['code' => 'my_work', 'title' => 'C. Dashboard user dan My Work', 'cases' => [
                ['id' => 'MYW-01', 'label' => 'Summary total, completed, dan completion rate hanya milik user'],
                ['id' => 'MYW-02', 'label' => 'Filter periode mengubah data dengan benar'],
                ['id' => 'MYW-03', 'label' => 'Movement feed membuka card/campaign yang benar'],
                ['id' => 'MYW-04', 'label' => 'Panel attachment kerja mengikuti scope/periode'],
                ['id' => 'MYW-05', 'label' => 'Export pribadi menghasilkan file dan log yang benar'],
                ['id' => 'MYW-06', 'label' => 'Empty state My Work tanpa aktivitas'],
                ['id' => 'MYW-07', 'label' => 'Ranking tersembunyi untuk user tanpa permission'],
                ['id' => 'MYW-08', 'label' => 'Daily todo tampil dan dapat diperbarui bila diaktifkan'],
                ['id' => 'MYW-09', 'label' => 'Refresh/realtime My Work mencerminkan perubahan terbaru'],
                ['id' => 'MYW-10', 'label' => 'Daily todo mengikuti tanggal dan scope user'],
                ['id' => 'MYW-11', 'label' => 'My activities feed, pagination, dan empty state bekerja'],
                ['id' => 'MYW-12', 'label' => 'Completion ranking hanya tampil bila permission dan urutannya akurat'],
                ['id' => 'MYW-13', 'label' => 'Attachment aktivitas membuka atau mengunduh target yang benar'],
                ['id' => 'MYW-14', 'label' => 'Export aktivitas pribadi menghasilkan file dan audit log'],
            ]],
            ['code' => 'division_workspace', 'title' => 'D. Division dan Workspace', 'cases' => [
                ['id' => 'DIV-01', 'label' => 'Daftar division sesuai scope user'],
                ['id' => 'DIV-02', 'label' => 'Pencarian/pilih division membuka data yang benar'],
                ['id' => 'DIV-03', 'label' => 'Daftar anggota division dapat dilihat sesuai permission'],
                ['id' => 'DIV-04', 'label' => 'User tidak dapat create/edit/delete/manage member division'],
                ['id' => 'DIV-05', 'label' => 'My divisions auto-discovery memilih division pertama yang valid'],
                ['id' => 'WSP-01', 'label' => 'Daftar workspace pada division sesuai scope'],
                ['id' => 'WSP-02', 'label' => 'Search workspace berdasarkan nama/deskripsi'],
                ['id' => 'WSP-03', 'label' => 'Mutasi workspace tersembunyi/ditolak untuk user'],
                ['id' => 'WSP-04', 'label' => 'Workspace di luar scope ditolak termasuk akses URL langsung'],
            ]],
            ['code' => 'campaign', 'title' => 'E. Campaign, detail, analitik, dan collaborator', 'cases' => [
                ['id' => 'CAM-01', 'label' => 'List campaign menampilkan metadata yang benar'],
                ['id' => 'CAM-02', 'label' => 'Search campaign dan counter hasil akurat'],
                ['id' => 'CAM-03', 'label' => 'Refresh campaign memuat data terbaru tanpa duplikasi'],
                ['id' => 'CAM-04', 'label' => 'Create campaign dengan nama, tipe, due date, dan member'],
                ['id' => 'CAM-05', 'label' => 'Validasi create campaign mencegah data kosong/lampau'],
                ['id' => 'CAM-06', 'label' => 'Edit campaign menyimpan perubahan'],
                ['id' => 'CAM-07', 'label' => 'Delete campaign dengan confirm/cancel yang benar'],
                ['id' => 'CAM-08', 'label' => 'Tambah collaborator via nama/email tanpa duplikasi'],
                ['id' => 'CAM-09', 'label' => 'Scope collaborator mengikuti role/division policy'],
                ['id' => 'CAM-10', 'label' => 'Remove collaborator hanya pada target yang dipilih'],
                ['id' => 'CAM-11', 'label' => 'Campaign di luar scope tidak membocorkan data'],
                ['id' => 'CAM-12', 'label' => 'Detail periode, stats, progress, Gantt, health, overdue sesuai permission'],
                ['id' => 'CAM-13', 'label' => 'Endpoint stats/progress/Gantt/overdue/health memiliki loading, error, dan data konsisten'],
            ]],
            ['code' => 'board', 'title' => 'F. Board, column, Kanban/List, dan card search', 'cases' => [
                ['id' => 'BRD-01', 'label' => 'Board memuat seluruh column dan jumlah card benar'],
                ['id' => 'BRD-02', 'label' => 'Switch Kanban dan List mempertahankan data/urutan'],
                ['id' => 'BRD-03', 'label' => 'Create column dengan nama dan warna'],
                ['id' => 'BRD-04', 'label' => 'Edit column menyimpan perubahan'],
                ['id' => 'BRD-05', 'label' => 'Delete column memakai confirmation dan aturan bisnis'],
                ['id' => 'BRD-06', 'label' => 'Reorder column tersimpan; column terkunci tetap terkunci'],
                ['id' => 'BRD-07', 'label' => 'Create card dengan title, due date, priority, assignee'],
                ['id' => 'BRD-08', 'label' => 'Validasi card kosong dan cancel/Escape'],
                ['id' => 'BRD-09', 'label' => 'Move card antar-column/board'],
                ['id' => 'BRD-10', 'label' => 'Reorder card dalam column'],
                ['id' => 'BRD-11', 'label' => 'Search card berdasarkan judul dan counter hasil'],
                ['id' => 'BRD-12', 'label' => 'Search case-insensitive, trim, clear, Escape, dan hasil 0'],
                ['id' => 'BRD-13', 'label' => 'Drag aman/nonaktif saat search aktif'],
                ['id' => 'BRD-14', 'label' => 'Klik card membuka detail yang tepat'],
                ['id' => 'BRD-15', 'label' => 'Board empty/loading/error state'],
                ['id' => 'BRD-16', 'label' => 'Create/update/delete/reorder board refresh dan rollback aman saat request gagal'],
            ]],
            ['code' => 'card', 'title' => 'G. Detail card, task, checklist, attachment, komentar', 'cases' => [
                ['id' => 'CARD-01', 'label' => 'Edit title card dan sinkronisasi ke semua tampilan'],
                ['id' => 'CARD-02', 'label' => 'Edit description dan pending save sebelum modal ditutup'],
                ['id' => 'CARD-03', 'label' => 'Assign/unassign member dengan picker'],
                ['id' => 'CARD-04', 'label' => 'Move card dari detail/mobile status picker'],
                ['id' => 'CARD-05', 'label' => 'Ubah priority low/medium/high/urgent'],
                ['id' => 'CARD-06', 'label' => 'Set/ubah/hapus due date dan status overdue'],
                ['id' => 'CARD-07', 'label' => 'Tambah/complete/edit/reorder/delete task/checklist'],
                ['id' => 'CARD-08', 'label' => 'Tambah/edit/complete/delete subtask'],
                ['id' => 'CARD-09', 'label' => 'Attach/detach/toggle label tanpa duplikasi'],
                ['id' => 'CARD-10', 'label' => 'Attach/detach brand sesuai permission'],
                ['id' => 'CARD-11', 'label' => 'Create/edit/delete komentar sesuai ownership/policy'],
                ['id' => 'CARD-12', 'label' => 'Upload/preview/download/delete brief attachment'],
                ['id' => 'CARD-13', 'label' => 'Upload hasil file/link, metadata, preview/download/delete'],
                ['id' => 'CARD-14', 'label' => 'Pilih/buat template deskripsi hasil sesuai permission'],
                ['id' => 'CARD-15', 'label' => 'Activity timeline dan Load more tidak duplikasi'],
                ['id' => 'CARD-16', 'label' => 'Card detail mobile, Card tools, Back, X, backdrop, dan scroll'],
                ['id' => 'CARD-17', 'label' => 'Delete card mengikuti aturan overdue/permission'],
                ['id' => 'CARD-18', 'label' => 'Archive/restore result attachment dan status aksesnya konsisten'],
            ]],
            ['code' => 'calendar', 'title' => 'H. Calendar dan due date', 'cases' => [
                ['id' => 'CAL-01', 'label' => 'Calendar menampilkan pekerjaan sesuai scope dan tanggal'],
                ['id' => 'CAL-02', 'label' => 'Navigasi bulan/minggu/hari dan Today'],
                ['id' => 'CAL-03', 'label' => 'Event membuka card yang benar'],
                ['id' => 'CAL-04', 'label' => 'Create card dari tanggal calendar bila tersedia'],
                ['id' => 'CAL-05', 'label' => 'Due date/status konsisten Web dan APK'],
            ]],
            ['code' => 'chat', 'title' => 'I. Chat dan komunikasi realtime', 'cases' => [
                ['id' => 'CHAT-01', 'label' => 'Daftar room dan unread count sesuai user'],
                ['id' => 'CHAT-02', 'label' => 'Create direct message room'],
                ['id' => 'CHAT-03', 'label' => 'Kirim pesan satu kali dengan author/time benar'],
                ['id' => 'CHAT-04', 'label' => 'Hapus pesan sendiri; pesan orang lain terlindungi'],
                ['id' => 'CHAT-05', 'label' => 'Read state/unread badge berubah saat room dibuka'],
                ['id' => 'CHAT-06', 'label' => 'Pesan realtime Web ↔ APK tanpa duplikasi'],
                ['id' => 'CHAT-07', 'label' => 'Error/retry saat koneksi kirim pesan terputus'],
                ['id' => 'CHAT-08', 'label' => 'Room detail, message pagination, dan empty state bekerja'],
            ]],
            ['code' => 'notification', 'title' => 'J. Notifikasi', 'cases' => [
                ['id' => 'NOTIF-01', 'label' => 'Bell menampilkan unread count dan notifikasi milik user'],
                ['id' => 'NOTIF-02', 'label' => 'Klik notifikasi menandai read dan membuka target benar'],
                ['id' => 'NOTIF-03', 'label' => 'Mark all as read mengubah semua item user'],
                ['id' => 'NOTIF-04', 'label' => 'Delete hanya menghapus item target'],
                ['id' => 'NOTIF-05', 'label' => 'Notifikasi assignment/comment/chat sinkron Web ↔ APK'],
            ]],
            ['code' => 'account', 'title' => 'K. Profile, avatar, password, dan account', 'cases' => [
                ['id' => 'ACC-01', 'label' => 'Edit profile hanya akun sendiri'],
                ['id' => 'ACC-02', 'label' => 'Update nama/profile dan aturan email HRIS'],
                ['id' => 'ACC-03', 'label' => 'Upload avatar valid dan invalid'],
                ['id' => 'ACC-04', 'label' => 'Ganti password dengan password lama/baru valid'],
                ['id' => 'ACC-05', 'label' => 'Validasi password lama, panjang, dan konfirmasi'],
                ['id' => 'ACC-06', 'label' => 'Logout web dan APK'],
            ]],
            ['code' => 'sync_mobile', 'title' => 'L. Mobile, realtime, dan konsistensi Web ↔ APK', 'depends_on_name' => 'test_platform', 'depends_on_value' => 'Android APK', 'cases' => [
                ['id' => 'SYNC-01', 'label' => 'Entity baru dari web muncul di APK sesuai scope'],
                ['id' => 'SYNC-02', 'label' => 'Perubahan dari APK muncul di web'],
                ['id' => 'SYNC-03', 'label' => 'Event Reverb card/comment/assignment tidak hilang/dobel'],
                ['id' => 'SYNC-04', 'label' => 'Fallback refetch aman saat realtime gagal'],
                ['id' => 'SYNC-05', 'label' => 'Scroll vertikal column APK untuk banyak card'],
                ['id' => 'SYNC-06', 'label' => 'Search card APK dan auto-select status yang memiliki hasil'],
                ['id' => 'SYNC-07', 'label' => 'Install/update APK kandidat demo dan API environment benar'],
            ]],
            ['code' => 'security', 'title' => 'M. Permission, scope, validasi, dan keamanan', 'cases' => [
                ['id' => 'SEC-01', 'label' => 'Menu/route admin Forms, Report, Profile tidak bypass untuk user baseline'],
                ['id' => 'SEC-02', 'label' => 'ID entity di luar scope ditolak server'],
                ['id' => 'SEC-03', 'label' => 'Input XSS, panjang, unicode, URL, dan file invalid aman'],
                ['id' => 'SEC-04', 'label' => 'Permission read-only menolak semua mutasi'],
                ['id' => 'SEC-05', 'label' => 'Resource/komentar/attachment/pesan user lain terlindungi'],
                ['id' => 'SEC-06', 'label' => 'Logout membersihkan token dan data storage'],
            ]],
            ['code' => 'admin', 'title' => 'N. Menu dan fungsi admin/super admin', 'depends_on_name' => 'tested_modules', 'depends_on_value' => self::SCOPE_ADMIN, 'cases' => [
                ['id' => 'ADM-01', 'label' => 'User list, search, detail, activity, dan stats'],
                ['id' => 'ADM-02', 'label' => 'Create/edit/delete user dan role'],
                ['id' => 'ADM-03', 'label' => 'View/update permission tambahan user'],
                ['id' => 'ADM-04', 'label' => 'Reset password user HRIS dan login awal'],
                ['id' => 'ADM-05', 'label' => 'Impersonation/bypass dan audit log'],
                ['id' => 'ADM-06', 'label' => 'Create/edit/delete division'],
                ['id' => 'ADM-07', 'label' => 'Tambah/ubah role/remove anggota division'],
                ['id' => 'ADM-08', 'label' => 'Create/edit/delete workspace'],
                ['id' => 'ADM-09', 'label' => 'CRUD master label'],
                ['id' => 'ADM-10', 'label' => 'CRUD master brand'],
                ['id' => 'ADM-11', 'label' => 'CRUD result description template'],
                ['id' => 'ADM-12', 'label' => 'Global dashboard, system insights, activities, dan ranking'],
            ]],
            ['code' => 'forms', 'title' => 'O. Forms, builder, public response, dan forwarding', 'depends_on_name' => 'tested_modules', 'depends_on_value' => self::SCOPE_FORMS, 'cases' => [
                ['id' => 'FORM-01', 'label' => 'List/create/update/delete form'],
                ['id' => 'FORM-02', 'label' => 'Builder field text/textarea/number/date/file/select/radio/checkbox, required, options'],
                ['id' => 'FORM-03', 'label' => 'Conditional field dan opsi Other'],
                ['id' => 'FORM-04', 'label' => 'Public form validation, submit, dan attachment'],
                ['id' => 'FORM-05', 'label' => 'Response detail, expand, export/preview'],
                ['id' => 'FORM-06', 'label' => 'Assign/forward submission menjadi card'],
                ['id' => 'FORM-07', 'label' => 'Public form index hanya menampilkan form aktif dan slug invalid ditolak'],
            ]],
            ['code' => 'reports', 'title' => 'P. Report dan QC', 'depends_on_name' => 'tested_modules', 'depends_on_value' => self::SCOPE_REPORTS, 'cases' => [
                ['id' => 'RPT-01', 'label' => 'Filter report user/division/workspace/campaign/periode'],
                ['id' => 'RPT-02', 'label' => 'Preview report dan attachment'],
                ['id' => 'RPT-03', 'label' => 'Export PDF/Excel dan secure password'],
                ['id' => 'RPT-04', 'label' => 'QC verification dan activity log'],
                ['id' => 'RPT-05', 'label' => 'Activity logs per user dapat dibuka sesuai scope dan pagination'],
            ]],
            ['code' => 'quality', 'title' => 'Q. Kualitas umum dan usability', 'cases' => [
                ['id' => 'GEN-01', 'label' => 'Responsive layout desktop, tablet, dan mobile'],
                ['id' => 'GEN-02', 'label' => 'Loading, empty, error, retry, dan no-crash state'],
                ['id' => 'GEN-03', 'label' => 'Browser Back, deep link, dan route restore'],
                ['id' => 'GEN-04', 'label' => 'Keyboard focus, touch target, label, dan accessibility dasar'],
            ]],
        ];
    }
}
