<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardComment;
use App\Models\Division;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\ClientDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_complete_and_idempotent_client_demo_dataset(): void
    {
        $this->seed(ClientDemoSeeder::class);

        $this->assertDemoCounts();

        $admin = User::where('email', 'demo.admin.dm@tracko.test')->firstOrFail();
        $this->assertTrue($admin->hasRole('admin'));
        $this->assertSame(
            ['Digital Marketing Demo'],
            $admin->divisions()->pluck('name')->all(),
        );

        $superAdmin = User::where('email', 'demo.superadmin@tracko.test')->firstOrFail();
        $this->assertTrue($superAdmin->hasRole('super_admin'));

        $this->seed(ClientDemoSeeder::class);

        $this->assertDemoCounts();
    }

    private function assertDemoCounts(): void
    {
        $this->assertSame(10, User::where('email', 'like', 'demo.%@tracko.test')->count());
        $this->assertSame(3, Division::where('slug', 'like', 'demo-%')->count());
        $this->assertSame(3, Workspace::whereHas('division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(6, Campaign::whereHas('workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(30, Board::whereHas('campaign.workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(60, Card::whereHas('board.campaign.workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(180, Task::whereHas('card.board.campaign.workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(120, CardComment::whereHas('card.board.campaign.workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(36, CardAttachment::whereHas('card.board.campaign.workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->count());
        $this->assertSame(18, CardAttachment::whereHas('card.board.campaign.workspace.division', fn ($query) => $query->where('slug', 'like', 'demo-%'))->whereNotNull('quantity')->whereNull('qc_at')->count());
    }
}
