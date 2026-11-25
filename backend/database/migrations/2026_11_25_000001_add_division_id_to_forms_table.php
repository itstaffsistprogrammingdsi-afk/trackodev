<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('forms', function (Blueprint $table) {

            $table->uuid('division_id')
                ->nullable()
                ->after('workspace_id')
                ->index();

            $table->foreign('division_id')
                ->references('id')
                ->on('divisions')
                ->nullOnDelete();

        });

        // Backfill: forms that already belong to a workspace inherit the
        // division of that workspace. The rest stays null ("Umum").
        $rows = DB::table('forms')
            ->join('workspaces', 'workspaces.id', '=', 'forms.workspace_id')
            ->whereNull('forms.division_id')
            ->select('forms.id as form_id', 'workspaces.division_id')
            ->get();

        foreach ($rows as $row) {
            DB::table('forms')
                ->where('id', $row->form_id)
                ->update(['division_id' => $row->division_id]);
        }
    }

    public function down(): void
    {
        Schema::table('forms', function (Blueprint $table) {

            $table->dropForeign([
                'division_id'
            ]);

            $table->dropColumn(
                'division_id'
            );

        });
    }
};
