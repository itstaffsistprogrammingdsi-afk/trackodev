<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use App\Services\ActivityLogService;

class FormController extends Controller
{
    public function index()
    {
        $forms = Form::with('creator')
            ->latest()
            ->get();

        return response()->json($forms);
    }

    public function store(Request $request)
    {
        $request->validate([
            // 'workspace_id' => 'required|exists:workspaces,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'header_image' => 'nullable|image|max:2048',
        ]);

        $imagePath = null;

        if ($request->hasFile('header_image')) {
            $imagePath = $request->file('header_image')
                ->store('forms/header', 'public');
        }

        $form = Form::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name . '-' . uniqid()),
            'description' => $request->description,
            'header_image' => $imagePath,
            'show_note' => $request->boolean('show_note'),
            'note_content' => $request->note_content,
            'created_by' => auth()->id(),
            'is_active' => true,
        ]);

        ActivityLogService::log(
            auth()->user(),
            'created',
            'form',
            $form->id,
            "Membuat form '{$form->name}'"
        );

        return response()->json($form, 201);
    }

    public function show($id)
    {
        $form = Form::with([
            'fields',
            'submissions'
        ])->findOrFail($id);

        return response()->json($form);
    }

    public function update(Request $request, $id)
    {
        $form = Form::findOrFail($id);

        $data = $request->only([
            'workspace_id',
            'name',
            'description',
            'show_note',
            'note_content',
            'is_active',
        ]);

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
            'updated',
            'form',
            $form->id,
            "Mengupdate form '{$form->name}'"
        );

        return response()->json($form);
    }

    public function destroy($id)
    {
        $form = Form::findOrFail($id);

        ActivityLogService::log(
            auth()->user(),
            'deleted',
            'form',
            $form->id,
            "Menghapus form '{$form->name}'"
        );

        if ($form->header_image) {
            Storage::disk('public')->delete($form->header_image);
        }

        $form->delete();

        return response()->json([
            'message' => 'Form deleted successfully'
        ]);
    }
}
