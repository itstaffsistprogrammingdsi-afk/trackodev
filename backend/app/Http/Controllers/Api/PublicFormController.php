<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Server error',
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

            if (! $form) {
                return response()->json([
                    'message' => 'Form not found',
                    'slug' => $slug,
                ], 404);
            }

            return response()->json($form);

        } catch (\Throwable $e) {

            Log::error('Public form show error', [
                'slug' => $slug,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Server error',
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

            if (! $form) {
                return response()->json([
                    'message' => 'Form not found',
                ], 404);
            }

            $rules = [];
            // Field section hanya heading UI dan tidak boleh ikut divalidasi
            // atau disimpan sebagai jawaban.
            $visibleFields = $form->fields
                ->filter(fn ($field) => $field->type !== 'section')
                ->filter(fn ($field) => $this->isFieldVisible($form, $field, $request));

            foreach ($visibleFields as $field) {
                $presence = $field->is_required ? 'required' : 'nullable';

                $rules[$field->name] = match ($field->type) {
                    'number' => [$presence, 'numeric'],
                    'date' => [$presence, 'date_format:Y-m-d'],
                    'file' => [
                        $presence,
                        'file',
                        'max:11254',
                        'mimes:pdf,png,jpg,jpeg,gif,webp,doc,docx,xls,xlsx,ppt,pptx,csv,txt,zip',
                    ],
                    'checkbox' => [$presence, 'array', 'max:100'],
                    'select', 'radio' => [
                        $presence,
                        'string',
                        'max:255',
                        ...($field->allow_other
                            ? []
                            : [Rule::in($field->options ?? [])]),
                    ],
                    'textarea' => [$presence, 'string', 'max:10000'],
                    default => [$presence, 'string', 'max:2000'],
                };

                if ($field->type === 'checkbox') {
                    $rules[$field->name.'.*'] = [
                        'string',
                        'max:255',
                        ...($field->allow_other
                            ? []
                            : [Rule::in($field->options ?? [])]),
                    ];
                }
            }

            $request->validate($rules);
            $answers = [];

            foreach ($visibleFields as $field) {

                $name = $field->name;

                // =========================
                // FILE UPLOAD
                // =========================
                if ($field->type === 'file' && $request->hasFile($name)) {

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
            ], 201);

        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {

            Log::error('Public form submit error', [
                'slug' => $slug,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Server error',
            ], 500);
        }
    }

    private function isFieldVisible(Form $form, $field, Request $request): bool
    {
        if (! $field->depends_on_field_id) {
            return true;
        }

        $dependency = $form->fields->firstWhere('id', $field->depends_on_field_id);
        if (! $dependency) {
            return false;
        }

        $value = $request->input($dependency->name);
        $expected = (string) ($field->depends_on_value ?? '');

        if (is_array($value)) {
            return in_array($expected, array_map('strval', $value), true);
        }

        return (string) ($value ?? '') === $expected;
    }
}
