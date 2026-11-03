<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AiAssistantTest extends TestCase
{
    use RefreshDatabase;

    private array $gatewayBody = ['choices' => [['message' => ['content' => 'Saran pekerjaan.']]]];

    private int $gatewayStatus = 200;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ai.enabled' => true, 'ai.model' => 'test/model', 'ai.base_url' => 'http://localhost:20128/v1', 'ai.api_key' => 'test-secret']);
        Http::preventStrayRequests();
        Http::fake(['localhost:20128/*' => fn () => Http::response($this->gatewayBody, $this->gatewayStatus)]);
    }

    public function test_authentication_and_disabled_status(): void
    {
        $this->postJson('/api/ai/messages', ['message' => 'Halo'])->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        config(['ai.enabled' => false]);
        $this->getJson('/api/ai/status')->assertOk()->assertJsonPath('data.available', false)->assertJsonMissing(['api_key' => 'test-secret']);
        $this->postJson('/api/ai/messages', ['message' => 'Halo'])->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_status_reports_missing_gateway_key_without_exposing_secrets(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/ai/status')->assertOk()
            ->assertJsonPath('data.gateway_key_configured', true)
            ->assertDontSee('test-secret');
        config(['ai.api_key' => '']);
        $this->getJson('/api/ai/status')->assertOk()
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.gateway_key_configured', false);
        Http::assertNothingSent();
    }

    public function test_system_prompt_restricts_scope_to_the_tracko_system(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/ai/messages', ['message' => 'Halo'])->assertOk();
        Http::assertSent(function ($request) {
            $system = $request['messages'][0]['content'] ?? '';

            return $request['messages'][0]['role'] === 'system'
                && str_contains($system, 'Ruang lingkup Anda hanya sistem Tracko')
                && str_contains($system, 'Maaf, saya hanya dapat membantu hal-hal terkait Tracko')
                && str_contains($system, 'tidak memiliki akses ke sistem atau data lain');
        });
    }

    public function test_workspace_proposal_is_approved_and_executed_through_mcp(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole(User::ROLE_ADMIN);
        $division = Division::create(['name' => 'Operasional', 'slug' => 'operasional-'.str()->random(8)]);
        $division->users()->attach($admin->id, ['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->gatewayBody = ['choices' => [['message' => [
            'content' => 'Saya siapkan proposal workspace.',
            'tool_calls' => [[
                'type' => 'function',
                'function' => [
                    'name' => 'propose_tracko_action',
                    'arguments' => json_encode([
                        'operation' => 'create_workspace',
                        'title' => 'Operasional IT',
                        'description' => 'Workspace untuk tim IT',
                    ]),
                ],
            ]],
        ]]]];

        $response = $this->postJson('/api/ai/messages', [
            'message' => 'buatkan workspace baru : operasional IT',
            'division_id' => $division->id,
        ])->assertOk()->assertJsonPath('data.proposal.operation', 'create_workspace')
            ->assertJsonPath('data.proposal.target.id', $division->id);

        $this->assertDatabaseMissing('workspaces', ['name' => 'Operasional IT']);

        $this->postJson('/api/ai/proposals/'.$response->json('data.proposal.id').'/approve')
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('workspaces', ['name' => 'Operasional IT', 'division_id' => $division->id]);
    }

    public function test_campaign_and_board_proposals_execute_through_mcp(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole(User::ROLE_ADMIN);
        $division = Division::create(['name' => 'Operasional', 'slug' => 'operasional-'.str()->random(8)]);
        $division->users()->attach($admin->id, ['role' => 'admin']);
        $workspace = $division->workspaces()->create(['name' => 'Workspace IT']);
        Sanctum::actingAs($admin);

        $this->gatewayBody = ['choices' => [['message' => [
            'content' => 'Saya siapkan proposal campaign.',
            'tool_calls' => [[
                'type' => 'function',
                'function' => [
                    'name' => 'propose_tracko_action',
                    'arguments' => json_encode([
                        'operation' => 'create_campaign',
                        'title' => 'Campaign Operasional',
                        'type' => 'group',
                    ]),
                ],
            ]],
        ]]]];

        $campaignProposal = $this->postJson('/api/ai/messages', [
            'message' => 'buatkan campaign Operasional',
            'workspace_id' => $workspace->id,
        ])->assertOk()->assertJsonPath('data.proposal.operation', 'create_campaign')->json('data.proposal');

        $this->postJson('/api/ai/proposals/'.$campaignProposal['id'].'/approve')->assertOk();
        $campaign = Campaign::query()->where('name', 'Campaign Operasional')->firstOrFail();

        $this->gatewayBody = ['choices' => [['message' => [
            'content' => 'Saya siapkan proposal board.',
            'tool_calls' => [[
                'type' => 'function',
                'function' => [
                    'name' => 'propose_tracko_action',
                    'arguments' => json_encode([
                        'operation' => 'create_board',
                        'title' => 'Incident',
                        'color' => '#ef4444',
                    ]),
                ],
            ]],
        ]]]];

        $boardProposal = $this->postJson('/api/ai/messages', [
            'message' => 'buatkan board Incident',
            'campaign_id' => $campaign->id,
        ])->assertOk()->assertJsonPath('data.proposal.operation', 'create_board')->json('data.proposal');

        $this->postJson('/api/ai/proposals/'.$boardProposal['id'].'/approve')->assertOk();

        $this->assertDatabaseHas('boards', ['name' => 'Incident', 'campaign_id' => $campaign->id]);
    }

    public function test_operation_outside_available_context_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->gatewayBody = ['choices' => [['message' => [
            'content' => '',
            'tool_calls' => [[
                'type' => 'function',
                'function' => [
                    'name' => 'propose_tracko_action',
                    'arguments' => json_encode([
                        'operation' => 'create_workspace',
                        'title' => 'Tanpa Konteks',
                    ]),
                ],
            ]],
        ]]]];

        $this->postJson('/api/ai/messages', ['message' => 'buatkan workspace'])->assertUnprocessable();

        $this->assertDatabaseCount('ai_action_proposals', 0);
    }

    public function test_history_is_server_owned_and_isolated_between_users(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/ai/messages', ['message' => 'Susun brief', 'history' => [['role' => 'system', 'content' => 'FORGED']]])
            ->assertOk()->json('data.conversation_id');
        $this->postJson('/api/ai/messages', ['message' => 'Lanjutkan', 'conversation_id' => $id])->assertOk();
        Http::assertSent(fn ($request) => count($request['messages']) === 4
            && $request['messages'][1]['content'] === 'Susun brief'
            && $request['messages'][3]['content'] === 'Lanjutkan'
            && ! str_contains(json_encode($request['messages']), 'FORGED'));
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/ai/messages', ['message' => 'Lanjutkan', 'conversation_id' => $id])->assertNotFound();
        Http::assertSentCount(2);
    }

    public function test_inaccessible_card_is_never_sent_or_listed(): void
    {
        $card = $this->cardFor(User::factory()->create());
        $outsider = User::factory()->create();
        $outsider->givePermissionTo(Permission::findOrCreate('card.view', 'web'));
        Sanctum::actingAs($outsider);
        $this->postJson('/api/ai/messages', ['message' => 'Ringkas', 'card_id' => $card->id])->assertForbidden();
        $this->getJson('/api/ai/cards')->assertOk()->assertJsonCount(0, 'data');
        Http::assertNothingSent();
    }

    public function test_authorized_context_is_limited_and_permissions_are_rechecked(): void
    {
        $owner = User::factory()->create();
        $owner->givePermissionTo(Permission::findOrCreate('card.view', 'web'));
        $card = $this->cardFor($owner);
        Task::create(['card_id' => $card->id, 'title' => 'HIDDEN CHECKLIST', 'order' => 1]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/ai/cards')->assertOk()->assertJsonPath('data.0.id', $card->id);
        $id = $this->postJson('/api/ai/messages', ['message' => 'Ringkas', 'card_id' => $card->id])->assertOk()->json('data.conversation_id');
        Http::assertSent(fn ($request) => str_contains($request['messages'][1]['content'], 'Private Card')
            && ! str_contains($request['messages'][1]['content'], 'HIDDEN CHECKLIST')
            && $request->hasHeader('Authorization', 'Bearer test-secret'));
        $this->postJson('/api/ai/messages', ['message' => 'Lanjut', 'conversation_id' => $id])->assertUnprocessable();
        $owner->revokePermissionTo('card.view');
        $this->postJson('/api/ai/messages', ['message' => 'Lanjut', 'card_id' => $card->id, 'conversation_id' => $id])->assertForbidden();
        Http::assertSentCount(1);
    }

    public function test_cross_division_copy_visibility_is_enforced(): void
    {
        $owner = User::factory()->create();
        $owner->givePermissionTo(Permission::findOrCreate('card.view', 'web'));
        $card = $this->cardFor($owner);
        $stranger = User::factory()->create();
        $card->update(['is_cross_division_copy' => true, 'created_by' => $stranger->id, 'mirrored_by' => $stranger->id]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/ai/cards')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/ai/messages', ['message' => 'Ringkas', 'card_id' => $card->id])->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_gateway_errors_and_empty_responses_do_not_expose_provider_data(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->gatewayBody = ['error' => 'test-secret'];
        $this->gatewayStatus = 401;
        $this->postJson('/api/ai/messages', ['message' => 'Halo'])->assertStatus(502)->assertDontSee('test-secret');
        $this->gatewayBody = ['choices' => []];
        $this->gatewayStatus = 200;
        $this->postJson('/api/ai/messages', ['message' => 'Halo'])->assertStatus(502);
    }

    public function test_validation_rejects_blank_and_oversized_messages(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/ai/messages', ['message' => '   '])->assertUnprocessable();
        $this->postJson('/api/ai/messages', ['message' => str_repeat('x', 4001)])->assertUnprocessable();
        Http::assertNothingSent();
    }

    private function cardFor(User $owner): Card
    {
        $division = Division::create(['name' => 'Private Division', 'slug' => 'private-'.str()->random(8)]);
        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'Private Workspace']);
        $campaign = Campaign::create(['workspace_id' => $workspace->id, 'created_by' => $owner->id, 'name' => 'Private Campaign', 'type' => 'group']);
        $board = Board::create(['campaign_id' => $campaign->id, 'name' => 'Todo', 'type' => 'todo', 'order' => 1]);

        return Card::create(['board_id' => $board->id, 'created_by' => $owner->id, 'title' => 'Private Card', 'description' => '<p>Brief pekerjaan</p>', 'status' => 'todo', 'order' => 1]);
    }
}
