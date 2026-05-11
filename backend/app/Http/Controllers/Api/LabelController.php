<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Label;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LabelController extends Controller
{
    /**
     * GET /labels
     */
    public function index()
    {
        return Label::orderBy('name')->get();
    }

    /**
     * POST /labels
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'color' => 'nullable|string|max:20',
        ]);

        return Label::create([
            'name' => $request->name,
            'color' => $request->color,
            'slug' => $this->generateUniqueSlug(
                $request->name
            ),
        ]);
    }

    /**
     * PUT /labels/{label}
     */
    public function update(
        Request $request,
        Label $label
    ) {
        $request->validate([
            'name' => 'required|string|max:100',
            'color' => 'nullable|string|max:20',
        ]);

        $label->update([
            'name' => $request->name,
            'color' => $request->color,
            'slug' => $this->generateUniqueSlug(
                $request->name,
                $label->id
            ),
        ]);

        return $label->fresh();
    }

    /**
     * DELETE /labels/{label}
     */
    public function destroy(Label $label)
    {
        $label->delete();

        return response()->noContent();
    }

    /**
     * Generate unique slug
     */
    private function generateUniqueSlug(
        string $name,
        ?string $ignoreId = null
    ): string {
        $slug = Str::slug($name);

        $baseSlug = $slug;

        $counter = 1;

        while (
            Label::where('slug', $slug)
                ->when(
                    $ignoreId,
                    fn ($q) => $q->where(
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