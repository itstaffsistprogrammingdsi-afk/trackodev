<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('result_description_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });

        $now = now();

        $templateNames = collect(['Foto', 'Video', 'Halaman'])
            ->merge(
                DB::table('card_attachments')
                    ->whereNotNull('result_description')
                    ->pluck('result_description')
            )
            ->map(fn (string $name) => trim($name))
            ->filter()
            ->unique(fn (string $name) => mb_strtolower($name))
            ->values();

        DB::table('result_description_templates')->insert(
            $templateNames
                ->map(fn (string $name) => [
                    'id' => (string) Str::uuid(),
                    'name' => $name,
                    'created_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
                ->all()
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('result_description_templates');
    }
};
