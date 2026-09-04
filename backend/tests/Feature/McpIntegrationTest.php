<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\ExternalIdentity;
use App\Models\McpAuditLog;
use App\Models\McpClient;
use App\Models\User;
use App\Models\Workspace;
use App\Services\McpCredentialService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class McpIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_can_link_discord_with_one_time_code_and_resolve_context(): void
    {
        $user = $this->userWithRole(User::ROLE_USER);
        [$client, $credential] = $this->mcpClient();
        Sanctum::actingAs($user);

        $linkCode = $this->postJson('/api/integrations/link-codes', ['provider' => 'discord'])
            ->assertCreated()
            ->json('data.code');

        $this->withHeaders($this->mcpHeaders($credential, tool: 'traco_link_discord_account'))
            ->postJson('/api/mcp/v1/identities/link', [
                'provider' => 'discord',
                'code' => $linkCode,
                'external_user_id' => '123456789012345678',
                'display_name' => 'traco-user',
            ])
            ->assertCreated()
            ->assertJsonPath('data.user.id', $user->id);

        $this->assertDatabaseHas('external_identities', [
            'user_id' => $user->id,
            'provider' => 'discord',
            'external_user_id' => '123456789012345678',
        ]);

        $this->withHeaders($this->mcpHeaders($credential, '123456789012345678', 'traco_get_my_context', false))
            ->getJson('/api/mcp/v1/context')
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.identity.provider', 'discord');

        $this->assertTrue($client->fresh()->last_used_at !== null);
        $audit = McpAuditLog::query()->where('tool', 'traco_link_discord_account')->firstOrFail();
        $this->assertSame('[REDACTED]', $audit->input['code']);
    }

    public function test_unlinked_or_foreign_discord_actor_cannot_read_cards(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $outsider = $this->userWithRole(User::ROLE_USER);
        $project = $this->createProject($owner, 'Private');
        [, $credential] = $this->mcpClient();
        $this->link($outsider, '222222222222222222');

        $this->withHeaders($this->mcpHeaders($credential, '999999999999999999', 'traco_get_card', false))
            ->getJson('/api/mcp/v1/cards/'.$project['card']->id)
            ->assertUnauthorized()
            ->assertJsonPath('code', 'MCP_ACTOR_NOT_LINKED');

        $this->withHeaders($this->mcpHeaders($credential, '222222222222222222', 'traco_get_card', false))
            ->getJson('/api/mcp/v1/cards/'.$project['card']->id)
            ->assertForbidden();
    }

    public function test_mutation_is_permission_scoped_and_idempotent(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $project = $this->createProject($owner, 'Idempotent');
        [, $credential] = $this->mcpClient();
        $this->link($owner, '333333333333333333');
        $key = (string) Str::uuid();
        $headers = $this->mcpHeaders($credential, '333333333333333333', 'traco_create_card', true, $key);
        $payload = ['title' => 'Only once', 'priority' => 'high'];

        $this->withHeaders($headers)
            ->postJson('/api/mcp/v1/boards/'.$project['board']->id.'/cards', $payload)
            ->assertCreated();

        $this->withHeaders($headers)
            ->postJson('/api/mcp/v1/boards/'.$project['board']->id.'/cards', $payload)
            ->assertCreated()
            ->assertHeader('X-Idempotent-Replay', 'true');

        $this->assertSame(1, Card::query()->where('title', 'Only once')->count());

        $this->withHeaders($this->mcpHeaders($credential, '333333333333333333', 'traco_list_projects', false))
            ->getJson('/api/mcp/v1/projects')
            ->assertOk()
            ->assertJsonPath('data.0.campaigns.0.id', $project['campaign']->id);

        $this->withHeaders($this->mcpHeaders($credential, '333333333333333333', 'traco_search_cards', false))
            ->getJson('/api/mcp/v1/cards/search?query=Only%20once')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Only once')
            ->assertJsonPath('meta.total', 1);

        [, $readOnlyCredential] = $this->mcpClient(['data:read']);
        $this->withHeaders($this->mcpHeaders(
            $readOnlyCredential,
            '333333333333333333',
            'traco_create_card',
            true,
            (string) Str::uuid(),
        ))
            ->postJson('/api/mcp/v1/boards/'.$project['board']->id.'/cards', ['title' => 'Denied'])
            ->assertForbidden()
            ->assertJsonPath('code', 'MCP_ABILITY_DENIED');

        $this->assertDatabaseMissing('cards', ['title' => 'Denied']);
    }

    public function test_idempotency_key_cannot_be_reused_for_different_payload(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $project = $this->createProject($owner, 'Conflict');
        [, $credential] = $this->mcpClient();
        $this->link($owner, '444444444444444444');
        $key = (string) Str::uuid();
        $headers = $this->mcpHeaders($credential, '444444444444444444', 'traco_add_comment', true, $key);

        $this->withHeaders($headers)
            ->postJson('/api/mcp/v1/cards/'.$project['card']->id.'/comments', ['content' => 'First'])
            ->assertCreated();

        $this->withHeaders($headers)
            ->postJson('/api/mcp/v1/cards/'.$project['card']->id.'/comments', ['content' => 'Changed'])
            ->assertConflict()
            ->assertJsonPath('code', 'MCP_IDEMPOTENCY_CONFLICT');

        $this->assertDatabaseHas('card_comments', ['card_id' => $project['card']->id, 'content' => 'First']);
        $this->assertDatabaseMissing('card_comments', ['card_id' => $project['card']->id, 'content' => 'Changed']);
    }

    public function test_linked_super_admin_can_create_and_read_a_division_through_mcp(): void
    {
        $superAdmin = $this->userWithRole(User::ROLE_SUPER_ADMIN);
        [, $credential] = $this->mcpClient();
        $this->link($superAdmin, '555555555555555555');

        $this->withHeaders($this->mcpHeaders(
            $credential,
            '555555555555555555',
            'traco_ubah',
            true,
            (string) Str::uuid(),
        ))
            ->postJson('/api/mcp/v1/divisions', [
                'name' => 'MCP Operations',
                'code' => 'MCP-OPS',
                'description' => 'Dibuat melalui permintaan MCP.',
                'admin_ids' => [$superAdmin->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'MCP Operations');

        $this->withHeaders($this->mcpHeaders($credential, '555555555555555555', 'traco_baca', false))
            ->getJson('/api/mcp/v1/my-divisions')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'MCP Operations');

        $this->assertDatabaseHas('divisions', ['name' => 'MCP Operations', 'code' => 'MCP-OPS']);
    }

    private function mcpClient(array $abilities = ['data:read', 'data:write', 'identity:link']): array
    {
        $client = McpClient::query()->create([
            'name' => 'Test Discord Agent',
            'secret_hash' => str_repeat('0', 64),
            'abilities' => $abilities,
            'is_active' => true,
        ]);
        $credential = app(McpCredentialService::class)->issue($client);

        return [$client, $credential];
    }

    private function mcpHeaders(
        string $credential,
        ?string $discordUserId = null,
        string $tool = 'test_tool',
        bool $withIdempotency = true,
        ?string $idempotencyKey = null,
    ): array {
        return array_filter([
            'Authorization' => 'Bearer '.$credential,
            'Accept' => 'application/json',
            'X-Request-ID' => (string) Str::uuid(),
            'X-Traco-Tool' => $tool,
            'X-Traco-Actor-Provider' => $discordUserId ? 'discord' : null,
            'X-Traco-Actor-Id' => $discordUserId,
            'Idempotency-Key' => $withIdempotency ? ($idempotencyKey ?? (string) Str::uuid()) : null,
        ], fn ($value) => $value !== null);
    }

    private function link(User $user, string $discordUserId): ExternalIdentity
    {
        return ExternalIdentity::query()->create([
            'user_id' => $user->id,
            'provider' => 'discord',
            'external_user_id' => $discordUserId,
            'display_name' => $user->name,
            'verified_at' => now(),
        ]);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::findByName($role, 'web'));

        return $user;
    }

    private function createProject(User $owner, string $suffix): array
    {
        $division = Division::create([
            'name' => $suffix.' Division',
            'slug' => str($suffix)->slug().'-'.str()->random(8),
        ]);
        $division->users()->attach($owner->id, ['role' => 'member']);
        $workspace = Workspace::create(['division_id' => $division->id, 'name' => $suffix.' Workspace']);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => $suffix.' Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($owner->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => $suffix.' Board',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $owner->id,
            'title' => $suffix.' Card',
            'status' => 'todo',
            'order' => 1,
        ]);

        return compact('division', 'workspace', 'campaign', 'board', 'card');
    }
}
