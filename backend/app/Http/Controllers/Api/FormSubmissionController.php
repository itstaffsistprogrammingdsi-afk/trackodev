<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Support\ResourceAccess;
use Illuminate\Http\Request;

class FormSubmissionController extends Controller
{
    public function index(Request $request, Form $form)
    {
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        $submissions = FormSubmission::with([
            'form.workspace',
            'user',
            'card',

            // TAMBAHAN
            'assignment.coordinator',
            'assignment.designer',
        ])
            ->where('form_id', $form->id)
            ->latest()
            ->get();

        return response()->json($submissions);
    }

    public function store(Request $request, Form $form)
    {
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        $validated = $request->validate([
            'data' => 'required|array|max:200',
        ]);

        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => auth()->id(),
            'data' => $validated['data'],
            'status' => 'submitted',
        ]);

        return response()->json($submission, 201);
    }

    public function show(Request $request, $id)
    {
        $submission = FormSubmission::with([
            'form.workspace',
            'user',
            'card',

            // TAMBAHAN
            'assignment.coordinator',
            'assignment.designer',
        ])->findOrFail($id);
        abort_unless(ResourceAccess::submission($request->user(), $submission), 403, 'Unauthorized');

        return response()->json($submission);
    }

    public function forwardToCard(Request $request, $id)
    {
        $submission = FormSubmission::findOrFail($id);
        abort_unless(ResourceAccess::submission($request->user(), $submission), 403, 'Unauthorized');

        $validated = $request->validate([
            'card_id' => 'required|uuid|exists:cards,id',
        ]);
        $card = Card::findOrFail($validated['card_id']);
        abort_unless(ResourceAccess::card($request->user(), $card), 403, 'Unauthorized');

        $submission->update([
            'card_id' => $card->id,
            'status' => 'forwarded',
        ]);

        return response()->json([
            'message' => 'Submission forwarded to card',
            'data' => $submission,
        ]);
    }
}
