<?php

namespace App\Console\Commands;

use App\Services\HrisSyncService;
use Illuminate\Console\Command;
use Throwable;

class SyncHrisUsers extends Command
{
    protected $signature = 'app:sync-hris-users
        {--full : Opsi kompatibilitas; API selalu mengirim daftar karyawan lengkap}';

    protected $description = 'Mengambil nama dan email karyawan dari API HRIS ke Tracko';

    public function handle(HrisSyncService $service): int
    {
        $this->info('Mengambil data karyawan dari HRIS...');

        try {
            $stats = $service->sync();
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Sinkronisasi HRIS gagal: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->table(
            ['Diterima', 'Dibuat', 'Diperbarui', 'Tetap', 'Dilewati', 'Gagal'],
            [[
                $stats['received'],
                $stats['created'],
                $stats['updated'],
                $stats['unchanged'],
                $stats['skipped'],
                $stats['failed'],
            ]],
        );

        if ($stats['failed'] > 0) {
            $this->warn('Sinkronisasi selesai dengan sebagian data gagal. Periksa log aplikasi.');

            return self::FAILURE;
        }

        $this->info('Sinkronisasi HRIS selesai.');

        return self::SUCCESS;
    }
}
