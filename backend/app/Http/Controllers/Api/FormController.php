<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\Workspace;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FormController extends Controller
{
    public function index(Request $request)
    {
        $forms = Form::with('creator')
            ->latest()
            ->get()
            ->filter(fn (Form $form) => ResourceAccess::form($request->user(), $form))
            ->values();

        return response()->json($forms);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'workspace_id' => 'nullable|uuid|exists:workspaces,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'header_image' => 'nullable|image|max:2048',
            'show_note' => 'nullable|boolean',
            'note_content' => 'nullable|string|max:10000',
        ]);

        if (! empty($validated['workspace_id'])) {
            $workspace = Workspace::findOrFail($validated['workspace_id']);
            abort_unless($workspace->canBeAccessedBy($request->user()), 403, 'Unauthorized');
        }

        $imagePath = null;

        if ($request->hasFile('header_image')) {
            $imagePath = $request->file('header_image')
                ->store('forms/header', 'public');
        }

        $form = Form::create([
            'workspace_id' => $validated['workspace_id'] ?? null,
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name'].'-'.uniqid()),
            'description' => $validated['description'] ?? null,
            'header_image' => $imagePath,
            'show_note' => $request->boolean('show_note'),
            'note_content' => $validated['note_content'] ?? null,
            'created_by' => auth()->id(),
            'is_active' => true,
        ]);

        ActivityLogService::log(
            auth()->user(),

            'form',
            (string) $form->id,
            'created',
            "Membuat form '{$form->name}'"
        );

        return response()->json($form, 201);
    }

    public function show(Request $request, $id)
    {
        $form = Form::with([
            'fields',
            'submissions',
        ])->findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        return response()->json($form);
    }

    public function update(Request $request, $id)
    {
        $form = Form::findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        $data = $request->validate([
            'workspace_id' => 'sometimes|nullable|uuid|exists:workspaces,id',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'show_note' => 'sometimes|boolean',
            'note_content' => 'sometimes|nullable|string|max:10000',
            'is_active' => 'sometimes|boolean',
            'header_image' => 'sometimes|nullable|image|max:2048',
        ]);

        if (array_key_exists('workspace_id', $data) && $data['workspace_id'] !== null) {
            $workspace = Workspace::findOrFail($data['workspace_id']);
            abort_unless($workspace->canBeAccessedBy($request->user()), 403, 'Unauthorized');
        }

        unset($data['header_image']);

        if ($request->hasFile('header_image')) {
            if ($form->header_image) {
                Storage::disk('public')->delete($form->header_image);
            }

            $data['header_image'] = $request->file('header_image')
                ->store('forms/header', 'public');
        }

        $form->update($data);

        ActivityLogService::log(
            auth()->user(),

            'form',
            (string) $form->id,
            'updated',
            "Mengupdate form '{$form->name}'"
        );

        return response()->json($form);
    }

    public function destroy(Request $request, $id)
    {
        $form = Form::findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        ActivityLogService::log(
            auth()->user(),

            'form',
            (string) $form->id,
            'deleted',
            "Menghapus form '{$form->name}'"
        );

        if ($form->header_image) {
            Storage::disk('public')->delete($form->header_image);
        }

        $form->delete();

        return response()->json([
            'message' => 'Form deleted successfully',
        ]);
    }
}
