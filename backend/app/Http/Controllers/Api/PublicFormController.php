<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicFormController extends Controller
{


    public function index()
{
    $forms = Form::query()
        ->where('is_active', true)
        ->where('is_published', true)
        ->orderBy('publish_order')
        ->get([
            'id',
            'name',
            'slug',
            'header_image',
            'publish_category',
            'publish_icon',
            'publish_description',
            'publish_order',
        ])
        ->map(function ($form) {

            $form->header_image = $form->header_image
                ? asset('storage/'.$form->header_image)
                : null;

            return $form;
        });

    return response()->json($forms);
}
    // =========================
    // SHOW PUBLIC FORM
    // =========================
public function show($slug)
{
    try {

        $form = Form::with([
                'fields' => function ($q) {
                    $q->orderBy('order');
                }
            ])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->where('is_published', true)
            ->first();

        if (!$form) {
            return response()->json([
                'message' => 'Form not found'
            ], 404);
        }

        $form->header_image = $form->header_image
            ? asset('storage/'.$form->header_image)
            : null;

        return response()->json($form);

    } catch (\Throwable $e) {

        Log::error('Public form show error', [
            'slug' => $slug,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'message' => 'Server error'
        ], 500);
    }
}

    // =========================
    // SUBMIT PUBLIC FORM
    // =========================
    public function submit(Request $request, $slug)
    {
        try {
$form = Form::with('fields')
    ->where('slug', $slug)
    ->where('is_active', true)
    ->where('is_published', true)
    ->first();

            if (!$form) {
                return response()->json([
                    'message' => 'Form not found'
                ], 404);
            }

            $answers = [];

            foreach ($form->fields as $field) {

                $name = $field->name;

                // =========================
                // FILE UPLOAD
                // =========================
                if ($request->hasFile($name)) {

                    $file = $request->file($name);

                    // MULTIPLE FILES
                    if (is_array($file)) {

                        $paths = [];

                        foreach ($file as $f) {
                            $paths[] = $f->store('forms', 'public');
                        }

                        $answers[$name] = $paths;

                    } else {

                        // SINGLE FILE
                        $answers[$name] = $file->store('forms', 'public');
                    }

                } else {

                    // NORMAL INPUT
                    $answers[$name] = $request->input($name);
                }
            }

            $submission = FormSubmission::create([
                'form_id' => $form->id,
                'status' => 'submitted',
                'data' => $answers,
            ]);

            return response()->json([
                'message' => 'Submitted successfully',
                'submission' => $submission,
            ]);

        } catch (\Throwable $e) {

            Log::error('Public form submit error', [
                'slug' => $slug,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Server error'
            ], 500);
        }
    }

//     public function formCenter()
// {
//     $forms = Form::select([
//             'id',
//             'name',
//             'slug',
//             'header_image',
//             'publish_category',
//             'publish_icon',
//             'publish_description',
//             'publish_order',
//         ])
//         ->where('is_active', true)
//         ->where('is_published', true)
//         ->orderBy('publish_order')
//         ->get()
//         ->map(function ($form) {

//             $form->header_image = $form->header_image
//                 ? asset('storage/' . $form->header_image)
//                 : null;

//             return $form;
//         });

//     return response()->json($forms);
// }
}