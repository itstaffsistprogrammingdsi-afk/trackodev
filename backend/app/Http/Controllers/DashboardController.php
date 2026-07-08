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
    public function index(Request $request)
    {
        $scope = $request->query('scope', 'global');
        $range = $request->query('range', 'all');

        $user = $request->user();

        return response()->json([
            'stats'   => $this->stats($user, $scope),
            'activities' => $this->activities($user, $scope, $range),
            // tambahan untuk chart (opsional)
            'trend'   => $this->trend($user, $scope, $range),
        ]);
    }

    /**
     * STATISTIK (SAFE UNTUK SUPER ADMIN & USER)
     */
    private function stats($user, string $scope): array
    {
        $isSuperAdmin = $user->isSuperAdmin();

        // ============================================
        // GLOBAL (Super Admin)
        // ============================================
        if ($scope === 'global' && $isSuperAdmin) {
            return [
                'users'      => User::count(),
                'divisions'  => Division::count(),
                'workspaces' => Workspace::count(),
                'campaigns'  => Campaign::count(),
                'boards'     => Board::count(),
                'cards'      => Card::count(),
                'activities' => ActivityLog::count(),
            ];
        }

        // ============================================
        // PERSONAL (User sendiri atau "me")
        // ============================================
        return [
            'users'      => 1, // self reference
            'divisions'  => 0,
            'workspaces' => $user->workspaces()->count(),
            'campaigns'  => $user->campaigns()->count(),
            'boards'     => Board::whereHas('campaign', function($q) use ($user) {
                $q->whereIn('campaigns.id', $user->campaigns()->pluck('id'));
            })->count(),
            'cards'      => Card::whereIn('campaign_id', $user->campaigns()->pluck('id'))->count(),
            'activities' => ActivityLog::where('user_id', $user->id)->count(),
        ];
    }

    /**
     * AKTIVITAS TERBARU (PAGINATED)
     */
    private function activities($user, string $scope, string $range)
    {
        $query = ActivityLog::with('user')->latest();

        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        // Filter rentang waktu
        switch ($range) {
            case 'today':
                $query->whereDate('created_at', now()->toDateString());
                break;
            case 'week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('created_at', now()->month);
                break;
            default:
                // all
                break;
        }

        $logs = $query->paginate(4);

        return [
            'data' => $logs->getCollection()->map(function ($log) {
                return [
                    'id'          => $log->id,
                    'user'        => $log->user?->name ?? 'System',
                    'action'      => $log->action,
                    'description' => $log->description,
                    'entity_type' => $log->entity_type,
                    'created_at'  => $log->created_at?->toISOString(),
                ];
            })->values(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ],
        ];
    }

    /**
     * TREN AKTIVITAS (untuk chart)
     */
    private function trend($user, string $scope, string $range)
    {
        $query = ActivityLog::query();

        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        // Ambil data 7 hari terakhir
        $start = now()->subDays(6)->startOfDay();
        $end   = now()->endOfDay();

        $query->whereBetween('created_at', [$start, $end]);

        $trend = $query->selectRaw('DATE(created_at) as date, count(*) as total')
                       ->groupBy('date')
                       ->orderBy('date')
                       ->get();

        // Isi tanggal yang kosong dengan 0
        $dates = collect();
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $found = $trend->firstWhere('date', $date);
            $dates->push([
                'date'  => $date,
                'total' => $found ? $found->total : 0,
            ]);
        }

        return $dates;
    }
}