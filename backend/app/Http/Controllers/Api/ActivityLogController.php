<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormField;
use App\Models\Brand;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Support\ResourceAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index()
    {
        return ActivityLog::with('user')
            ->latest()
            ->paginate(50);
    }

    public function cardActivities(Request $request, Card $card): JsonResponse
    {
        abort_unless(ResourceAccess::card(auth()->user(), $card), 403, 'Unauthorized');

        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'category' => ['sometimes', 'in:all,changes,tasks,comments,files'],
        ]);

        $category = $validated['category'] ?? 'all';
        $limit = $validated['limit'] ?? 8;

        $query = ActivityLog::with('user')
            ->where(function ($query) use ($card) {
                $query->where(function ($q) use ($card) {
                    $q->where('entity_type', 'card')
                        ->where('entity_id', $card->id);
                });

                $query->orWhere('meta->card_id', (string) $card->id);
            })
            ->whereNotIn('action', ['downloaded', 'reordered']);

        match ($category) {
            'changes' => $query->where('entity_type', 'card'),
            'tasks' => $query->whereIn('entity_type', ['task', 'subtask']),
            'comments' => $query->where('entity_type', 'card_comment'),
            'files' => $query->whereIn('entity_type', ['card_attachment', 'card_brief_attachment']),
            default => null,
        };

        $entityCounts = (clone $query)
            ->selectRaw('entity_type, COUNT(*) as aggregate')
            ->groupBy('entity_type')
            ->pluck('aggregate', 'entity_type');

        $categoryCounts = [
            'changes' => (int) ($entityCounts['card'] ?? 0),
            'tasks' => (int) ($entityCounts['task'] ?? 0) + (int) ($entityCounts['subtask'] ?? 0),
            'comments' => (int) ($entityCounts['card_comment'] ?? 0),
            'files' => (int) ($entityCounts['card_attachment'] ?? 0)
                + (int) ($entityCounts['card_brief_attachment'] ?? 0),
        ];
        arsort($categoryCounts);
        $dominantCategory = array_key_first($categoryCounts);

        $topContributor = (clone $query)
            ->whereNotNull('user_id')
            ->selectRaw('user_id, COUNT(*) as aggregate')
            ->groupBy('user_id')
            ->orderByDesc('aggregate')
            ->first();

        $topUser = $topContributor
            ? User::query()->find($topContributor->user_id)
            : null;

        $lastActivityAt = (clone $query)->max('created_at');
        $activities = $query->latest()->paginate($limit);

        return response()->json([
            'success' => true,
            'card_id' => $card->id,
            'total_logs' => $activities->total(),
            'current_page' => $activities->currentPage(),
            'last_page' => $activities->lastPage(),
            'has_more' => $activities->hasMorePages(),
            'category' => $category,
            'insight' => [
                'last_activity_at' => $lastActivityAt,
                'dominant_category' => ($categoryCounts[$dominantCategory] ?? 0) > 0
                    ? $dominantCategory
                    : null,
                'dominant_count' => $categoryCounts[$dominantCategory] ?? 0,
                'most_active_user' => $topUser ? [
                    'id' => $topUser->id,
                    'name' => $topUser->name,
                    'activity_count' => (int) $topContributor->aggregate,
                ] : null,
            ],
            'activities' => $activities->items(),
        ]);
    }

    /**
     * Activity audit feed untuk satu division.
     *
     * ActivityLog menyimpan entity polymorphic sederhana, jadi scope division
     * dibentuk dari seluruh resource yang berada di workspace division tersebut
     * (termasuk task, komentar, attachment, form, dan brand). Guest lintas
     * division hanya melihat workspace yang memang mereka ikuti.
     */
    public function divisionActivities(Request $request, Division $division): JsonResponse
    {
        $user = $request->user();
        $access = $this->resolveDivisionAccess($division, $user);

        abort_unless($access !== 'none', 403, 'Anda tidak memiliki akses ke aktivitas division ini.');

        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'category' => ['sometimes', 'in:all,create,update,delete,comment'],
            'date_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            // Alias start/end dipertahankan supaya konsisten dengan filter
            // tanggal pada modul report yang sudah ada.
            'start_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'end_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);

        $category = $validated['category'] ?? 'all';
        $limit = $validated['limit'] ?? 15;
        $dateFrom = $validated['date_from'] ?? $validated['start_date'] ?? null;
        $dateTo = $validated['date_to'] ?? $validated['end_date'] ?? null;

        if ($dateFrom && $dateTo && $dateFrom > $dateTo) {
            return response()->json([
                'message' => 'Tanggal mulai tidak boleh melebihi tanggal akhir.',
                'errors' => [
                    'date_to' => ['Tanggal akhir harus sama atau setelah tanggal mulai.'],
                ],
            ], 422);
        }

        $workspaceIds = $division->workspaces()
            ->when($access === 'guest', function (Builder $query) use ($user) {
                $query->whereHas('members', fn (Builder $members) =>
                    $members->where('users.id', $user->id)
                );
            })
            ->pluck('workspaces.id');

        $campaignIds = Campaign::query()
            ->whereIn('workspace_id', $workspaceIds)
            ->pluck('campaigns.id');
        $boardIds = Board::query()
            ->whereIn('campaign_id', $campaignIds)
            ->pluck('boards.id');
        $cardIds = Card::query()
            ->where(function (Builder $query) use ($campaignIds, $boardIds) {
                $query->whereIn('campaign_id', $campaignIds)
                    ->orWhereIn('board_id', $boardIds);
            })
            ->pluck('cards.id');
        $taskIds = Task::query()
            ->whereIn('card_id', $cardIds)
            ->pluck('tasks.id');
        $subtaskIds = Subtask::query()
            ->whereIn('task_id', $taskIds)
            ->pluck('subtasks.id');
        $commentIds = CardComment::query()
            ->whereIn('card_id', $cardIds)
            ->pluck('card_comments.id');
        $attachmentIds = CardAttachment::query()
            ->whereIn('card_id', $cardIds)
            ->pluck('card_attachments.id');
        $briefAttachmentIds = CardBriefAttachment::query()
            ->whereIn('card_id', $cardIds)
            ->pluck('card_brief_attachments.id');
        $formIds = Form::query()
            ->whereIn('workspace_id', $workspaceIds)
            ->pluck('forms.id');
        $formFieldIds = FormField::query()
            ->whereIn('form_id', $formIds)
            ->pluck('form_fields.id');
        $brandIds = Brand::query()
            ->whereIn('campaign_id', $campaignIds)
            ->pluck('brands.id');

        $query = ActivityLog::with('user')
            ->where(function (Builder $query) use (
                $access,
                $division,
                $workspaceIds,
                $campaignIds,
                $boardIds,
                $cardIds,
                $taskIds,
                $subtaskIds,
                $commentIds,
                $attachmentIds,
                $briefAttachmentIds,
                $formIds,
                $formFieldIds,
                $brandIds,
            ) {
                // Guest lintas division hanya boleh melihat resource pada
                // workspace yang diikutinya; log level division bersifat
                // internal dan hanya ditampilkan untuk anggota resmi/admin.
                if ($access === 'full') {
                    $query->where(function (Builder $q) use ($division) {
                        $q->where('entity_type', 'division')
                            ->where('entity_id', $division->id);
                    });
                } else {
                    $query->whereRaw('0 = 1');
                }

                $query
                    ->orWhere(function (Builder $q) use ($workspaceIds, $division) {
                        $q->where('entity_type', 'workspace')
                            ->where(function (Builder $scope) use ($workspaceIds, $division) {
                                $scope->whereIn('entity_id', $workspaceIds)
                                    ->orWhere('meta->division_id', (string) $division->id);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($campaignIds, $workspaceIds) {
                        $q->where('entity_type', 'campaign')
                            ->where(function (Builder $scope) use ($campaignIds, $workspaceIds) {
                                $scope->whereIn('entity_id', $campaignIds)
                                    ->orWhereIn('meta->workspace_id', $workspaceIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($boardIds, $campaignIds) {
                        $q->where('entity_type', 'board')
                            ->where(function (Builder $scope) use ($boardIds, $campaignIds) {
                                $scope->whereIn('entity_id', $boardIds)
                                    ->orWhereIn('meta->campaign_id', $campaignIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($cardIds, $campaignIds, $boardIds) {
                        $q->where('entity_type', 'card')
                            ->where(function (Builder $scope) use ($cardIds, $campaignIds, $boardIds) {
                                $scope->whereIn('entity_id', $cardIds)
                                    ->orWhereIn('meta->campaign_id', $campaignIds)
                                    ->orWhereIn('meta->board_id', $boardIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($taskIds, $cardIds) {
                        $q->where('entity_type', 'task')
                            ->where(function (Builder $scope) use ($taskIds, $cardIds) {
                                $scope->whereIn('entity_id', $taskIds)
                                    ->orWhereIn('meta->card_id', $cardIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($subtaskIds, $cardIds) {
                        $q->where('entity_type', 'subtask')
                            ->where(function (Builder $scope) use ($subtaskIds, $cardIds) {
                                $scope->whereIn('entity_id', $subtaskIds)
                                    ->orWhereIn('meta->card_id', $cardIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($commentIds, $cardIds) {
                        $q->where('entity_type', 'card_comment')
                            ->where(function (Builder $scope) use ($commentIds, $cardIds) {
                                $scope->whereIn('entity_id', $commentIds)
                                    ->orWhereIn('meta->card_id', $cardIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($attachmentIds, $cardIds) {
                        $q->where('entity_type', 'card_attachment')
                            ->where(function (Builder $scope) use ($attachmentIds, $cardIds) {
                                $scope->whereIn('entity_id', $attachmentIds)
                                    ->orWhereIn('meta->card_id', $cardIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($briefAttachmentIds, $cardIds) {
                        $q->where('entity_type', 'card_brief_attachment')
                            ->where(function (Builder $scope) use ($briefAttachmentIds, $cardIds) {
                                $scope->whereIn('entity_id', $briefAttachmentIds)
                                    ->orWhereIn('meta->card_id', $cardIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($formIds, $workspaceIds) {
                        $q->where('entity_type', 'form')
                            ->where(function (Builder $scope) use ($formIds, $workspaceIds) {
                                $scope->whereIn('entity_id', $formIds)
                                    ->orWhereIn('meta->workspace_id', $workspaceIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($formFieldIds, $formIds) {
                        $q->where('entity_type', 'form_field')
                            ->where(function (Builder $scope) use ($formFieldIds, $formIds) {
                                $scope->whereIn('entity_id', $formFieldIds)
                                    ->orWhereIn('meta->form_id', $formIds);
                            });
                    })
                    ->orWhere(function (Builder $q) use ($brandIds, $campaignIds) {
                        $q->where('entity_type', 'brand')
                            ->where(function (Builder $scope) use ($brandIds, $campaignIds) {
                                $scope->whereIn('entity_id', $brandIds)
                                    ->orWhereIn('meta->campaign_id', $campaignIds);
                            });
                    });
            });

        $this->applyDivisionActivityCategory($query, $category);

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $activities = $query->latest()->paginate($limit);
        $items = collect($activities->items())
            ->map(function (ActivityLog $activity): array {
                return array_merge(
                    $activity->toArray(),
                    ['activity_type' => $this->divisionActivityType($activity)]
                );
            })
            ->values();

        return response()->json([
            'success' => true,
            'division_id' => (string) $division->id,
            'category' => $category,
            'total_logs' => $activities->total(),
            'current_page' => $activities->currentPage(),
            'last_page' => $activities->lastPage(),
            'has_more' => $activities->hasMorePages(),
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'activities' => $items,
        ]);
    }

    private function resolveDivisionAccess(Division $division, User $user): string
    {
        if ($user->isSuperAdmin()) return 'full';

        if ($division->users()->where('users.id', $user->id)->exists()) {
            return 'full';
        }

        return $division->workspaces()
            ->whereHas('members', fn (Builder $query) => $query->where('users.id', $user->id))
            ->exists()
            ? 'guest'
            : 'none';
    }

    private function applyDivisionActivityCategory(Builder $query, string $category): void
    {
        if ($category === 'comment') {
            $query->where('entity_type', 'card_comment');
            return;
        }

        $suffixes = match ($category) {
            'create' => ['created', 'added', 'attached', 'added_member'],
            'update' => ['updated', 'assigned', 'moved', 'completed', 'reopened', 'restored', 'archived', 'archived_for_revision', 'reordered', 'submitted'],
            'delete' => ['deleted', 'removed', 'detached', 'unassigned', 'removed_member'],
            default => ['created', 'added', 'attached', 'added_member', 'updated', 'assigned', 'moved', 'completed', 'reopened', 'restored', 'archived', 'archived_for_revision', 'reordered', 'submitted', 'deleted', 'removed', 'detached', 'unassigned', 'removed_member'],
        };

        // "Semua" juga harus memuat komentar, sedangkan filter lain
        // sengaja hanya memuat aksi resource non-komentar.
        if ($category === 'all') {
            $query->where(function (Builder $scope) use ($suffixes) {
                $scope->where('entity_type', 'card_comment')
                    ->orWhere(function (Builder $nonComment) use ($suffixes) {
                        $nonComment
                            ->where('entity_type', '!=', 'card_comment')
                            ->where(function (Builder $actions) use ($suffixes) {
                                foreach ($suffixes as $suffix) {
                                    $actions->orWhere('action', 'like', '%'.$suffix);
                                }
                            });
                    });
            });
            return;
        }

        $query
            ->where('entity_type', '!=', 'card_comment')
            ->where(function (Builder $actions) use ($suffixes) {
                foreach ($suffixes as $suffix) {
                    $actions->orWhere('action', 'like', '%'.$suffix);
                }
            });
    }

    private function divisionActivityType(ActivityLog $activity): string
    {
        if ($activity->entity_type === 'card_comment') return 'comment';

        $action = strtolower((string) $activity->action);
        if (preg_match('/(?:created|added|attached|added_member)$/', $action)) return 'create';
        if (preg_match('/(?:deleted|removed|detached|unassigned|removed_member)$/', $action)) return 'delete';

        return 'update';
    }
}
