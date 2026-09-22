<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Warna default board per tipe workflow.
     *
     * Sebelumnya semua board bawaan campaign memakai satu warna (#6366f1),
     * sehingga grafik "Distribusi Kolom Board" di dashboard tampil monokrom.
     * Backfill ini HANYA menyentuh board yang masih memakai warna default
     * tersebut; board yang warnanya sudah disesuaikan user tidak diubah.
     */
    private const DEFAULT_COLOR = '#6366f1';

    /** @var array<string, string> */
    private const TYPE_COLORS = [
        'request' => '#f59e0b',
        'todo' => '#0ea5e9',
        'progress' => '#6366f1',
        'done' => '#10b981',
    ];

    /** Fallback untuk board lama yang `type`-nya kosong tapi namanya jelas. */
    /** @var array<string, string> */
    private const NAME_TO_TYPE = [
        'by request' => 'request',
        'todo' => 'todo',
        'progress' => 'progress',
        'done' => 'done',
    ];

    public function up(): void
    {
        foreach (self::TYPE_COLORS as $type => $color) {
            DB::table('boards')
                ->whereRaw('LOWER(type) = ?', [$type])
                ->whereRaw('LOWER(color) = ?', [self::DEFAULT_COLOR])
                ->update(['color' => $color]);
        }

        foreach (self::NAME_TO_TYPE as $name => $type) {
            DB::table('boards')
                ->whereNull('type')
                ->whereRaw('LOWER(TRIM(name)) = ?', [$name])
                ->whereRaw('LOWER(color) = ?', [self::DEFAULT_COLOR])
                ->update(['color' => self::TYPE_COLORS[$type]]);
        }
    }

    public function down(): void
    {
        // Sengaja tidak di-rollback: mengembalikan warna bisa menimpa
        // penyesuaian warna yang dilakukan user setelah migrasi ini.
    }
};
