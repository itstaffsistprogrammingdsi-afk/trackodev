<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublishFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_published' => 'required|boolean',

            'publish_order' => 'nullable|integer|min:0',

            'publish_category' => 'nullable|string|max:100',

            'publish_icon' => 'nullable|string|max:100',

            'publish_description' => 'nullable|string|max:1000',
        ];
    }
}