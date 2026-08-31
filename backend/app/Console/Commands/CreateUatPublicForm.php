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
            'name' => 'UAT Tracko — Feedback Pengguna',
            'description' => implode("\n", [
                'Terima kasih sudah membantu menguji Tracko.',
                'Isi berdasarkan pengalaman Anda saat mencoba aplikasi Web atau APK. Pilih status untuk setiap area, lalu tuliskan detail masalah jika ada.',
                'Gunakan data uji yang diberikan tim QA. Estimasi waktu pengisian 5–10 menit.',
            ]),
            'note_content' => 'PASS = berjalan sesuai harapan. PASS dengan catatan = berjalan tetapi ada saran kecil. FAIL = fungsi tidak berjalan. BLOCKED = tidak bisa diuji karena environment/data. Jangan tulis password atau token pada jawaban.',
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
                        '01 — Login, session, dan logout',
                        '02 — My Work / ringkasan pekerjaan',
                        '03 — Division dan Workspace',
                        '04 — Campaign dan collaborator',
                        '05 — Board, column, card, dan perpindahan status',
                        '06 — Search card dan scroll board di mobile',
                        '07 — Detail card, task, checklist, attachment, komentar',
                        '08 — Calendar dan due date',
                        '09 — Chat dan pesan realtime',
                        '10 — Notifikasi',
                        '11 — Profil, avatar, dan perubahan password',
                        '12 — Konsistensi Web ↔ APK / realtime sync',
                        '13 — Pembatasan akses dan keamanan data',
                    ],
                ),
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
            ],
        ];
    }
}
