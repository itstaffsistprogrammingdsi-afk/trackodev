<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        return response()->json([
            'totalTasks' => 120,
            'completedTasks' => 95,
            'completionRate' => 79.17,
            'totalResponses' => 340,
        ]);
    }

    public function charts(Request $request)
    {
        return response()->json([
            'tasksByMonth' => [
                ['month' => 'Jan', 'count' => 12],
                ['month' => 'Feb', 'count' => 20],
                ['month' => 'Mar', 'count' => 35],
            ],

            'responsesByMonth' => [
                ['month' => 'Jan', 'count' => 40],
                ['month' => 'Feb', 'count' => 65],
                ['month' => 'Mar', 'count' => 80],
            ],
        ]);
    }

    public function tasks(Request $request)
    {
        return response()->json([
            'data' => [],
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => 20,
            'total' => 0,
        ]);
    }

    public function responses(Request $request)
    {
        return response()->json([
            'data' => [],
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => 20,
            'total' => 0,
        ]);
    }

    public function memberPerformance(Request $request)
    {
        return response()->json([]);
    }

    public function divisionPerformance(Request $request)
    {
        return response()->json([]);
    }

    public function exportTasks(Request $request)
    {
        abort(501, 'Not implemented yet');
    }

    public function exportPdf(Request $request)
    {
        abort(501, 'Not implemented yet');
    }
}