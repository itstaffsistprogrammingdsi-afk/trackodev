<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Label;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MasterNameMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_merges_case_and_whitespace_duplicates_without_losing_card_relations(): void
    {
        $user = User::factory()->create();
        $division = Division::create([
            'name' => 'Migration Division',
            'slug' => 'migration-division',
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Migration Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'Migration Campaign',
            'type' => 'group',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'To Do',
            'type' => 'todo',
            'order' => 1,
        ]);
        $firstCard = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'First card',
            'order' => 1,
        ]);
        $secondCard = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Second card',
            'order' => 2,
        ]);

        $canonicalBrand = Brand::create([
            'campaign_id' => $campaign->id,
            'name' => 'Acnada',
        ]);
        $duplicateBrand = Brand::create([
            'campaign_id' => $campaign->id,
            'name' => ' acNADA ',
        ]);
        DB::table('brands')->where('id', $canonicalBrand->id)->update(['created_at' => now()->subMinute()]);
        $firstCard->brands()->attach($canonicalBrand->id);
        $secondCard->brands()->attach($duplicateBrand->id);
        $secondCard->update(['brand_id' => $duplicateBrand->id]);

        $canonicalLabel = Label::create([
            'name' => 'Urgent',
            'slug' => 'urgent',
        ]);
        $duplicateLabel = Label::create([
            'name' => ' urgent ',
            'slug' => 'urgent-duplicate',
        ]);
        DB::table('labels')->where('id', $canonicalLabel->id)->update(['created_at' => now()->subMinute()]);
        $firstCard->labels()->attach($canonicalLabel->id);
        $secondCard->labels()->attach($duplicateLabel->id);

        $migration = require database_path('migrations/2026_09_02_000001_add_unique_master_names.php');
        $migration->up();

        $this->assertSame(1, Brand::query()
            ->where('campaign_id', $campaign->id)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['acnada'])
            ->count());
        $this->assertDatabaseHas('brand_card', [
            'card_id' => $firstCard->id,
            'brand_id' => $canonicalBrand->id,
        ]);
        $this->assertDatabaseHas('brand_card', [
            'card_id' => $secondCard->id,
            'brand_id' => $canonicalBrand->id,
        ]);
        $this->assertSame($canonicalBrand->id, $secondCard->fresh()->brand_id);
        $this->assertDatabaseMissing('brands', ['id' => $duplicateBrand->id]);

        $this->assertSame(1, Label::query()
            ->whereRaw('LOWER(TRIM(name)) = ?', ['urgent'])
            ->count());
        $this->assertDatabaseHas('card_label', [
            'card_id' => $firstCard->id,
            'label_id' => $canonicalLabel->id,
        ]);
        $this->assertDatabaseHas('card_label', [
            'card_id' => $secondCard->id,
            'label_id' => $canonicalLabel->id,
        ]);
        $this->assertDatabaseMissing('labels', ['id' => $duplicateLabel->id]);
    }
}
