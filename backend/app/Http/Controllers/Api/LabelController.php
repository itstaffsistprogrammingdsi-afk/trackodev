<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Label;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LabelController extends Controller
{
    /**
     * GET /labels
     */
    public function index()
    {
        return response()->json(
            Label::query()
                ->orderBy('name')
                ->get()
        );
    }

    /**
     * POST /labels
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('labels', 'name'),
            ],

            'color' => [
                'nullable',
                'string',
                'max:20',
            ],
        ]);

        $label = Label::create([
            'name' => trim($validated['name']),
            'color' => $validated['color'] ?? null,
            'slug' => $this->generateUniqueSlug(
                $validated['name']
            ),
        ]);

        return response()->json(
            $label,
            201
        );
    }

    /**
     * PUT /labels/{label}
     */
    public function update(
        Request $request,
        Label $label
    ) {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',

                Rule::unique('labels', 'name')
                    ->ignore($label->id),
            ],

            'color' => [
                'nullable',
                'string',
                'max:20',
            ],
        ]);

        $label->update([
            'name' => trim($validated['name']),
            'color' => $validated['color'] ?? null,

            'slug' => $this->generateUniqueSlug(
                $validated['name'],
                $label->id
            ),
        ]);

        return response()->json(
            $label->fresh()
        );
    }

    /**
     * DELETE /labels/{label}
     */
    public function destroy(Label $label)
    {
        $label->delete();

        return response()->json([
            'message' => 'Label deleted successfully',
        ]);
    }

    /**
     * Generate unique slug
     */
    private function generateUniqueSlug(
        string $name,
        ?string $ignoreId = null
    ): string {
        $baseSlug = Str::slug($name);

        $slug = $baseSlug;

        $counter = 1;

        while (
            Label::query()
                ->where('slug', $slug)
                ->when(
                    $ignoreId,
                    fn ($query) => $query->where(
                        'id',
                        '!=',
                        $ignoreId
                    )
                )
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $counter;

            $counter++;
        }

        return $slug;
    }
}