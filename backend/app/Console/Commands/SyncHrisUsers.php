<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\HrisUser;
use App\Services\HrisSyncService;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncHrisUsers extends Command
{
    protected $signature = 'app:sync-hris-users {--full : Perform full sync}';
    protected $description = 'Sync users from HRIS to PM';

    public function handle()
    {
        $service = app(HrisSyncService::class);

        // =========================
        // 🔥 FULL SYNC
        // =========================
        if ($this->option('full')) {
            $this->info('🚀 Mode FULL SYNC');

            $total = HrisUser::count();
            $this->info("Total data: $total");

            $this->output->progressStart($total);

            $success = 0;
            $failed = 0;

            HrisUser::chunk(100, function ($users) use ($service, &$success, &$failed) {
                foreach ($users as $hris) {
                    try {
                        $service->syncToPM($hris);
                        $success++;
                    } catch (Throwable $e) {
                        $failed++;
                        Log::error('SYNC ERROR (FULL)', [
                            'hris_id' => $hris->id,
                            'error' => $e->getMessage()
                        ]);
                    }

                    $this->output->progressAdvance();
                }
            });

            $this->output->progressFinish();

            $this->newLine(2);
            $this->info("✅ Full sync selesai");
            $this->info("✔ Success: $success");
            $this->error("❌ Failed: $failed");

            return;
        }

        // =========================
        // ⚡ INCREMENTAL SYNC
        // =========================
        $lastSync = cache('hris_last_sync', now()->subDay());

        $this->info('⚡ Mode INCREMENTAL');
        $this->info('Last Sync: ' . $lastSync);

        $query = HrisUser::where('updated_at', '>', $lastSync);

        $count = $query->count();

        if ($count === 0) {
            $this->warn('⚠ Tidak ada data berubah');
            return;
        }

        $this->info("Data berubah: $count");

        $this->output->progressStart($count);

        $success = 0;
        $failed = 0;

        $query->orderBy('updated_at')
            ->chunk(100, function ($users) use ($service, &$success, &$failed) {
                foreach ($users as $hris) {
                    try {
                        $service->syncToPM($hris);
                        $success++;
                    } catch (Throwable $e) {
                        $failed++;
                        Log::error('SYNC ERROR (INCREMENTAL)', [
                            'hris_id' => $hris->id,
                            'error' => $e->getMessage()
                        ]);
                    }

                    $this->output->progressAdvance();
                }
            });

        // update last sync
        cache(['hris_last_sync' => now()]);

        $this->output->progressFinish();

        $this->newLine(2);
        $this->info("✅ Incremental sync selesai");
        $this->info("✔ Success: $success");
        $this->error("❌ Failed: $failed");
    }
}