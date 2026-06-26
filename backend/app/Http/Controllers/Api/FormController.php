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

    public function publicShow($slug)
{
    $form = Form::with([
            'fields' => function ($q) {
                $q->orderBy('order');
            }
        ])
        ->where('slug', $slug)
        ->where('is_active', true)
        ->where('is_published', true)
        ->firstOrFail();

    if ($form->header_image) {
        $form->header_image = asset('storage/' . $form->header_image);
    }

    return response()->json($form);
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
            
            'form',
            (string) $form->id,
            'created',
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
            
            'form',
            (string) $form->id,
            'updated',
            "Mengupdate form '{$form->name}'"
        );

        return response()->json($form);
    }

    public function destroy($id)
    {
        $form = Form::findOrFail($id);

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
            'message' => 'Form deleted successfully'
        ]);
    }

public function publish(Request $request, Form $form)
{
    $request->validate([
        'is_published' => 'required|boolean',
        'publish_order' => 'nullable|integer|min:0',
        'publish_category' => 'nullable|string|max:100',
        'publish_icon' => 'nullable|string|max:100',
        'publish_description' => 'nullable|string|max:1000',
    ]);

    $form->update([
        'is_published' => $request->is_published,
        'publish_order' => $request->publish_order ?? 0,
        'publish_category' => $request->publish_category,
        'publish_icon' => $request->publish_icon,
        'publish_description' => $request->publish_description,
    ]);

    return response()->json([
        'message' => 'Publish updated',
        'data' => $form,
    ]);
}

public function formCenter()
{
    $forms = Form::select([
            'id',
            'name',
            'slug',
            'header_image',
            'publish_category',
            'publish_icon',
            'publish_description',
            'publish_order',
        ])
        ->where('is_active', true)
        ->where('is_published', true)
        ->orderBy('publish_order')
        ->get()
        ->map(function ($form) {

            $form->header_image = $form->header_image
                ? asset('storage/' . $form->header_image)
                : null;

            return $form;
        });

    return response()->json($forms);
}
}
