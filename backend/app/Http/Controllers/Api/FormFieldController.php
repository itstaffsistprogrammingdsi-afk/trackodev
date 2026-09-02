<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormField;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FormFieldController extends Controller
{
    public function store(Request $request, Form $form)
    {
        abort_unless(ResourceAccess::form($request->user(), $form), 403, 'Unauthorized');

        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'type' => ['required', Rule::in($this->allowedTypes())],
            'is_required' => 'nullable|boolean',
            'options' => 'nullable|array|max:100',
            'options.*' => 'string|max:255|distinct',
            'allow_other' => 'nullable|boolean',
            'other_label' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'depends_on_field_id' => [
                'nullable',
                'uuid',
                Rule::exists('form_fields', 'id')->where('form_id', $form->id),
            ],
            'depends_on_value' => 'nullable|string|max:255',
        ]);

        $field = FormField::create([
            'form_id' => $form->id,
            'label' => $validated['label'],
            'name' => $this->uniqueName($form, $validated['label']),
            'type' => $validated['type'],
            'is_required' => $request->boolean('is_required'),
            'options' => $validated['options'] ?? null,
            'allow_other' => $request->boolean('allow_other'),
            'other_label' => $validated['other_label'] ?? null,
            'order' => $validated['order'] ?? 0,
            'depends_on_field_id' => $validated['depends_on_field_id'] ?? null,
            'depends_on_value' => $validated['depends_on_value'] ?? null,
        ]);

        ActivityLogService::log(
            $request->user(),
            'form_field',
            (string) $field->id,
            'created',
            "Membuat field form '{$field->label}'",
            [
                'form_id' => (string) $form->id,
                'workspace_id' => $form->workspace_id,
                'field_label' => $field->label,
            ]
        );

        return response()->json($field, 201);
    }

    public function update(Request $request, $id)
    {
        $field = FormField::findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $field->form), 403, 'Unauthorized');

        $validated = $request->validate([
            'label' => 'sometimes|required|string|max:255',
            'type' => ['sometimes', Rule::in($this->allowedTypes())],
            'is_required' => 'sometimes|boolean',
            'options' => 'sometimes|nullable|array|max:100',
            'options.*' => 'string|max:255|distinct',
            'allow_other' => 'sometimes|boolean',
            'other_label' => 'sometimes|nullable|string|max:255',
            'order' => 'sometimes|integer|min:0',
            'depends_on_field_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::notIn([$field->id]),
                Rule::exists('form_fields', 'id')->where('form_id', $field->form_id),
            ],
            'depends_on_value' => 'sometimes|nullable|string|max:255',
        ]);

        if (isset($validated['label'])) {
            $validated['name'] = $this->uniqueName(
                $field->form,
                $validated['label'],
                $field->id
            );
        }

        $field->update($validated);

        ActivityLogService::log(
            $request->user(),
            'form_field',
            (string) $field->id,
            'updated',
            "Mengupdate field form '{$field->label}'",
            [
                'form_id' => (string) $field->form_id,
                'workspace_id' => $field->form?->workspace_id,
                'field_label' => $field->label,
            ]
        );

        return response()->json($field);
    }

    public function destroy(Request $request, $id)
    {
        $field = FormField::findOrFail($id);
        abort_unless(ResourceAccess::form($request->user(), $field->form), 403, 'Unauthorized');

        $field->delete();

        ActivityLogService::log(
            $request->user(),
            'form_field',
            (string) $field->id,
            'deleted',
            "Menghapus field form '{$field->label}'",
            [
                'form_id' => (string) $field->form_id,
                'workspace_id' => $field->form?->workspace_id,
                'field_label' => $field->label,
            ]
        );

        return response()->json([
            'message' => 'Field deleted successfully',
        ]);
    }

    private function allowedTypes(): array
    {
        // `section` dipakai oleh questionnaire publik untuk memisahkan
        // kelompok test case tanpa menjadi input submission.
        return ['text', 'textarea', 'number', 'date', 'file', 'checkbox', 'select', 'radio', 'section'];
    }

    private function uniqueName(Form $form, string $label, ?string $ignoreId = null): string
    {
        $base = Str::slug($label, '_') ?: 'field';
        $name = $base;
        $counter = 2;

        while ($form->fields()
            ->where('name', $name)
            ->when($ignoreId, fn ($query) => $query->where('form_fields.id', '!=', $ignoreId))
            ->exists()) {
            $name = $base.'_'.$counter++;
        }

        return $name;
    }
}
