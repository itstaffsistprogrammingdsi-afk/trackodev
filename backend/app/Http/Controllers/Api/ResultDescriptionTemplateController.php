<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResultDescriptionTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ResultDescriptionTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => ResultDescriptionTemplate::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user->isAdmin() || $user->isSuperAdmin(),
            403,
            'Hanya admin dan super admin yang dapat membuat template result description.'
        );

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('result_description_templates', 'name'),
            ],
        ]);

        $template = ResultDescriptionTemplate::create([
            'name' => $validated['name'],
            'created_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Template result description berhasil dibuat.',
            'data' => $template->only(['id', 'name']),
        ], 201);
    }
}
