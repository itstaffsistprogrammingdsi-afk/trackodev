<?php

namespace App\Services;

use App\Models\Board;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\ChatRoom;
use App\Models\Division;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Mirror lintas divisi untuk card.
 *
 * Satu pekerjaan (family) = card asli + copy fisik di division lain. Copy
 * adalah card penuh di board division tujuan sehingga:
 *  - muncul di board, laporan, dan ranking user division tujuan,
 *  - bisa digerakkan/diubah dari dua sisi dan terpropagasi dua arah,
 *  - real-time mengikuti broadcast model yang sudah ada (setiap write pada
 *    copy memicu ApplicationDataChanged seperti card biasa).
 *
 * Destinasi copy: campaign milik assignee yang namanya cocok (mis. Risa →
 * "Risa 2026"), atau campaign yang dipilih pengassign, atau fallback ke
 * campaign "Inbox Lintas Divisi".
 *
 * Visibilitas copy bersifat privat (5 pihak): assignee, pemberi assign,
 * admin division pemilik, pemegang permission card.mirror.view di division
 * pemilik, dan Super Admin.
 *
 * Aturan konflik (disepakati UAT): perubahan bersamaan pada satu family
 * ditolak dengan 409 agar frontend menampilkan popup "tunggu beberapa
 * saat lagi", bukan menimpa diam-diam.
 */
class CrossDivisionMirrorService
{
    public const INBOX_CAMPAIGN_NAME = 'Inbox Lintas Divisi';

    /** Lama kunci propagasi per family (detik). */
    public const MIRROR_LOCK_SECONDS = 8;

    // ============================================
    // LOCK & FAMILY HELPERS
    // ============================================

    /**
     * Kunci propagasi per family. Melempar 409 jika family sedang diproses
     * request lain (drag/edit bersamaan dari dua sisi).
     *
     * @return \Illuminate\Contracts\Cache\Lock
     */
    public function acquireFamilyLock(Card $card)
    {
        $lock = Cache::lock(
            'mirror-family:'.$card->familyRootId(),
            self::MIRROR_LOCK_SECONDS
        );

        if (! $lock->acquire()) {
            throw new ConflictHttpException(
                'Terdeteksi sedang melakukan tugas bersamaan (contoh pindah card), mohon tunggu beberapa saat lagi.'
            );
        }

        return $lock;
    }

    /**
     * Seluruh card dalam satu family, termasuk card itu sendiri.
     *
     * @return \Illuminate\Support\Collection<int, Card>
     */
    public function familyCards(Card $card)
    {
        $rootId = $card->familyRootId();

        return Card::query()
            ->where('id', $rootId)
            ->orWhere('parent_card_id', $rootId)
            ->with('board.campaign.workspace.division')
            ->get();
    }

    /**
     * Division tujuan untuk assignee: division pertama milik assignee yang
     * berbeda dari division sumber. Null bila tidak ada (satu division yang
     * sama atau assignee tanpa division).
     */
    public function targetDivisionFor(User $assignee, ?string $sourceDivisionId): ?Division
    {
        $query = $assignee->divisions()->orderBy('divisions.name');

        if ($sourceDivisionId) {
            $query->where('divisions.id', '!=', $sourceDivisionId);
        }

        return $query->first();
    }

    // ============================================
    // VISIBILITAS COPY (5 PIHAK)
    // ============================================

    public function canViewCopy(User $viewer, Card $copy): bool
    {
        if (! $copy->is_cross_division_copy) {
            return true;
        }

        if ($viewer->isSuperAdmin()) {
            return true;
        }

        if ($copy->assignees()->where('users.id', $viewer->id)->exists()) {
            return true;
        }

        if ($copy->mirrored_by && (string) $copy->mirrored_by === (string) $viewer->id) {
            return true;
        }

        $divisionId = $copy->board?->campaign?->workspace?->division_id
            ? (string) $copy->board->campaign->workspace->division_id
            : null;

        if (! $divisionId || ! $viewer->inDivision($divisionId)) {
            return false;
        }

        $isDivisionAdmin = $viewer->isAdmin()
            || $viewer->divisions()->wherePivot('role', 'admin')->exists();

        if ($isDivisionAdmin) {
            return true;
        }

        return $viewer->can('card.mirror.view');
    }

    /**
     * Batasi query Card agar copy lintas divisi hanya terlihat oleh 5 pihak
     * di atas. Dipakai semua endpoint daftar (board, report, my-activity,
     * daily-todo, calendar, analytics).
     */
    public function applyCopyVisibility($query, User $viewer): void
    {
        if ($viewer->isSuperAdmin()) {
            return;
        }

        $viewerId = (string) $viewer->id;
        $ownDivisionIds = $viewer->divisions()->pluck('divisions.id')->map(fn ($id) => (string) $id)->all();

        $isDivisionAdmin = $viewer->isAdmin()
            || $viewer->divisions()->wherePivot('role', 'admin')->exists();
        $hasMirrorView = $viewer->can('card.mirror.view');

        $query->where(function ($visibilityQuery) use (
            $viewerId,
            $ownDivisionIds,
            $isDivisionAdmin,
            $hasMirrorView
        ) {
            // Card biasa selalu terlihat (otorisasi campaign tetap berlaku).
            $visibilityQuery->where('cards.is_cross_division_copy', false);

            // Copy: assignee atau pemberi assign selalu boleh.
            $visibilityQuery->orWhere(function ($copyQuery) use ($viewerId) {
                $copyQuery->where('cards.is_cross_division_copy', true)
                    ->where(function ($whoQuery) use ($viewerId) {
                        $whoQuery->whereHas('assignees', fn ($assigneeQuery) => $assigneeQuery
                            ->where('users.id', $viewerId))
                            ->orWhere('cards.mirrored_by', $viewerId);
                    });
            });

            // Copy: admin division pemilik / pemegang card.mirror.view.
            if (($isDivisionAdmin || $hasMirrorView) && ! empty($ownDivisionIds)) {
                $visibilityQuery->orWhere(function ($privilegedQuery) use ($ownDivisionIds) {
                    $privilegedQuery->where('cards.is_cross_division_copy', true)
                        ->whereHas('board.campaign.workspace', fn ($workspaceQuery) => $workspaceQuery
                            ->whereIn('division_id', $ownDivisionIds));
                });
            }
        });
    }

    // ============================================
    // KANDIDAT MEMBER (dipakai card tool & board)
    // ============================================
    // Satu sumber kebenaran agar picker di card tool (member-candidates)
    // dan form tambah-task di board menampilkan daftar user yang sama:
    // roster division pemilik dulu, lalu user lain (lintas division maupun
    // belum ber-division) agar pencarian selalu menemukan user yang ada di
    // User Management. Flag can_assign/has_division memberi tahu UI siapa
    // yang bisa di-assign; endpoint assign/create tetap otoritas final.

    /**
     * @return \Illuminate\Support\Collection<int, array>
     */
    public function memberCandidates(
        ?Division $division,
        User $actor,
        ?string $search = null,
        int $limit = 100
    ) {
        $limit = max(1, min($limit, 1000));

        $applySearch = function ($userQuery) use ($search) {
            if (! empty($search)) {
                $userQuery->where(function ($searchQuery) use ($search) {
                    $searchQuery
                        ->where('users.name', 'like', "%{$search}%")
                        ->orWhere('users.email', 'like', "%{$search}%");
                });
            }
        };

        $formatCandidate = function (User $candidate) use ($actor, $division) {
            $hasDivision = $candidate->relationLoaded('divisions')
                ? $candidate->divisions->isNotEmpty()
                : $candidate->divisions()->exists();

            return [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'email' => $candidate->email,
                'avatar' => $candidate->avatar
                    ? asset('storage/'.$candidate->avatar)
                    : null,
                'roles' => $candidate->getRoleNames()->values(),
                'division_role' => $candidate->pivot?->role,
                'division_names' => $candidate->divisions->pluck('name')->values(),
                'has_division' => $hasDivision,
                'is_cross_division' => $division
                    ? ! $candidate->divisions->contains('id', $division->id)
                    : false,
                'can_assign' => (
                    $actor->can('card.assign')
                    || $actor->can('task.assign')
                ) && $actor->canAssignCardMemberTo($candidate),
            ];
        };

        $users = collect();

        // Roster division pemilik selalu diutamakan.
        if ($division) {
            $divisionUsers = $division->users()
                ->with(['roles', 'divisions:id,name'])
                ->orderBy('users.name');

            $applySearch($divisionUsers);

            $users = $users->concat($divisionUsers->limit($limit)->get());
        }

        $remaining = max(0, $limit - $users->count());

        if ($remaining > 0) {
            $crossQuery = User::query()
                ->select(['users.id', 'users.name', 'users.email', 'users.avatar'])
                ->with(['roles', 'divisions:id,name'])
                ->when($division, fn ($crossDivisionQuery) => $crossDivisionQuery
                    ->whereNotIn('users.id', $users->pluck('id'))
                    ->whereDoesntHave('divisions', fn ($membershipQuery) => $membershipQuery
                        ->where('divisions.id', $division->id)))
                ->orderByRaw('(select count(*) from division_user where division_user.user_id = users.id) desc')
                ->orderBy('users.name');

            $applySearch($crossQuery);

            $users = $users->concat($crossQuery->limit($remaining)->get());
        }

        return $users->map($formatCandidate)->values();
    }

    // ============================================
    // PENCARIAN CAMPAIGN MILIK ASSIGNEE (BY NAMA)
    // ============================================

    /**
     * Kata kunci pencocokan: seluruh kata nama assignee (lowercase,
     * minimal 3 karakter) agar "Rizky Eggy Syah Putra" tetap cocok ke
     * "Eggy 2026", bukan hanya kata pertamanya.
     *
     * @return list<string>
     */
    public static function nameTokens(User $user): array
    {
        $words = preg_split('/\s+/u', trim((string) $user->name)) ?: [];

        $tokens = [];
        foreach ($words as $word) {
            $word = mb_strtolower(trim((string) $word));
            if (mb_strlen($word) >= 3 && ! in_array($word, $tokens, true)) {
                $tokens[] = $word;
            }
        }

        return $tokens;
    }

    /**
     * Kata kunci tunggal (kompatibilitas): kata pertama, null bila <3 char.
     */
    public static function nameToken(User $user): ?string
    {
        return self::nameTokens($user)[0] ?? null;
    }

    /**
     * Cocok sebagai kata utuh (case-insensitive, Unicode-safe): "Risa 2026"
     * cocok untuk "risa", "Warisan" tidak.
     */
    public static function isNameMatch(string $campaignName, string $token): bool
    {
        return (bool) preg_match(
            '/(?<!\p{L})'.preg_quote($token, '/').'(?!\p{L})/iu',
            $campaignName
        );
    }

    /**
     * Skor kecocokan nama campaign terhadap nama assignee:
     *  2 = salah satu token cocok sebagai kata utuh (kuat),
     *  1 = hanya substring dua arah, mis. token "rizkyegy" vs kata
     *      campaign "eggy" (lemah, untuk nama tanpa spasi),
     *  0 = tidak cocok.
     * Hanya dipakai dalam campaign milik assignee sendiri sehingga risiko
     * false-positive (mis. "Warisan" untuk "Risa") tertutup ranking.
     */
    public static function matchScore(string $campaignName, array $tokens): int
    {
        $normalized = mb_strtolower($campaignName);

        foreach ($tokens as $token) {
            if (self::isNameMatch($campaignName, $token)) {
                return 2;
            }
        }

        $nameWords = preg_split('/[^\p{L}]+/u', $normalized) ?: [];

        foreach ($tokens as $token) {
            if (mb_strlen($token) < 4) {
                continue;
            }
            if (mb_strpos($normalized, $token) !== false) {
                return 1;
            }
            foreach ($nameWords as $word) {
                if (mb_strlen($word) >= 4 && mb_strpos($token, $word) !== false) {
                    return 1;
                }
            }
        }

        return 0;
    }

    /**
     * Kandidat campaign tujuan untuk assignee: campaign non-inbox di
     * division-division miliknya di mana ia member/creator. Diurutkan:
     * skor cocok-nama dulu, lalu buatan sendiri, lalu terbaru.
     *
     * @return \Illuminate\Support\Collection<int, Campaign>
     */
    public function receivingCandidates(User $assignee)
    {
        $divisionIds = $assignee->divisions()->pluck('divisions.id')->all();

        if (empty($divisionIds)) {
            return collect();
        }

        $tokens = self::nameTokens($assignee);

        $campaigns = Campaign::query()
            ->where('name', '!=', self::INBOX_CAMPAIGN_NAME)
            ->whereHas('workspace', fn ($workspaceQuery) => $workspaceQuery
                ->whereIn('division_id', $divisionIds))
            ->where(function ($accessQuery) use ($assignee) {
                $accessQuery
                    ->where('created_by', $assignee->id)
                    ->orWhereHas('members', fn ($memberQuery) => $memberQuery
                        ->where('users.id', $assignee->id));
            })
            ->with(['workspace:id,name,division_id', 'workspace.division:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        $assigneeId = (string) $assignee->id;

        return $campaigns
            ->map(function (Campaign $campaign) use ($tokens, $assigneeId) {
                $score = self::matchScore($campaign->name, $tokens);
                $campaign->setAttribute('match_score', $score);
                $campaign->setAttribute('is_name_match', $score === 2);
                $campaign->setAttribute(
                    'is_own',
                    (string) $campaign->created_by === $assigneeId
                );

                return $campaign;
            })
            ->sortByDesc(fn (Campaign $campaign) => [
                $campaign->getAttribute('match_score') ?? 0,
                $campaign->getAttribute('is_own') ? 1 : 0,
                $campaign->updated_at?->timestamp ?? 0,
            ])
            ->values();
    }

    /**
     * Campaign milik assignee yang cocok nama (otomatis, tanpa pilihan).
     * Menerima skor lemah (>=1) sebagai fallback nama tanpa spasi.
     */
    public function resolveOwnedCampaign(User $assignee, ?string $sourceDivisionId = null): ?Campaign
    {
        $candidates = $this->receivingCandidates($assignee);

        if ($sourceDivisionId) {
            $filtered = $candidates->filter(fn (Campaign $campaign) => (string) $campaign->workspace?->division_id !== (string) $sourceDivisionId);
            if ($filtered->isNotEmpty()) {
                $candidates = $filtered->values();
            }
        }

        return $candidates->first(fn (Campaign $campaign) => ($campaign->getAttribute('match_score') ?? 0) > 0);
    }

    /**
     * Validasi + ambil campaign tujuan eksplisit pilihan pengassign.
     * Mengembalikan null bila tidak valid (tanpa efek samping bila
     * $syncMember false — dipakai pra-validasi sebelum card dibuat).
     */
    public function findTargetCampaign(
        ?string $targetCampaignId,
        User $assignee,
        ?Division $targetDivision,
        bool $syncMember = true
    ): ?Campaign {
        if (! $targetCampaignId || ! $targetDivision) {
            return null;
        }

        $campaign = Campaign::query()
            ->with('workspace.division')
            ->whereKey($targetCampaignId)
            ->first();

        $valid = $campaign
            && $campaign->name !== self::INBOX_CAMPAIGN_NAME
            && (string) $campaign->workspace?->division_id === (string) $targetDivision->id
            && ((string) $campaign->created_by === (string) $assignee->id
                || $campaign->members()->where('users.id', $assignee->id)->exists());

        if (! $valid) {
            return null;
        }

        if ($syncMember) {
            $campaign->members()->syncWithoutDetaching([$assignee->id]);
        }

        return $campaign;
    }

    /**
     * Campaign tujuan final: pilihan eksplisit pengassign (divalidasi),
     * pembuatan baru bila diminta, pencocokan otomatis, atau fallback Inbox.
     */
    public function resolveTargetCampaign(
        Card $root,
        User $assignee,
        User $actor,
        Division $targetDivision,
        ?string $targetCampaignId = null,
        bool $createCampaign = false,
        ?string $campaignName = null,
        bool $forceInbox = false
    ): Campaign {
        if ($targetCampaignId) {
            $campaign = $this->findTargetCampaign($targetCampaignId, $assignee, $targetDivision);

            if (! $campaign) {
                throw ValidationException::withMessages([
                    'target_campaign_id' => 'Campaign tujuan tidak valid untuk user yang dipilih.',
                ]);
            }

            return $campaign;
        }

        // Pilihan eksplisit "Inbox Lintas Divisi" dari picker: paksa fallback
        // walau ada campaign yang cocok nama.
        if ($forceInbox) {
            $workspace = $this->resolveWorkspace($targetDivision);

            return $this->resolveInboxCampaign($workspace, $actor, $assignee);
        }

        if ($createCampaign) {
            return $this->createPersonalCampaign($assignee, $targetDivision, $actor, $campaignName);
        }

        $owned = $this->resolveOwnedCampaign(
            $assignee,
            $root->board?->campaign?->workspace?->division_id
                ? (string) $root->board->campaign->workspace->division_id
                : null
        );

        if ($owned) {
            $owned->members()->syncWithoutDetaching([$assignee->id]);

            return $owned;
        }

        $workspace = $this->resolveWorkspace($targetDivision);

        return $this->resolveInboxCampaign($workspace, $actor, $assignee);
    }

    /**
     * Nama saran untuk campaign personal baru: "{NamaDepan} {Tahun}".
     */
    public static function suggestedCampaignName(User $assignee): string
    {
        $first = preg_split('/\s+/u', trim((string) $assignee->name))[0] ?? '';
        $first = trim((string) $first);

        if ($first === '') {
            $first = 'Personal';
        }

        return $first.' '.now()->year;
    }

    /**
     * Buatkan campaign personal untuk assignee di division tujuan bila ia
     * belum punya campaign yang cocok. Pemilik (created_by) = assignee agar
     * ia bisa mengelolanya sendiri; pengassign TIDAK dijadikan member.
     */
    public function createPersonalCampaign(
        User $assignee,
        Division $division,
        User $actor,
        ?string $name = null
    ): Campaign {
        $workspace = $this->resolveWorkspace($division);

        $baseName = trim((string) ($name ?: self::suggestedCampaignName($assignee)));
        if ($baseName === '') {
            $baseName = self::suggestedCampaignName($assignee);
        }

        $campaignName = $baseName;
        $suffix = 2;
        while ($workspace->campaigns()->where('name', $campaignName)->exists()) {
            $campaignName = $baseName.' ('.$suffix++.')';
        }

        return DB::transaction(function () use ($workspace, $assignee, $actor, $campaignName) {
            $campaign = $workspace->campaigns()->create([
                'name' => $campaignName,
                'description' => 'Campaign personal otomatis untuk menampung tugas lintas divisi.',
                'type' => 'personal',
                'created_by' => $assignee->id,
            ]);

            collect([
                ['name' => 'By Request', 'type' => 'request', 'order' => 1],
                ['name' => 'Todo', 'type' => 'todo', 'order' => 2],
                ['name' => 'Progress', 'type' => 'progress', 'order' => 3],
                ['name' => 'Done', 'type' => 'done', 'order' => 4],
            ])->each(fn ($board) => Board::create([
                'campaign_id' => $campaign->id,
                'name' => $board['name'],
                'type' => $board['type'],
                'order' => $board['order'],
                'color' => '#6366f1',
            ]));

            $campaign->members()->sync([$assignee->id]);
            $workspace->members()->syncWithoutDetaching([$assignee->id]);

            $chatRoom = ChatRoom::create([
                'campaign_id' => $campaign->id,
                'type' => 'group',
                'name' => $campaign->name,
            ]);
            $chatRoom->members()->sync([$assignee->id]);

            ActivityLogService::log(
                $actor,
                'campaign',
                (string) $campaign->id,
                'created',
                "Membuat campaign personal '{$campaign->name}' untuk {$assignee->name} (otomatis lintas divisi)",
                ['campaign_id' => (string) $campaign->id, 'workspace_id' => (string) $workspace->id]
            );

            return $campaign;
        });
    }

    // ============================================
    // WORKSPACE & INBOX
    // ============================================

    /**
     * Workspace utama division tujuan (dibuat bila belum ada).
     */
    public function resolveWorkspace(Division $division): Workspace
    {
        $workspace = $division->workspaces()->orderBy('created_at')->first();

        if (! $workspace) {
            $workspace = Workspace::create([
                'division_id' => $division->id,
                'name' => 'Workspace '.$division->name,
                'description' => 'Workspace otomatis untuk menampung card lintas divisi.',
            ]);
        }

        return $workspace;
    }

    /**
     * Campaign inbox terpusat di workspace tujuan (dibuat sekali bila belum
     * ada, lengkap dengan 4 board default + chat room seperti store biasa).
     */
    public function resolveInboxCampaign(Workspace $workspace, User $actor, User $assignee): Campaign
    {
        $campaign = $workspace->campaigns()
            ->where('name', self::INBOX_CAMPAIGN_NAME)
            ->first();

        if ($campaign) {
            $campaign->members()->syncWithoutDetaching([$actor->id, $assignee->id]);
            $workspace->members()->syncWithoutDetaching([$actor->id, $assignee->id]);
            $campaign->chatRoom?->members()->syncWithoutDetaching([$actor->id, $assignee->id]);

            return $campaign;
        }

        return DB::transaction(function () use ($workspace, $actor, $assignee) {
            $campaign = $workspace->campaigns()->create([
                'name' => self::INBOX_CAMPAIGN_NAME,
                'description' => 'Penampung otomatis card yang ditugaskan dari division lain.',
                'type' => 'group',
                'created_by' => $actor->id,
            ]);

            collect([
                ['name' => 'By Request', 'type' => 'request', 'order' => 1],
                ['name' => 'Todo', 'type' => 'todo', 'order' => 2],
                ['name' => 'Progress', 'type' => 'progress', 'order' => 3],
                ['name' => 'Done', 'type' => 'done', 'order' => 4],
            ])->each(fn ($board) => Board::create([
                'campaign_id' => $campaign->id,
                'name' => $board['name'],
                'type' => $board['type'],
                'order' => $board['order'],
                'color' => '#6366f1',
            ]));

            $campaign->members()->sync([$actor->id, $assignee->id]);
            $workspace->members()->syncWithoutDetaching([$actor->id, $assignee->id]);

            $chatRoom = ChatRoom::create([
                'campaign_id' => $campaign->id,
                'type' => 'group',
                'name' => $campaign->name,
            ]);
            $chatRoom->members()->sync([$actor->id, $assignee->id]);

            ActivityLogService::log(
                $actor,
                'campaign',
                (string) $campaign->id,
                'created',
                "Membuat campaign '".self::INBOX_CAMPAIGN_NAME."' di workspace '{$workspace->name}' (otomatis lintas divisi)",
                ['campaign_id' => (string) $campaign->id, 'workspace_id' => (string) $workspace->id]
            );

            return $campaign;
        });
    }

    /**
     * Board tujuan = board dengan type yang sama di campaign tujuan.
     * Berlaku untuk semua kolom (request/todo/progress/done/kustom).
     */
    public function resolveTargetBoard(Campaign $campaign, ?string $boardType): Board
    {
        $normalized = strtolower(trim((string) $boardType));

        $board = $normalized
            ? $campaign->boards()->where('type', $normalized)->orderBy('order')->first()
            : null;

        return $board
            ?? $campaign->boards()->where('type', 'todo')->orderBy('order')->first()
            ?? $campaign->boards()->orderBy('order')->firstOrFail();
    }

    // ============================================
    // PEMBUATAN COPY
    // ============================================

    /**
     * Pastikan ada copy di division assignee. Idempoten per campaign tujuan:
     * mengembalikan copy yang sudah ada bila sudah punya. Null bila tidak
     * ada division tujuan (satu division yang sama).
     */
    public function ensureMirror(
        Card $source,
        User $assignee,
        User $actor,
        ?string $targetCampaignId = null,
        bool $createCampaign = false,
        ?string $campaignName = null,
        bool $forceInbox = false
    ): ?Card {
        if (Card::$isMirroring) {
            return null;
        }

        $source->loadMissing('board.campaign.workspace.division');
        $rootId = $source->familyRootId();
        $sourceDivisionId = $source->board?->campaign?->workspace?->division_id;

        // Copy tidak membuat copy lagi: selalu berangkat dari card asli.
        $root = $source->parent_card_id
            ? Card::query()->whereKey($rootId)->with('board.campaign.workspace.division')->firstOrFail()
            : $source;

        $targetDivision = $this->targetDivisionFor($assignee, $sourceDivisionId ? (string) $sourceDivisionId : null);

        if (! $targetDivision) {
            return null;
        }

        $lock = $this->acquireFamilyLock($root);

        try {
            return DB::transaction(function () use (
                $root,
                $assignee,
                $actor,
                $targetDivision,
                $rootId,
                $sourceDivisionId,
                $targetCampaignId,
                $createCampaign,
                $campaignName,
                $forceInbox
            ) {
                Card::$isMirroring = true;

                try {
                    $campaign = $this->resolveTargetCampaign($root, $assignee, $actor, $targetDivision, $targetCampaignId, $createCampaign, $campaignName, $forceInbox);
                    $targetBoard = $this->resolveTargetBoard($campaign, $root->board?->type);

                    // Pengassign dijadikan member campaign tujuan agar bisa
                    // membuka/melihat copy yang ia picu (tombol redirect
                    // "Lihat campaign" di frontend). Inbox sudah
                    // menanganinya sendiri; ini untuk campaign milik user.
                    $campaign->members()->syncWithoutDetaching([$actor->id]);

                    $existing = Card::query()
                        ->where('parent_card_id', $rootId)
                        ->whereHas('board', fn ($boardQuery) => $boardQuery
                            ->where('campaign_id', $campaign->id))
                        ->first();

                    if ($existing) {
                        $existing->assignees()->syncWithoutDetaching([$assignee->id]);
                        $this->syncAssigneesToFamily($root, $actor);

                        return $existing;
                    }

                    $copy = $this->cloneCardRow($root, $targetBoard, $actor, $sourceDivisionId);
                    $copy->assignees()->syncWithoutDetaching([$assignee->id]);

                    $this->cloneRelations($root, $copy);

                    ActivityLogService::log(
                        $actor,
                        'card',
                        (string) $copy->id,
                        'mirrored',
                        "Membuat copy lintas divisi dari card '{$root->title}' (division {$root->board?->campaign?->workspace?->division?->name}) untuk {$assignee->name} di campaign '{$campaign->name}'",
                        [
                            'card_id' => (string) $copy->id,
                            'parent_card_id' => $rootId,
                            'source_division_id' => $sourceDivisionId ? (string) $sourceDivisionId : null,
                            'target_division_id' => (string) $targetDivision->id,
                            'target_campaign_id' => (string) $campaign->id,
                        ]
                    );

                    return $copy->load(['assignees', 'board.campaign.workspace.division']);
                } finally {
                    Card::$isMirroring = false;
                }
            });
        } finally {
            optional($lock)->release();
        }
    }

    protected function cloneCardRow(
        Card $root,
        Board $targetBoard,
        User $actor,
        $sourceDivisionId
    ): Card {
        $lastOrder = $targetBoard->cards()->max('order') ?? 0;

        return Card::create([
            'board_id' => $targetBoard->id,
            'campaign_id' => $targetBoard->campaign_id,
            'parent_card_id' => $root->id,
            'is_cross_division_copy' => true,
            'source_division_id' => $sourceDivisionId,
            'mirrored_by' => $actor->id,
            'created_by' => $root->created_by,
            'title' => $root->title,
            'description' => $root->description,
            'priority' => $root->priority,
            'due_date' => $root->due_date,
            'order' => $lastOrder + 1,
            'status' => $root->status,
            'completed_at' => $root->completed_at,
        ]);
    }

    /**
     * Clone isi card (labels, brands, tasks+subtasks, komentar, lampiran).
     * File lampiran dipinjam (file_path yang sama) agar tidak menggandakan
     * storage; baris DB tetap terpisah per copy.
     */
    public function cloneRelations(Card $root, Card $copy): void
    {
        $root->loadMissing(['labels', 'brands', 'tasks.subtasks', 'attachments', 'briefAttachments']);

        if ($root->labels->isNotEmpty()) {
            $copy->labels()->syncWithoutDetaching($root->labels->pluck('id')->all());
        }

        foreach ($root->brands as $brand) {
            $target = Brand::query()
                ->where('campaign_id', $copy->board?->campaign_id ?? $copy->campaign_id)
                ->where('name', $brand->name)
                ->first();

            if (! $target) {
                $target = Brand::create([
                    'name' => $brand->name,
                    'color' => $brand->color,
                    'campaign_id' => $copy->board?->campaign_id ?? $copy->campaign_id,
                ]);
            }

            $copy->brands()->syncWithoutDetaching([$target->id]);
        }

        foreach ($root->tasks as $task) {
            $copiedTask = Task::create([
                'card_id' => $copy->id,
                'source_task_id' => $task->id,
                'title' => $task->title,
                'is_completed' => $task->is_completed ?? false,
                'order' => $task->order,
            ]);

            foreach ($task->subtasks as $subtask) {
                Subtask::create([
                    'task_id' => $copiedTask->id,
                    'source_subtask_id' => $subtask->id,
                    'title' => $subtask->title,
                    'is_completed' => $subtask->is_completed ?? false,
                    'order' => $subtask->order,
                ]);
            }
        }

        $commentMap = [];

        foreach ($root->comments()->with('replies')->orderBy('created_at')->get() as $comment) {
            $copied = CardComment::create([
                'card_id' => $copy->id,
                'source_comment_id' => $comment->id,
                'user_id' => $comment->user_id,
                'parent_id' => null,
                'content' => $comment->content,
            ]);
            $commentMap[$comment->id] = $copied->id;

            foreach ($comment->replies as $reply) {
                $copiedReply = CardComment::create([
                    'card_id' => $copy->id,
                    'source_comment_id' => $reply->id,
                    'user_id' => $reply->user_id,
                    'parent_id' => $copied->id,
                    'content' => $reply->content,
                ]);
                $commentMap[$reply->id] = $copiedReply->id;
            }
        }

        foreach ($root->attachments as $attachment) {
            $attributes = $attachment->getAttributes();
            unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
            $attributes['card_id'] = $copy->id;
            CardAttachment::create($attributes);
        }

        foreach ($root->briefAttachments as $brief) {
            $attributes = $brief->getAttributes();
            unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
            $attributes['card_id'] = $copy->id;
            CardBriefAttachment::create($attributes);
        }
    }

    // ============================================
    // RELOKASI COPY (MIGRASI INBOX -> CAMPAIGN)
    // ============================================

    /**
     * Pindahkan copy ke campaign lain (mis. hasil pencocokan nama saat
     * migrasi). Board dicocokkan by-type; order ditaruh paling akhir.
     */
    public function relocateCopy(Card $copy, Campaign $campaign, User $actor): Card
    {
        $copy->loadMissing('board.campaign.workspace.division');

        $lock = $this->acquireFamilyLock($copy);

        try {
            Card::$isMirroring = true;

            try {
                $fromBoard = $copy->board;
                $destination = $this->resolveTargetBoard($campaign, $fromBoard?->type);
                $lastOrder = $destination->cards()->where('id', '!=', $copy->id)->max('order');

                $copy->update([
                    'board_id' => $destination->id,
                    'campaign_id' => $destination->campaign_id,
                    'order' => ($lastOrder ?? 0) + 1,
                ]);

                $campaign->members()->syncWithoutDetaching(
                    $copy->assignees()->pluck('users.id')->all()
                );

                ActivityLogService::log(
                    $actor,
                    'card',
                    (string) $copy->id,
                    'mirror_moved',
                    "Memindahkan copy '{$copy->title}' dari '{$fromBoard?->name}' ke campaign '{$campaign->name}' ({$destination->name})",
                    [
                        'card_id' => (string) $copy->id,
                        'family_root_id' => $copy->familyRootId(),
                        'from_board_id' => $fromBoard?->id ? (string) $fromBoard->id : null,
                        'to_board_id' => (string) $destination->id,
                        'to_campaign_id' => (string) $campaign->id,
                    ]
                );

                return $copy->fresh(['board.campaign.workspace.division', 'assignees']);
            } finally {
                Card::$isMirroring = false;
            }
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Isi mirrored_by copy lama dari activity log 'mirrored' pertama bila
     * masih kosong (copy dibuat sebelum kolom ada).
     */
    public function backfillMirroredBy(Card $copy): bool
    {
        if ($copy->mirrored_by) {
            return false;
        }

        $log = \App\Models\ActivityLog::query()
            ->where('entity_type', 'card')
            ->where('entity_id', (string) $copy->id)
            ->where('action', 'mirrored')
            ->whereNotNull('user_id')
            ->orderBy('created_at')
            ->first();

        if (! $log) {
            return false;
        }

        $copy->update(['mirrored_by' => $log->user_id]);

        return true;
    }

    // ============================================
    // PROPAGASI DUA ARAH
    // ============================================

    /**
     * Sinkronkan assignee lintas-division ke copy yang sesuai: setiap copy
     * memuat assignee family yang division-nya sama dengan division copy.
     */
    public function syncAssigneesToFamily(Card $card, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $family = $this->familyCards($card)->loadMissing('assignees');

        $allAssigneeIds = $family->flatMap(fn (Card $member) => $member->assignees->pluck('id'))
            ->unique()->values();

        if ($allAssigneeIds->isEmpty()) {
            return;
        }

        $users = User::query()->with('divisions:id')->whereIn('id', $allAssigneeIds)->get()->keyBy('id');

        Card::$isMirroring = true;

        try {
            foreach ($family as $member) {
                $memberDivisionId = $member->board?->campaign?->workspace?->division_id;

                $matchingIds = $users
                    ->filter(fn (User $user) => $memberDivisionId
                        ? $user->divisions->contains('id', $memberDivisionId)
                        : true)
                    ->keys()->all();

                if (! empty($matchingIds)) {
                    $member->assignees()->syncWithoutDetaching($matchingIds);
                }
            }
        } finally {
            Card::$isMirroring = false;
        }

        ActivityLogService::log(
            $actor,
            'card',
            (string) $card->id,
            'mirror_synced',
            "Menyinkronkan assignee lintas divisi pada family card '{$card->title}'",
            ['card_id' => (string) $card->id, 'family_root_id' => $card->familyRootId()]
        );
    }

    /**
     * Propagasi field scalar (judul/deskripsi/priority/due_date/dll) ke
     * seluruh family kecuali card pemicu.
     */
    public function propagateFields(Card $card, User $actor, ?array $only = null): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $allowed = ['title', 'description', 'priority', 'due_date', 'status', 'completed_at'];
        $fields = array_intersect_key($card->getAttributes(), array_flip($only ?? $allowed));

        if (empty($fields)) {
            return;
        }

        $lock = $this->acquireFamilyLock($card);

        try {
            Card::$isMirroring = true;

            try {
                foreach ($this->familyCards($card) as $member) {
                    if ($member->is($card)) {
                        continue;
                    }

                    $member->fill($fields);
                    if ($member->isDirty()) {
                        $member->save();
                    }
                }
            } finally {
                Card::$isMirroring = false;
            }
        } finally {
            optional($lock)->release();
        }

        ActivityLogService::log(
            $actor,
            'card',
            (string) $card->id,
            'mirror_synced',
            "Menyinkronkan perubahan card '{$card->title}' ke seluruh copy lintas divisi",
            ['card_id' => (string) $card->id, 'family_root_id' => $card->familyRootId(), 'fields' => array_keys($fields)]
        );
    }

    /**
     * Propagasi pindah board: setiap copy pindah ke board dengan TYPE yang
     * sama di campaign-nya sendiri (berlaku semua kolom, termasuk kustom).
     */
    public function propagateMove(Card $card, Board $targetBoard, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $lock = $this->acquireFamilyLock($card);

        try {
            Card::$isMirroring = true;

            try {
                foreach ($this->familyCards($card) as $member) {
                    if ($member->is($card)) {
                        continue;
                    }

                    $memberCampaign = $member->board?->campaign;
                    if (! $memberCampaign) {
                        continue;
                    }

                    $destination = $this->resolveTargetBoard($memberCampaign, $targetBoard->type);
                    $lastOrder = $destination->cards()->where('id', '!=', $member->id)->max('order');

                    $status = match (true) {
                        in_array(strtolower($destination->type ?? ''), ['done', 'finished', 'complete', 'selesai', 'qc_done']) => 'completed',
                        in_array(strtolower($destination->type ?? ''), ['progress', 'in_progress', 'doing']) => 'in_progress',
                        in_array(strtolower($destination->type ?? ''), ['request', 'by_request', 'requested', 'backlog', 'todo', 'to_do', 'start']) => 'todo',
                        default => $member->status,
                    };

                    $member->update([
                        'board_id' => $destination->id,
                        'order' => ($lastOrder ?? 0) + 1,
                        'status' => $status,
                        'completed_at' => $status === 'completed'
                            ? ($member->completed_at ?? now())
                            : null,
                    ]);

                    ActivityLogService::log(
                        $actor,
                        'card',
                        (string) $member->id,
                        'moved',
                        "Memindahkan copy '{$member->title}' ke board '{$destination->name}' (mirror dari '{$targetBoard->name}')",
                        [
                            'card_id' => (string) $member->id,
                            'family_root_id' => $card->familyRootId(),
                            'to_board_id' => (string) $destination->id,
                            'to_board_name' => $destination->name,
                        ]
                    );
                }
            } finally {
                Card::$isMirroring = false;
            }
        } finally {
            optional($lock)->release();
        }
    }

    // ============================================
    // TASK / SUBTASK
    // ============================================

    public function syncTaskCreated(Task $task, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $task->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $exists = Task::query()
                    ->where('card_id', $member->id)
                    ->where('source_task_id', $task->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                Task::create([
                    'card_id' => $member->id,
                    'source_task_id' => $task->id,
                    'title' => $task->title,
                    'is_completed' => $task->is_completed ?? false,
                    'order' => $task->order,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncTaskUpdated(Task $task, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $task->card ? $task->card->familyIds() : [];

        $counterparts = Task::query()
            ->where(fn ($query) => $query
                ->where('source_task_id', $task->id)
                ->orWhere(fn ($inner) => $inner
                    ->where('id', $task->source_task_id ?? $task->id)
                    ->orWhere('source_task_id', $task->source_task_id)))
            ->whereIn('card_id', $familyIds)
            ->get();

        if ($counterparts->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($counterparts as $counterpart) {
                if ($counterpart->is($task)) {
                    continue;
                }

                $counterpart->update([
                    'title' => $task->title,
                    'is_completed' => $task->is_completed ?? false,
                    'order' => $task->order,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncTaskDeleted(Task $task, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $task->card ? $task->card->familyIds() : [];

        Card::$isMirroring = true;

        try {
            Task::query()
                ->whereIn('card_id', $familyIds)
                ->where(fn ($query) => $query
                    ->where('source_task_id', $task->id)
                    ->orWhere('id', $task->source_task_id ?? '00000000-0000-0000-0000-000000000000'))
                ->delete();
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncSubtaskEvent(Subtask $subtask, string $event, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $task = $subtask->task;
        $card = $task?->card;

        if (! $card) {
            // Subtask hasil delete: cari family lewat task yang masih ada
            // tidak memungkinkan; propagasi delete subtask ditangani
            // cascade dari syncTaskDeleted bila task ikut terhapus.
            return;
        }

        $familyIds = $card->familyIds();
        $siblingTaskIds = Task::query()->whereIn('card_id', $familyIds)->pluck('id');

        Card::$isMirroring = true;

        try {
            if ($event === 'created') {
                $counterpartTaskIds = Task::query()
                    ->whereIn('card_id', $familyIds)
                    ->where(fn ($query) => $query
                        ->where('id', $task->id)
                        ->orWhere('source_task_id', $task->id)
                        ->orWhere('id', $task->source_task_id ?? $task->id))
                    ->pluck('id');

                foreach ($counterpartTaskIds as $counterpartTaskId) {
                    if ((string) $counterpartTaskId === (string) $task->id) {
                        continue;
                    }

                    $exists = Subtask::query()
                        ->where('task_id', $counterpartTaskId)
                        ->where('source_subtask_id', $subtask->id)
                        ->exists();

                    if (! $exists) {
                        Subtask::create([
                            'task_id' => $counterpartTaskId,
                            'source_subtask_id' => $subtask->id,
                            'title' => $subtask->title,
                            'is_completed' => $subtask->is_completed ?? false,
                            'order' => $subtask->order,
                        ]);
                    }
                }

                return;
            }

            $counterparts = Subtask::query()
                ->whereIn('task_id', $siblingTaskIds)
                ->where(fn ($query) => $query
                    ->where('source_subtask_id', $subtask->id)
                    ->orWhere('id', $subtask->source_subtask_id ?? '00000000-0000-0000-0000-000000000000'))
                ->get();

            foreach ($counterparts as $counterpart) {
                if ($counterpart->is($subtask)) {
                    continue;
                }

                if ($event === 'deleted') {
                    $counterpart->delete();
                    continue;
                }

                $counterpart->update([
                    'title' => $subtask->title,
                    'is_completed' => $subtask->is_completed ?? false,
                    'order' => $subtask->order,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // COMMENT
    // ============================================

    public function syncCommentCreated(CardComment $comment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $comment->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $exists = CardComment::query()
                    ->where('card_id', $member->id)
                    ->where('source_comment_id', $comment->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $parentMirrorId = null;
                if ($comment->parent_id) {
                    $parentMirrorId = CardComment::query()
                        ->where('card_id', $member->id)
                        ->where(fn ($query) => $query
                            ->where('id', $comment->parent_id)
                            ->orWhere('source_comment_id', $comment->parent_id))
                        ->value('id');
                }

                CardComment::create([
                    'card_id' => $member->id,
                    'source_comment_id' => $comment->id,
                    'user_id' => $comment->user_id,
                    'parent_id' => $parentMirrorId,
                    'content' => $comment->content,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncCommentUpdated(CardComment $comment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $comment->card ? $comment->card->familyIds() : [];

        $counterparts = CardComment::query()
            ->whereIn('card_id', $familyIds)
            ->where(fn ($query) => $query
                ->where('source_comment_id', $comment->id)
                ->orWhere('id', $comment->source_comment_id ?? '00000000-0000-0000-0000-000000000000'))
            ->get();

        if ($counterparts->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($counterparts as $counterpart) {
                if ($counterpart->is($comment)) {
                    continue;
                }

                $counterpart->update(['content' => $comment->content]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncCommentDeleted(CardComment $comment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $comment->card ? $comment->card->familyIds() : [];

        Card::$isMirroring = true;

        try {
            CardComment::query()
                ->whereIn('card_id', $familyIds)
                ->where(fn ($query) => $query
                    ->where('source_comment_id', $comment->id)
                    ->orWhere('id', $comment->source_comment_id ?? '00000000-0000-0000-0000-000000000000'))
                ->delete();
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // ATTACHMENT (pinjam file yang sama)
    // ============================================

    public function syncAttachmentCreated(CardAttachment $attachment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $attachment->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $attributes = $attachment->getAttributes();
                unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
                $attributes['card_id'] = $member->id;
                CardAttachment::create($attributes);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncAttachmentDeleted(CardAttachment $attachment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $attachment->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                CardAttachment::query()
                    ->where('card_id', $member->id)
                    ->where('file_name', $attachment->file_name)
                    ->where(fn ($query) => $query
                        ->where('file_path', $attachment->file_path)
                        ->orWhere('link_url', $attachment->link_url))
                    ->delete();
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncBriefAttachmentCreated(CardBriefAttachment $brief, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $brief->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $attributes = $brief->getAttributes();
                unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
                $attributes['card_id'] = $member->id;
                CardBriefAttachment::create($attributes);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncBriefAttachmentDeleted(CardBriefAttachment $brief, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $brief->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                CardBriefAttachment::query()
                    ->where('card_id', $member->id)
                    ->where(fn ($query) => $query
                        ->where('file_path', $brief->file_path)
                        ->orWhere('link_url', $brief->link_url))
                    ->delete();
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // LABEL & BRAND
    // ============================================

    public function syncLabel(Card $card, string $labelId, bool $attach, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $attach
                    ? $member->labels()->syncWithoutDetaching([$labelId])
                    : $member->labels()->detach($labelId);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncBrand(Card $card, Brand $brand, bool $attach, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $target = Brand::query()
                    ->where('campaign_id', $member->board?->campaign_id ?? $member->campaign_id)
                    ->where('name', $brand->name)
                    ->first();

                if ($attach && ! $target) {
                    $target = Brand::create([
                        'name' => $brand->name,
                        'color' => $brand->color,
                        'campaign_id' => $member->board?->campaign_id ?? $member->campaign_id,
                    ]);
                }

                if ($target) {
                    $attach
                        ? $member->brands()->syncWithoutDetaching([$target->id])
                        : $member->brands()->detach($target->id);
                }
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // UNASSIGN & DELETE
    // ============================================

    /**
     * Unassign lintas divisi: lepas user dari copy di division-nya. Bila copy
     * tidak lagi punya assignee dari division tersebut, copy dihapus namun
     * activity log tetap tersimpan (tabel terpisah, tidak cascade).
     */
    public function handleUnassign(Card $card, User $removed, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $removedDivisionIds = $removed->divisions()->pluck('divisions.id')->map(fn ($id) => (string) $id);

        if ($removedDivisionIds->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                $memberDivisionId = $member->board?->campaign?->workspace?->division_id
                    ? (string) $member->board->campaign->workspace->division_id
                    : null;

                if (! $memberDivisionId || ! $removedDivisionIds->contains($memberDivisionId)) {
                    continue;
                }

                if ($member->is($card)) {
                    continue;
                }

                $member->assignees()->detach($removed->id);

                $remaining = $member->assignees()->count();

                ActivityLogService::log(
                    $actor,
                    'card',
                    (string) $member->id,
                    'member_unassigned',
                    "Menghapus member '{$removed->name}' dari copy '{$member->title}' (mirror lintas divisi)",
                    [
                        'card_id' => (string) $member->id,
                        'family_root_id' => $card->familyRootId(),
                        'unassigned_user_id' => (string) $removed->id,
                    ]
                );

                if ($remaining === 0) {
                    $title = $member->title;
                    $member->delete();

                    ActivityLogService::log(
                        $actor,
                        'card',
                        $card->familyRootId(),
                        'mirror_removed',
                        "Menghapus copy '{$title}' karena tidak lagi memiliki assignee lintas divisi",
                        ['card_id' => $card->familyRootId(), 'family_root_id' => $card->familyRootId()]
                    );
                }
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    /**
     * Hapus family: hanya pemilik card asli (created_by), admin, atau super
     * admin yang boleh menghapus. Hapus asli => seluruh copy ikut terhapus.
     * Hapus copy => hanya copy itu yang terhapus.
     */
    public function canDeleteFamily(User $actor, Card $card): bool
    {
        if ($actor->isSuperAdmin() || $actor->isAdmin()) {
            return true;
        }

        $rootId = $card->familyRootId();
        $root = $card->parent_card_id
            ? Card::query()->whereKey($rootId)->first()
            : $card;

        return $root && (string) $root->created_by === (string) $actor->id;
    }

    public function deleteFamily(Card $card, User $actor): void
    {
        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                ActivityLogService::log(
                    $actor,
                    'card',
                    $card->familyRootId(),
                    'deleted',
                    "Menghapus ".($member->is_cross_division_copy ? "copy '{$member->title}'" : "card '{$member->title}'")." beserta mirror lintas divisinya",
                    [
                        'card_id' => (string) $member->id,
                        'family_root_id' => $card->familyRootId(),
                    ]
                );

                $member->delete();
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    /**
     * Dipanggil saat campaign dihapus: catat orphan pada family sumber dan
     * beri tahu assignee copy bahwa tugasnya ikut terhapus (cascade DB).
     */
    public function handleCampaignDeleted(Campaign $campaign, User $actor): void
    {
        $copies = Card::query()
            ->where('is_cross_division_copy', true)
            ->whereHas('board', fn ($boardQuery) => $boardQuery
                ->where('campaign_id', $campaign->id))
            ->with(['assignees:id', 'board'])
            ->get();

        if ($copies->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($copies as $copy) {
                $rootId = $copy->familyRootId();

                ActivityLogService::log(
                    $actor,
                    'card',
                    $rootId,
                    'mirror_orphaned',
                    "Copy '{$copy->title}' ikut terhapus karena campaign '{$campaign->name}' dihapus",
                    [
                        'card_id' => $rootId,
                        'family_root_id' => $rootId,
                        'copy_id' => (string) $copy->id,
                        'campaign_id' => (string) $campaign->id,
                    ]
                );

                foreach ($copy->assignees as $assignee) {
                    \App\Models\Notification::create([
                        'user_id' => $assignee->id,
                        'type' => 'mirror_orphaned',
                        'title' => 'Tugas lintas divisi terhapus',
                        'body' => "Copy '{$copy->title}' ikut terhapus karena campaign '{$campaign->name}' dihapus.",
                        'data' => [
                            'family_root_id' => $rootId,
                            'copy_id' => (string) $copy->id,
                            'campaign_id' => (string) $campaign->id,
                        ],
                        'is_read' => false,
                    ]);
                }
            }
        } finally {
            Card::$isMirroring = false;
        }
    }
}
