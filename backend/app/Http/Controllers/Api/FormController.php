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
        $forms = Form::with(['creator.divisions', 'workspace', 'division'])
            ->latest()
            ->get()
            ->filter(fn (Form $form) => ResourceAccess::form($request->user(), $form))
            ->values();

        return response()->json($forms);
    }

    public function store(Request $request)
    {
        // Pilihan divisi yang dikirim eksplisit (termasuk kosong = "Umum")
        // dihormati apa adanya; yang tidak dikirim sama sekali diinferensi.
        $explicitDivision = $request->has('division_id');

        if ($request->input('division_id') === '') {
            $request->merge(['division_id' => null]);
        }

        $validated = $request->validate([
            'workspace_id' => 'nullable|uuid|exists:workspaces,id',
            'division_id' => 'nullable|uuid|exists:divisions,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'header_image' => 'nullable|image|max:2048',
            'theme_color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'show_note' => 'nullable|boolean',
            'note_content' => 'nullable|string|max:10000',
        ]);

        if (! empty($validated['workspace_id'])) {
            $workspace = Workspace::findOrFail($validated['workspace_id']);
            abort_unless($workspace->canBeAccessedBy($request->user()), 403, 'Unauthorized');
        }

        $divisionId = null;

        if ($explicitDivision) {
            $divisionId = $validated['division_id'] ?? null;
            $this->assertDivisionChoiceAllowed($request, $divisionId);
        } else {
            $memberDivisionIds = $request->user()->divisions()->pluck('divisions.id');

            if ($memberDivisionIds->count() === 1) {
                $divisionId = (string) $memberDivisionIds->first();
            }
        }

        $imagePath = null;

        if ($request->hasFile('header_image')) {
            $imagePath = $request->file('header_image')
                ->store('forms/header', 'public');
        }

        $form = Form::create([
            'workspace_id' => $validated['workspace_id'] ?? null,
            'division_id' => $divisionId,
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name'].'-'.uniqid()),
            'description' => $validated['description'] ?? null,
            'header_image' => $imagePath,
            'theme_color' => $validated['theme_color'] ?? null,
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
            "Membuat form '{$form->name}'",
            ['form_id' => (string) $form->id, 'workspace_id' => $form->workspace_id]
        );

        return response()->json($form, 201);
    }

    public function show(Request $request, $id)
    {
        $form = Form::with([
            'fields',
            'submissions',
            'division',
        ])->findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        return response()->json($form);
    }

    public function update(Request $request, $id)
    {
        $form = Form::findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        if ($request->input('division_id') === '') {
            $request->merge(['division_id' => null]);
        }

        $data = $request->validate([
            'workspace_id' => 'sometimes|nullable|uuid|exists:workspaces,id',
            'division_id' => 'sometimes|nullable|uuid|exists:divisions,id',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'show_note' => 'sometimes|boolean',
            'note_content' => 'sometimes|nullable|string|max:10000',
            'is_active' => 'sometimes|boolean',
            'header_image' => 'sometimes|nullable|image|max:2048',
            'theme_color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        if (array_key_exists('workspace_id', $data) && $data['workspace_id'] !== null) {
            $workspace = Workspace::findOrFail($data['workspace_id']);
            abort_unless($workspace->canBeAccessedBy($request->user()), 403, 'Unauthorized');
        }

        if (array_key_exists('division_id', $data)) {
            $this->assertDivisionChoiceAllowed($request, $data['division_id'] ?? null);
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
            "Mengupdate form '{$form->name}'",
            ['form_id' => (string) $form->id, 'workspace_id' => $form->workspace_id]
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
            "Menghapus form '{$form->name}'",
            ['form_id' => (string) $form->id, 'workspace_id' => $form->workspace_id]
        );

        if ($form->header_image) {
            Storage::disk('public')->delete($form->header_image);
        }

        $form->delete();

        return response()->json([
            'message' => 'Form deleted successfully',
        ]);
    }

    /**
     * Super admin / pemegang `division.view_all` boleh memilih divisi mana pun.
     * Selain itu, user hanya boleh memilih divisi tempat dia terdaftar.
     */
    private function assertDivisionChoiceAllowed(Request $request, ?string $divisionId): void
    {
        if ($divisionId === null) {
            return;
        }

        $user = $request->user();

        if ($user->isSuperAdmin() || $user->canViewAllDivisions()) {
            return;
        }

        abort_unless(
            $user->divisions()->where('divisions.id', $divisionId)->exists(),
            403,
            'Unauthorized'
        );
    }
}
