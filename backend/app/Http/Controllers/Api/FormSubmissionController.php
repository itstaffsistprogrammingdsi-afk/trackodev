<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use Illuminate\Http\Request;

class FormSubmissionController extends Controller
{
    public function index($formId)
    {
        $submissions = FormSubmission::with([
            'form.workspace',
            'user',
            'card',

            // TAMBAHAN
            'assignment.coordinator',
            'assignment.designer',
        ])
            ->where('form_id', $formId)
            ->latest()
            ->get();

        return response()->json($submissions);
    }

    public function store(Request $request, $formId)
    {
        $form = Form::findOrFail($formId);

        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => auth()->id(),
            'data' => $request->data,
            'status' => 'submitted',
        ]);

        return response()->json($submission, 201);
    }

    public function show($id)
    {
        $submission = FormSubmission::with([
            'form.workspace',
            'user',
            'card',

            // TAMBAHAN
            'assignment.coordinator',
            'assignment.designer',
        ])->findOrFail($id);

        return response()->json($submission);
    }

    public function forwardToCard(Request $request, $id)
    {
        $submission = FormSubmission::findOrFail($id);

        $submission->update([
            'card_id' => $request->card_id,
            'status' => 'forwarded',
        ]);

        return response()->json([
            'message' => 'Submission forwarded to card',
            'data' => $submission
        ]);
    }
}
