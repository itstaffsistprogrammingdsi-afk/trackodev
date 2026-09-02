<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Label;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LabelController extends Controller
{
    /**
     * GET /labels
     */
    public function index()
    {
        return response()->json(
            Label::query()
                ->withCount('cards')
                ->orderBy('name')
                ->get()
        );
    }

    /**
     * GET /labels/{label}
     */
    public function show(Label $label)
    {
        return response()->json($label);
    }

    /**
     * POST /labels
     */
    public function store(Request $request)
    {
        // Names are stored without surrounding whitespace and are compared
        // case-insensitively so values such as "DSI", " dsi ", and "dSi"
        // cannot create separate master labels.
        $rawName = $request->input('name');
        $name = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $name]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, \Closure $fail) use ($name): void {
                    if (is_string($name) && Label::query()
                        ->whereRaw('LOWER(TRIM(name)) = ?', [Str::lower($name)])
                        ->exists()) {
                        $fail('Nama label sudah digunakan. Gunakan nama lain.');
                    }
                },
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

        ActivityLogService::log(
            auth()->user(),

            'label',
            (string) $label->id,
            'created',
            "Membuat label '{$label->name}'",
            ['label_id' => (string) $label->id]
        );

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
        $rawName = $request->input('name');
        $name = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $name]);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, \Closure $fail) use ($name, $label): void {
                    if (is_string($name) && Label::query()
                        ->where('id', '!=', $label->id)
                        ->whereRaw('LOWER(TRIM(name)) = ?', [Str::lower($name)])
                        ->exists()) {
                        $fail('Nama label sudah digunakan. Gunakan nama lain.');
                    }
                },
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

        ActivityLogService::log(
            auth()->user(),

            'label',
            (string) $label->id,
            'updated',
            "Mengupdate label '{$label->name}'",
            ['label_id' => (string) $label->id]
        );

        return response()->json(
            $label->fresh()
        );
    }

    /**
     * DELETE /labels/{label}
     */
    public function destroy(Label $label)
    {
        $usageCount = $label->cards()->count();

        if ($usageCount > 0) {
            return response()->json([
                'message' => 'Label tidak dapat dihapus karena masih digunakan pada card.',
                'usage_count' => $usageCount,
            ], 409);
        }

        ActivityLogService::log(
            auth()->user(),

            'label',
            (string) $label->id,
            'deleted',
            "Menghapus label '{$label->name}'",
            ['label_id' => (string) $label->id]
        );

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
            $slug = $baseSlug.'-'.$counter;

            $counter++;
        }

        return $slug;
    }
}
