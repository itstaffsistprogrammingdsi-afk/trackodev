<?php

namespace App\Console\Commands;

use App\Models\Form;
use App\Models\FormField;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class CreateUatPublicForm extends Command
{
    protected $signature = 'app:create-uat-public-form
        {--created-by= : UUID atau email user pemilik form (default: super admin pertama)}';

    protected $description = 'Buat atau perbarui kuesioner UAT user sebagai public form';

    private const SLUG = 'uat-tracko-user';

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

                foreach ($definition['fields'] as $order => $field) {
                    FormField::query()->updateOrCreate(
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
                        ],
                    );
                }

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
        $requested = trim((string) $this->option('created-by'));

        if ($requested !== '') {
            return User::query()
                ->where('id', $requested)
                ->orWhere('email', $requested)
                ->first();
        }

        return User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', User::ROLE_SUPER_ADMIN))
            ->first()
            ?? User::query()->whereHas('roles', fn ($query) => $query->where('name', User::ROLE_ADMIN))->first();
    }

    /**
     * Ringkasan UAT sengaja memakai pilihan status agar pengisi tidak perlu
     * menyalin 106 test case satu per satu. Detail test case tetap tersedia di
     * docs/UAT_USER.md dan dirujuk dari deskripsi form.
     */
    private function definition(): array
    {
        $statusOptions = ['PASS', 'PASS dengan catatan', 'FAIL', 'BLOCKED', 'N/A'];

        return [
            'name' => 'UAT Tracko — Questionnaire & Sign-off',
            'description' => implode("\n", [
                'Terima kasih sudah membantu menguji Tracko.',
                'Isi berdasarkan pengalaman Anda saat mencoba aplikasi Web atau APK. Pilih status untuk setiap area dan lampirkan bukti jika ada kendala.',
                'Satu pengisian mewakili satu sesi pengujian. Estimasi waktu pengisian 8–12 menit.',
            ]),
            'note_content' => 'PASS = berjalan sesuai harapan. PASS dengan catatan = berjalan tetapi ada saran kecil. FAIL = fungsi tidak berjalan. BLOCKED = tidak bisa diuji karena environment/data. Untuk FAIL/BLOCKED, isi detail, severity, dan bukti. Jangan tulis password atau token pada jawaban.',
            'fields' => [
                [
                    'name' => 'tester_name',
                    'label' => 'Nama tester',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'tester_email',
                    'label' => 'Email tester',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'tester_role',
                    'label' => 'Role saat menguji',
                    'type' => 'select',
                    'options' => ['User reguler', 'Admin', 'Super Admin', 'Lainnya'],
                    'is_required' => true,
                ],
                [
                    'name' => 'test_platform',
                    'label' => 'Platform yang diuji (boleh pilih lebih dari satu)',
                    'type' => 'checkbox',
                    'options' => ['Web desktop', 'Web mobile browser', 'Android APK'],
                    'is_required' => true,
                ],
                [
                    'name' => 'app_version',
                    'label' => 'Versi aplikasi/APK dan browser (contoh: APK v1.0.4, Chrome 140)',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'test_date',
                    'label' => 'Tanggal pengujian',
                    'type' => 'date',
                    'is_required' => true,
                ],
                [
                    'name' => 'test_scope',
                    'label' => 'Scope data yang diuji (division / workspace / campaign)',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'execution_mode',
                    'label' => 'Jenis pengujian',
                    'type' => 'select',
                    'options' => ['End-to-end UAT', 'Regression setelah perbaikan', 'Smoke test', 'Exploratory test'],
                    'is_required' => true,
                ],
                [
                    'name' => 'device_model',
                    'label' => 'Device/laptop yang digunakan (contoh: Redmi Note 14 / Dell Latitude)',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'os_version',
                    'label' => 'OS dan versi (contoh: Android 15 / Windows 11)',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'browser_version',
                    'label' => 'Browser dan versi (isi N/A jika hanya menguji APK)',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'network_type',
                    'label' => 'Koneksi saat menguji',
                    'type' => 'select',
                    'options' => ['Wi-Fi kantor', 'Wi-Fi rumah', 'Mobile data', 'VPN', 'Lainnya'],
                    'is_required' => true,
                ],
                [
                    'name' => 'data_preparation',
                    'label' => 'Kesiapan data uji',
                    'type' => 'select',
                    'options' => ['Data uji lengkap dan valid', 'Sebagian data tersedia', 'Data uji tidak tersedia'],
                    'is_required' => true,
                ],
                [
                    'name' => 'critical_flows',
                    'label' => 'Alur kritis yang benar-benar dijalankan (boleh pilih lebih dari satu)',
                    'type' => 'checkbox',
                    'options' => [
                        'Login dan logout',
                        'Buat campaign/card',
                        'Pindahkan card antar status',
                        'Search card',
                        'Scroll board di APK',
                        'Attachment/komentar',
                        'Web ↔ APK sync',
                        'Permission/unauthorized access',
                    ],
                    'is_required' => true,
                ],
                ...array_map(
                    static fn (string $key, string $label): array => [
                        'name' => $key,
                        'label' => $label,
                        'type' => 'select',
                        'options' => $statusOptions,
                        'is_required' => true,
                    ],
                    [
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
                    ],
                    [
                        'AUTH-01..07 — Login, session, dan logout',
                        'MYW-01..07 — My Work / ringkasan pekerjaan',
                        'DIV-01..04 + WSP-01..04 — Division dan Workspace',
                        'CAM-01..12 — Campaign dan collaborator',
                        'BRD-01..15 — Board, column, card, dan perpindahan status',
                        'BRD-11..14 + SYNC-05..06 — Search card dan scroll board di mobile',
                        'CARD-01..17 — Detail card, task, checklist, attachment, komentar',
                        'CAL-01..05 — Calendar dan due date',
                        'CHAT-01..07 — Chat dan pesan realtime',
                        'NOTIF-01..05 — Notifikasi',
                        'ACC-01..06 — Profil, avatar, dan perubahan password',
                        'SYNC-01..07 — Konsistensi Web ↔ APK / realtime sync',
                        'SEC-01..06 — Pembatasan akses dan keamanan data',
                    ],
                ),
                [
                    'name' => 'data_integrity_status',
                    'label' => 'Akurasi dan konsistensi data (nama, status, assignee, due date, jumlah card)',
                    'type' => 'select',
                    'options' => $statusOptions,
                    'is_required' => true,
                ],
                [
                    'name' => 'performance_status',
                    'label' => 'Performa yang dirasakan saat memuat halaman atau menyimpan perubahan',
                    'type' => 'select',
                    'options' => ['Cepat (< 3 detik)', 'Cukup (3–5 detik)', 'Lambat (> 5 detik)', 'Tidak dapat diukur'],
                    'is_required' => true,
                ],
                [
                    'name' => 'recovery_status',
                    'label' => 'Pemulihan setelah error/koneksi terputus (retry, refresh, dan state data)',
                    'type' => 'select',
                    'options' => $statusOptions,
                    'is_required' => true,
                ],
                [
                    'name' => 'defect_count',
                    'label' => 'Perkiraan jumlah defect yang ditemukan pada sesi ini (isi 0 jika tidak ada)',
                    'type' => 'number',
                    'is_required' => true,
                ],
                [
                    'name' => 'defect_severity',
                    'label' => 'Severity defect tertinggi pada sesi ini',
                    'type' => 'select',
                    'options' => ['Tidak ada defect', 'P0 — Blocker/kritis', 'P1 — Tinggi', 'P2 — Sedang', 'P3 — Rendah'],
                    'is_required' => true,
                ],
                [
                    'name' => 'reproducibility',
                    'label' => 'Jika ada defect, seberapa mudah direproduksi?',
                    'type' => 'select',
                    'options' => ['Selalu terjadi', 'Kadang terjadi', 'Tidak dapat direproduksi', 'N/A — tidak ada defect'],
                    'is_required' => true,
                ],
                [
                    'name' => 'overall_rating',
                    'label' => 'Seberapa mudah Tracko digunakan secara keseluruhan?',
                    'type' => 'select',
                    'options' => [
                        '5 — Sangat mudah',
                        '4 — Mudah',
                        '3 — Cukup',
                        '2 — Sulit',
                        '1 — Sangat sulit',
                    ],
                    'is_required' => true,
                ],
                [
                    'name' => 'issue_details',
                    'label' => 'Jika ada FAIL/BLOCKED, jelaskan menu, langkah, hasil aktual, dan bukti/link screenshot (jangan sertakan password/token)',
                    'type' => 'textarea',
                    'is_required' => false,
                ],
                [
                    'name' => 'evidence_file',
                    'label' => 'Lampiran bukti (opsional: screenshot/video singkat/log tanpa data sensitif)',
                    'type' => 'file',
                    'is_required' => false,
                ],
                [
                    'name' => 'evidence_url',
                    'label' => 'Link bukti tambahan (opsional)',
                    'type' => 'text',
                    'is_required' => false,
                ],
                [
                    'name' => 'improvement_suggestions',
                    'label' => 'Saran perbaikan atau fitur yang paling membantu',
                    'type' => 'textarea',
                    'is_required' => false,
                ],
                [
                    'name' => 'uat_decision',
                    'label' => 'Keputusan UAT dari sisi Anda',
                    'type' => 'radio',
                    'options' => ['LULUS', 'LULUS DENGAN CATATAN', 'BELUM LULUS'],
                    'is_required' => true,
                ],
                [
                    'name' => 'signoff_name',
                    'label' => 'Nama untuk sign-off/persetujuan',
                    'type' => 'text',
                    'is_required' => true,
                ],
                [
                    'name' => 'signoff_confirmation',
                    'label' => 'Konfirmasi tester',
                    'type' => 'checkbox',
                    'options' => ['Saya mengisi berdasarkan pengujian nyata dan menyetujui hasil ini ditinjau oleh tim Tracko.'],
                    'is_required' => true,
                ],
            ],
        ];
    }
}
