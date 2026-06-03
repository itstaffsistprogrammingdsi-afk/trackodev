<?php

namespace App\Http\Controllers;
use App\Models\ActivityLog;         

class ActivityLogController extends Controller
{
    public function index()
{
    return ActivityLog::with('user')
        ->latest()
        ->paginate(50);
}
}
