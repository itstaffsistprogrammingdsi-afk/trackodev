<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ReportDataLoader;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportPdfChunkingTest extends TestCase
{
    use RefreshDatabase;

    public function test_pdf_chunks_split_a_heavy_user_by_card_count_and_keep_numbering(): void
    {
        $this->seed(PermissionSeeder::class);

        $user = User::factory()->create(['name' => 'User Laporan Berat']);
        $user->assignRole(Role::findByName(User::ROLE_USER));

        $division = Division::create(['name' => 'Divisi Laporan Berat', 'slug' => 'divisi-laporan-berat']);
        $division->users()->attach($user->id);

        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'Workspace Laporan']);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'Campaign Laporan',
            'type' => 'group',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);

        foreach (range(1, 65) as $index) {
            $card = Card::create([
                'board_id' => $board->id,
                'campaign_id' => $campaign->id,
                'created_by' => $user->id,
                'title' => 'Card Laporan '.$index,
                'status' => 'in_progress',
            ]);
            $card->assignees()->attach($user->id);
        }

        Sanctum::actingAs($user);

        $request = Request::create('/api/reports/export/pdf', 'GET', ['user_id' => $user->id]);
        $request->setUserResolver(fn () => $user);

        $chunks = app(ReportDataLoader::class)->pdfChunks($request, 30)->values();
        $parts = $chunks->flatMap(fn ($chunk) => $chunk)->values();

        $this->assertCount(3, $chunks);
        $this->assertCount(3, $parts);
        $this->assertSame([30, 30, 5], $parts->map(fn (User $part) => $part->cards->count())->all());
        $this->assertSame(65, $parts->sum(fn (User $part) => $part->cards->count()));
        $this->assertTrue($parts->every(fn (User $part) => $part->report_number === 1));

        foreach ($parts as $part) {
            $html = view('exports.report_pdf', [
                'users' => collect([$part]),
                'totalUsers' => 1,
            ])->render();

            $this->assertStringContainsString('class="col-no text-center">1</td>', $html);
            $this->assertStringContainsString($user->name, $html);
        }
    }

    public function test_pdf_export_succeeds_for_a_user_with_more_cards_than_one_chunk(): void
    {
        $this->seed(PermissionSeeder::class);

        $user = User::factory()->create(['name' => 'User Export Berat']);
        $user->assignRole(Role::findByName(User::ROLE_MANAGER));

        $division = Division::create(['name' => 'Divisi Export Berat', 'slug' => 'divisi-export-berat']);
        $division->users()->attach($user->id);

        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'Workspace Export']);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'Campaign Export',
            'type' => 'group',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);

        foreach (range(1, 45) as $index) {
            $card = Card::create([
                'board_id' => $board->id,
                'campaign_id' => $campaign->id,
                'created_by' => $user->id,
                'title' => 'Card Export '.$index,
                'status' => 'in_progress',
            ]);
            $card->assignees()->attach($user->id);
        }

        Sanctum::actingAs($user);

        $response = $this
            ->withHeader('X-Export-Password', '')
            ->get('/api/reports/export/pdf?user_id='.$user->id.'&division_id='.$division->id);

        $response->assertOk()->assertHeader('X-Export-Encryption', 'NONE');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }
}
