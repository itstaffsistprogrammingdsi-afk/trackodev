<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormField;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FormFieldController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'form_id' => 'required|uuid|exists:forms,id',
            'label' => 'required|string|max:255',
            'type' => 'required|string|max:50',
        ]);

        $field = FormField::create([
            'form_id' => $request->form_id,
            'label' => $request->label,
            'name' => Str::slug($request->label, '_'),
            'type' => $request->type,
            'is_required' => $request->boolean('is_required'),
            'options' => $request->options,
            'order' => $request->order ?? 0,
            'depends_on_field_id' => $request->depends_on_field_id,
            'depends_on_value' => $request->depends_on_value,
        ]);

        return response()->json($field, 201);
    }

    public function update(Request $request, $id)
    {
        $field = FormField::findOrFail($id);

        $field->update($request->all());

        return response()->json($field);
    }

    public function destroy($id)
    {
        $field = FormField::findOrFail($id);

        $field->delete();

        return response()->json([
            'message' => 'Field deleted successfully'
        ]);
    }
}