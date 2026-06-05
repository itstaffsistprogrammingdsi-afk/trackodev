<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Division;
use App\Models\Workspace;
use App\Models\Campaign;
use App\Models\Board;
use App\Models\Card;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * MAIN DASHBOARD ENTRY
     */
    public function index(Request $request)
    {
        $scope = $request->query('scope', 'global'); // global | me
        $range = $request->query('range', 'all');    // all | today | week | month

        $user = $request->user();

        return response()->json([
            'scope' => $scope,
            'range' => $range,
            'stats' => $this->stats($user, $scope),
            'activities' => $this->activities($user, $scope, $range),
        ]);
    }

    /**
     * =========================
     * STATS (SAAS SAFE)
     * =========================
     */
    private function stats($user, string $scope): array
    {
        $isSuperAdmin =
            method_exists($user, 'isSuperAdmin') &&
            $user->isSuperAdmin();

        /**
         * GLOBAL MODE (ADMIN)
         */
        if ($scope === 'global' && $isSuperAdmin) {
            return [
                'users' => User::count(),
                'divisions' => Division::count(),
                'workspaces' => Workspace::count(),
                'campaigns' => Campaign::count(),
                'boards' => Board::count(),
                'cards' => Card::count(),
                'activities' => ActivityLog::count(),
            ];
        }

        /**
         * PERSONAL / USER MODE
         * (IMPORTANT: KEEP SAME KEY STRUCTURE)
         */
        return [
            'users' => 1, // self reference (biar UI tetap aman)
            'divisions' => 0,

            'workspaces' => Workspace::where('user_id', $user->id)->count(),

            'campaigns' => method_exists($user, 'campaigns')
                ? $user->campaigns()->count()
                : Campaign::where('user_id', $user->id)->count(),

            'boards' => Board::where('user_id', $user->id)->count(),

            'cards' => method_exists($user, 'cards')
                ? $user->cards()->count()
                : Card::where('created_by', $user->id)->count(),

            'activities' => ActivityLog::where('user_id', $user->id)->count(),
        ];
    }

    /**
     * =========================
     * ACTIVITIES (PAGINATED)
     * =========================
     */
    private function activities($user, string $scope, string $range)
    {
        $query = ActivityLog::with('user')->latest();

        /**
         * SCOPE FILTER
         */
        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        /**
         * RANGE FILTER
         */
        switch ($range) {
            case 'today':
                $query->whereDate('created_at', now()->toDateString());
                break;

            case 'week':
                $query->whereBetween('created_at', [
                    now()->startOfWeek(),
                    now()->endOfWeek(),
                ]);
                break;

            case 'month':
                $query->whereMonth('created_at', now()->month);
                break;

            case 'all':
            default:
                // no filter
                break;
        }

        /**
         * PAGINATION (4 ITEMS PER PAGE)
         */
        $logs = $query->paginate(4);

        return [
            'data' => $logs->getCollection()->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user' => $log->user?->name ?? 'System',
                    'action' => $log->action,
                    'description' => $log->description,
                    'entity_type' => $log->entity_type,
                    'created_at' => $log->created_at?->toISOString(),
                ];
            })->values(),

            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ];
    }
}