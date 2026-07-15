<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder khusus untuk membuat data dummy yang dipakai mencoba
 * fitur "Export Laporan" (Harian / Bulanan / Tahunan, Excel & PDF)
 * di halaman My Work.
 *
 * Cara pakai:
 *   php artisan db:seed --class=MyWorkExportSeeder
 *
 * Aman dijalankan berkali-kali — data lama bertanda "[Export Test]"
 * akan dihapus otomatis di awal sebelum data baru dibuat.
 *
 * CATATAN ASUMSI (sesuaikan jika berbeda dengan project Anda):
 * - Card punya kolom: title, status, board_id, due_date, completed_at.
 * - Card punya relasi many-to-many assignees() (dipakai juga di
 *   MyActivityController@export).
 * - CardAttachment punya kolom: card_id, uploaded_by, attachment_type,
 *   file_name, file_type, file_size, file_url, link_url.
 * - ActivityLog punya kolom: user_id, action, description, entity_type,
 *   entity_id, meta.
 * - Minimal ada 1 baris di tabel `boards`. Kalau belum ada, buat dulu
 *   1 board manual sebelum menjalankan seeder ini.
 */
class MyWorkExportSeeder extends Seeder
{
    private const TAG = '[Export Test]';

    public function run(): void
    {
        $user = $this->resolveTestUser();
        $board = $this->resolveTestBoard();

        if (! $user || ! $board) {
            return;
        }

        $this->clearPreviousTestData();

        foreach ($this->testPeriods() as $period) {
            $card = $this->createCompletedCard($board, $user, $period);

            if (! $card) {
                continue;
            }

            $this->assignUserToCard($card, $user);
            $this->createActivitiesForCard($user, $card, $period);
            $this->createAttachmentsForCard($user, $card, $period);
        }

        $this->printSummary($user);
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve User & Board
    |--------------------------------------------------------------------------
    */

    private function resolveTestUser(): ?User
    {
        $user = User::first();

        if ($user) {
            return $user;
        }

        if (! method_exists(User::class, 'factory')) {
            $this->command?->error(
                'Tidak ada user di database dan User::factory() tidak tersedia. '
                . 'Buat user terlebih dahulu sebelum menjalankan seeder ini.'
            );

            return null;
        }

        return User::factory()->create([
            'name' => 'Export Tester',
            'email' => 'export.tester@example.com',
        ]);
    }

    private function resolveTestBoard(): ?Board
    {
        $board = Board::first();

        if (! $board) {
            $this->command?->error(
                'Tidak ada Board di database. Buat minimal 1 board terlebih '
                . 'dahulu (lewat aplikasi/seeder lain), lalu jalankan ulang seeder ini.'
            );
        }

        return $board;
    }

    /*
    |--------------------------------------------------------------------------
    | Cleanup data test sebelumnya (biar seeder aman dijalankan berkali-kali)
    |--------------------------------------------------------------------------
    */

    private function clearPreviousTestData(): void
    {
        $oldCardIds = Card::where('title', 'like', self::TAG . '%')->pluck('id');

        if ($oldCardIds->isNotEmpty()) {
            CardAttachment::whereIn('card_id', $oldCardIds)->delete();

            // Asumsi nama tabel pivot assignees mengikuti konvensi Laravel
            // (alfabetis: card_user). Sesuaikan nama tabelnya kalau berbeda,
            // atau abaikan error di bawah — tidak wajib untuk fitur export,
            // hanya untuk kebersihan data dummy.
            try {
                DB::table('card_user')
                    ->whereIn('card_id', $oldCardIds)
                    ->delete();
            } catch (\Throwable $e) {
                // Nama tabel pivot berbeda di project ini — aman diabaikan.
            }
        }

        ActivityLog::where('description', 'like', self::TAG . '%')->delete();
        Card::whereIn('id', $oldCardIds)->delete();
    }

    /*
    |--------------------------------------------------------------------------
    | Titik-titik tanggal dummy
    |--------------------------------------------------------------------------
    | Disebar sengaja supaya ketiga mode export (harian, bulanan, tahunan)
    | sama-sama punya data untuk dicoba, termasuk periode "tahun lalu" agar
    | filter tahun juga bisa diuji dengan hasil yang berbeda.
    */

    private function testPeriods(): array
    {
        $now = Carbon::now();

        return [
            ['label' => 'Hari ini',        'date' => $now->copy()],
            ['label' => 'Kemarin',          'date' => $now->copy()->subDay()],
            ['label' => '3 hari lalu',      'date' => $now->copy()->subDays(3)],
            ['label' => 'Awal bulan ini',   'date' => $now->copy()->startOfMonth()->addDays(2)],
            ['label' => 'Bulan lalu',       'date' => $now->copy()->subMonthNoOverflow()],
            ['label' => '2 bulan lalu',     'date' => $now->copy()->subMonthsNoOverflow(2)],
            ['label' => 'Awal tahun ini',   'date' => $now->copy()->startOfYear()->addDays(10)],
            ['label' => 'Tahun lalu',       'date' => $now->copy()->subYear()],
            ['label' => '2 tahun lalu',     'date' => $now->copy()->subYears(2)],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Card selesai (untuk sheet "Task Selesai")
    |--------------------------------------------------------------------------
    */

private function createCompletedCard(
    Board $board,
    User $user,
    array $period
): ?Card
{
    /** @var Carbon $date */
    $date = $period['date'];

    try {
$card = Card::create([
    'board_id' => $board->id,

    'created_by' => $user->id,

    'title' => self::TAG . ' Task selesai - ' . $period['label'],
    'description' => 'Dummy data untuk testing export My Work.',
    'priority' => 'medium',
    'status' => 'completed',
    'due_date' => $date->copy()->subDays(2),
    'completed_at' => $date,
    'order' => 0,
    'due_reminder_stage' => 'none',
]);
    } catch (\Throwable $e) {

        $this->command?->error($e->getMessage());

        return null;
    }

    $card->forceFill([
        'created_at' => $date->copy()->subDays(3),
        'updated_at' => $date,
    ])->save();

    return $card;
}

    private function assignUserToCard(Card $card, User $user): void
    {
        // Asumsi: Card punya relasi many-to-many assignees(), sama seperti
        // yang dipakai di MyActivityController@export. Kalau di project
        // Anda beda (mis. kolom assigned_to), sesuaikan baris ini.
        if (method_exists($card, 'assignees')) {
            $card->assignees()->syncWithoutDetaching([$user->id]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Activity log (untuk sheet "Log Aktivitas")
    |--------------------------------------------------------------------------
    */

    private function createActivitiesForCard(User $user, Card $card, array $period): void
    {
        /** @var Carbon $date */
        $date = $period['date'];

        $entries = [
            [
                'action' => 'created',
                'description' => self::TAG . ' Membuat task "' . $card->title . '"',
                'created_at' => $date->copy()->subHours(3),
            ],
            [
                'action' => 'updated',
                'description' => self::TAG . ' Mengubah detail task "' . $card->title . '"',
                'created_at' => $date->copy()->subHours(1),
            ],
            [
                'action' => 'moved',
                'description' => self::TAG . ' Memindahkan task "' . $card->title . '" ke Done',
                'created_at' => $date->copy()->subMinutes(30),
            ],
        ];

        foreach ($entries as $entry) {
            try {
                $activity = ActivityLog::create([
                    'user_id' => $user->id,
                    'action' => $entry['action'],
                    'description' => $entry['description'],
                    'entity_type' => 'card',
                    'entity_id' => $card->id,
                    'meta' => ['card_id' => $card->id],
                ]);
            } catch (\Throwable $e) {
                $this->command?->error(
                    'Gagal membuat ActivityLog dummy: ' . $e->getMessage()
                );

                continue;
            }

            $activity->forceFill([
                'created_at' => $entry['created_at'],
                'updated_at' => $entry['created_at'],
            ])->save();
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Attachment (untuk sheet "Attachment")
    |--------------------------------------------------------------------------
    */

private function createAttachmentsForCard(User $user, Card $card, array $period): void
{
    /** @var Carbon $date */
    $date = $period['date'];

    try {

        // Dummy file
        $file = CardAttachment::create([
            'card_id' => $card->id,
            'uploaded_by' => $user->id,

            'attachment_type' => 'file',

            'file_name' => self::TAG . " laporan-{$card->id}.pdf",

            // FIX
            'file_path' => "dummy/laporan-{$card->id}.pdf",

            'file_type' => 'application/pdf',

            'file_size' => random_int(100000, 800000),
        ]);

        $file->forceFill([
            'created_at' => $date,
            'updated_at' => $date,
        ])->save();

        // Dummy link
        $link = CardAttachment::create([
            'card_id' => $card->id,
            'uploaded_by' => $user->id,

            'attachment_type' => 'link',

            'file_name' => self::TAG . " Referensi {$card->id}",

            'link_url' => "https://example.com/reference/{$card->id}",
        ]);

        $link->forceFill([
            'created_at' => $date->copy()->addMinutes(5),
            'updated_at' => $date->copy()->addMinutes(5),
        ])->save();

    } catch (\Throwable $e) {

        $this->command?->error(
            'Gagal membuat CardAttachment dummy: ' .
            $e->getMessage()
        );
    }
}

    /*
    |--------------------------------------------------------------------------
    | Ringkasan & contoh URL untuk langsung dicoba
    |--------------------------------------------------------------------------
    */

    private function printSummary(User $user): void
    {
        $now = Carbon::now();

        $this->command?->info('');
        $this->command?->info('Data dummy export My Work berhasil dibuat untuk: ' . $user->email);
        $this->command?->info('Login sebagai user tersebut, lalu coba endpoint berikut:');
        $this->command?->info('');
        $this->command?->line('  Harian (xlsx) : GET /api/my-activities/export?type=daily&date=' . $now->format('Y-m-d') . '&format=xlsx');
        $this->command?->line('  Harian (pdf)  : GET /api/my-activities/export?type=daily&date=' . $now->format('Y-m-d') . '&format=pdf');
        $this->command?->line('  Bulanan (xlsx): GET /api/my-activities/export?type=monthly&month=' . $now->month . '&year=' . $now->year . '&format=xlsx');
        $this->command?->line('  Bulanan (pdf) : GET /api/my-activities/export?type=monthly&month=' . $now->month . '&year=' . $now->year . '&format=pdf');
        $this->command?->line('  Tahunan (xlsx): GET /api/my-activities/export?type=yearly&year=' . $now->year . '&format=xlsx');
        $this->command?->line('  Tahunan (pdf) : GET /api/my-activities/export?type=yearly&year=' . ($now->year - 1) . '&format=pdf  (data tahun lalu)');
        $this->command?->info('');
    }
}
