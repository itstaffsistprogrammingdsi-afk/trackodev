<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicFormController extends Controller
{

// =========================
    // LIST PUBLIC FORMS
    // =========================
    public function index()
    {
        try {
            // Mengambil form yang aktif saja untuk kebutuhan publik
            $forms = Form::where('is_active', true)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($forms);

        } catch (\Throwable $e) {
            Log::error('Public form index error', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Server error'
            ], 500);
        }
    }
    
    // =========================
    // SHOW PUBLIC FORM
    // =========================
    public function show($slug)
    {
        try {
            $form = Form::with('fields')
                ->where('slug', $slug)
                ->where('is_active', true)
                ->first();

            if (!$form) {
                return response()->json([
                    'message' => 'Form not found',
                    'slug' => $slug
                ], 404);
            }

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
}