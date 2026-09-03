<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master labels are global, while brands belong to a campaign. The
     * database constraints mirror those scopes and protect against exact
     * duplicates even when two requests race each other. API validation also
     * performs case-insensitive checks for databases with case-sensitive
     * collations.
     */
    public function up(): void
    {
        $this->mergeDuplicateLabels();
        $this->mergeDuplicateBrands();

        // hasIndex() also makes a retry safe on databases whose DDL is not
        // transactional and may have kept the first index after a later step
        // failed.
        if (! Schema::hasIndex('labels', 'labels_name_unique', 'unique')) {
            Schema::table('labels', function (Blueprint $table): void {
                $table->unique('name', 'labels_name_unique');
            });
        }

        if (! Schema::hasIndex('brands', 'brands_campaign_name_unique', 'unique')) {
            Schema::table('brands', function (Blueprint $table): void {
                $table->unique(['campaign_id', 'name'], 'brands_campaign_name_unique');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('labels', 'labels_name_unique', 'unique')) {
            Schema::table('labels', function (Blueprint $table): void {
                $table->dropUnique('labels_name_unique');
            });
        }

        if (Schema::hasIndex('brands', 'brands_campaign_name_unique', 'unique')) {
            Schema::table('brands', function (Blueprint $table): void {
                $table->dropUnique('brands_campaign_name_unique');
            });
        }
    }

    /**
     * Labels are global. Preserve the oldest record as the canonical label,
     * move every card relation to it, and remove only the redundant masters.
     */
    private function mergeDuplicateLabels(): void
    {
        $groups = DB::table('labels')
            ->selectRaw('LOWER(TRIM(name)) AS normalized_name')
            ->groupByRaw('LOWER(TRIM(name))')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $group) {
            $labels = DB::table('labels')
                ->whereRaw('LOWER(TRIM(name)) = ?', [$group->normalized_name])
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();
            $canonical = $labels->first();

            if (! $canonical) {
                continue;
            }

            foreach ($labels->skip(1) as $duplicate) {
                DB::table('card_label')
                    ->where('label_id', $duplicate->id)
                    ->pluck('card_id')
                    ->each(function (string $cardId) use ($canonical): void {
                        DB::table('card_label')->updateOrInsert([
                            'card_id' => $cardId,
                            'label_id' => $canonical->id,
                        ]);
                    });

                DB::table('card_label')->where('label_id', $duplicate->id)->delete();
                DB::table('labels')->where('id', $duplicate->id)->delete();
            }

            DB::table('labels')->where('id', $canonical->id)->update([
                'name' => trim($canonical->name),
            ]);
        }
    }

    /**
     * Brands are unique inside a campaign. Migrate both the active pivot
     * relation and the legacy cards.brand_id foreign key before deleting a
     * duplicate master.
     */
    private function mergeDuplicateBrands(): void
    {
        $groups = DB::table('brands')
            ->select('campaign_id')
            ->selectRaw('LOWER(TRIM(name)) AS normalized_name')
            ->groupBy('campaign_id')
            ->groupByRaw('LOWER(TRIM(name))')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $group) {
            $brands = DB::table('brands')
                ->where('campaign_id', $group->campaign_id)
                ->whereRaw('LOWER(TRIM(name)) = ?', [$group->normalized_name])
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();
            $canonical = $brands->first();

            if (! $canonical) {
                continue;
            }

            foreach ($brands->skip(1) as $duplicate) {
                DB::table('brand_card')
                    ->where('brand_id', $duplicate->id)
                    ->pluck('card_id')
                    ->each(function (string $cardId) use ($canonical): void {
                        DB::table('brand_card')->updateOrInsert([
                            'card_id' => $cardId,
                            'brand_id' => $canonical->id,
                        ]);
                    });

                DB::table('brand_card')->where('brand_id', $duplicate->id)->delete();
                DB::table('cards')->where('brand_id', $duplicate->id)->update([
                    'brand_id' => $canonical->id,
                ]);
                DB::table('brands')->where('id', $duplicate->id)->delete();
            }

            DB::table('brands')->where('id', $canonical->id)->update([
                'name' => trim($canonical->name),
            ]);
        }
    }
};
