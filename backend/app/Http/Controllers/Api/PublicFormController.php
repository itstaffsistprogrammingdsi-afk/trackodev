<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Http\Request;

class PublicFormController extends Controller
{
    public function show($slug)
    {
        $form = Form::with('fields')
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($form);
    }

public function submit(Request $request, $slug)
{
    $form = Form::with('fields')
        ->where('slug', $slug)
        ->firstOrFail();

    $answers = [];

    foreach ($form->fields as $field) {

        $name = $field->name;

        // FILE UPLOAD
        if ($request->hasFile($name)) {

            $file = $request->file($name);

            // MULTIPLE FILES
            if (is_array($file)) {

                $paths = [];

                foreach ($file as $f) {
                    $paths[] = $f->store('forms', 'public');
                }

                $answers[$name] = $paths;
            }

            // SINGLE FILE
            else {

                $path = $file->store('forms', 'public');

                $answers[$name] = $path;
            }
        }

        // NORMAL INPUT
        else {

            $answers[$name] = $request->input($name);
        }
    }

    $submission = FormSubmission::create([
        'form_id' => $form->id,
        'status' => 'submitted',
        'data' => $answers,
    ]);

    return response()->json([
        'message' => 'Submitted',
        'submission' => $submission,
    ]);
}
}