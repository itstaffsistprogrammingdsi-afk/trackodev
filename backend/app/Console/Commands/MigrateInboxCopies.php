<?php

namespace App\Console\Commands;

use App\Models\Card;
use App\Services\CrossDivisionMirrorService;
use Illuminate\Console\Command;

/**
 * Pindahkan copy lintas divisi lama (yang terlanjur di Inbox) ke campaign
 * milik assignee yang cocok nama. Dijalankan sekali saat fitur routing
 * by-nama rilis. Selalu mulai dengan --dry-run di dev.
 *
 * Contoh:
 *   php artisan mirror:migrate-inbox-copies --dry-run
 *   php artisan mirror:migrate-inbox-copies --dry-run --division="DKV"
 *   php artisan mirror:migrate-inbox-copies
 */
class MigrateInboxCopies extends Command
{
    protected $signature = 'mirror:migrate-inbox-copies
                            {--dry-run : Tampilkan rencana tanpa mengubah data}
                            {--division= : Batasi pada division tertentu (nama)}
                            {--limit=100 : Maksimal copy diproses}';

    protected $description = 'Pindahkan copy lintas divisi dari Inbox ke campaign milik assignee yang cocok nama';

    public function handle(CrossDivisionMirrorService $mirror): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(1, (int) $this->option('limit'));

        $copies = Card::query()
            ->where('is_cross_division_copy', true)
            ->whereHas('board.campaign', fn ($campaignQuery) => $campaignQuery
                ->where('name', CrossDivisionMirrorService::INBOX_CAMPAIGN_NAME))
            ->when($this->option('division'), fn ($copyQuery, $divisionName) => $copyQuery
                ->whereHas('board.campaign.workspace.division', fn ($divisionQuery) => $divisionQuery
                    ->where('name', 'like', "%{$divisionName}%")))
            ->with(['assignees.divisions:id,name', 'board.campaign.workspace.division'])
            ->limit($limit)
            ->get();

        if ($copies->isEmpty()) {
            $this->info('Tidak ada copy Inbox yang perlu dimigrasi.');

            return self::SUCCESS;
        }

        $rows = [];
        $moved = 0;
        $skipped = 0;

        foreach ($copies as $copy) {
            $assignee = $copy->assignees
                ->sortBy(fn ($user) => $user->divisions->contains('id', $copy->board?->campaign?->workspace?->division_id) ? 0 : 1)
                ->first();

            if (! $assignee) {
                $skipped++;
                $rows[] = [$copy->id, $copy->title, '-', '-', 'SKIP: tanpa assignee'];

                continue;
            }

            $target = $mirror->resolveOwnedCampaign(
                $assignee,
                $copy->board?->campaign?->workspace?->division_id
                    ? (string) $copy->board->campaign->workspace->division_id
                    : null
            );

            if (! $target) {
                $skipped++;
                $rows[] = [$copy->id, $copy->title, $assignee->name, '-', 'SKIP: tidak ada campaign cocok'];

                continue;
            }

            $rows[] = [
                $copy->id,
                $copy->title,
                $assignee->name,
                $target->name,
                $dryRun ? 'RENCANA' : 'DIPINDAHKAN',
            ];

            if ($dryRun) {
                continue;
            }

            try {
                $mirror->backfillMirroredBy($copy);
                $mirror->relocateCopy($copy, $target, $this->laravel['auth']->user() ?? $assignee);
                $moved++;
            } catch (\Throwable $e) {
                $skipped++;
                $this->error("Gagal memindahkan {$copy->id}: {$e->getMessage()}");
            }
        }

        $this->table(['Copy ID', 'Judul', 'Assignee', 'Tujuan', 'Status'], $rows);
        $this->info($dryRun
            ? "Dry-run selesai: {$moved} akan dipindahkan (simulasi), {$skipped} dilewati."
            : "Selesai: {$moved} dipindahkan, {$skipped} dilewati.");

        return self::SUCCESS;
    }
}
