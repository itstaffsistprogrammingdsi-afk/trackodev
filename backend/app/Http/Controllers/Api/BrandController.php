<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Campaign;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        // Brand catalogs are shared by every role, so keep the response
        // deterministic and user-friendly instead of ordering by creation
        // time. LOWER() makes the alphabetical order case-insensitive while
        // the following clauses keep ties stable across database engines.
        $query = Brand::query()
            ->withCount('cards')
            ->orderByRaw('LOWER(name)')
            ->orderBy('name')
            ->orderBy('id');
        $campaignId = $request->query('campaign_id');

        if (is_string($campaignId) && $campaignId !== '') {
            $query->where('campaign_id', $campaignId);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $rawName = $request->input('name');
        $name = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $name]);

        $rawCampaignId = $request->input('campaign_id');
        $campaignId = is_scalar($rawCampaignId) ? (string) $rawCampaignId : '';

        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'name' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) use ($campaignId, $name): void {
                    if (is_string($name) && Brand::query()
                        ->where('campaign_id', $campaignId)
                        ->whereRaw('LOWER(TRIM(name)) = ?', [Str::lower($name)])
                        ->exists()) {
                        $fail('Nama brand sudah digunakan pada campaign ini. Gunakan nama lain.');
                    }
                },
            ],
            'color' => 'nullable|string|max:50',
        ]);

        $campaign = Campaign::findOrFail($validated['campaign_id']);
        abort_unless($campaign->canBeAccessedBy($request->user()), 403, 'Unauthorized');

        $brand = Brand::create($validated);

        ActivityLogService::log(
            auth()->user(),

            'brand',
            (string) $brand->id,
            'created',
            "Membuat brand '{$brand->name}'",
            ['brand_id' => $brand->id, 'campaign_id' => $brand->campaign_id]
        );

        return response()->json($brand, 201);
    }

    public function show(string $id)
    {
        return response()->json(Brand::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        abort_unless(ResourceAccess::brand($request->user(), $brand), 403, 'Unauthorized');

        $rawName = $request->input('name');
        $name = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $name]);

        $rawCampaignId = $request->input('campaign_id');
        $campaignId = is_scalar($rawCampaignId) ? (string) $rawCampaignId : '';

        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'name' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) use ($brand, $campaignId, $name): void {
                    if (is_string($name) && Brand::query()
                        ->where('campaign_id', $campaignId)
                        ->where('id', '!=', $brand->id)
                        ->whereRaw('LOWER(TRIM(name)) = ?', [Str::lower($name)])
                        ->exists()) {
                        $fail('Nama brand sudah digunakan pada campaign ini. Gunakan nama lain.');
                    }
                },
            ],
            'color' => 'nullable|string|max:50',
        ]);

        $campaign = Campaign::findOrFail($validated['campaign_id']);
        abort_unless($campaign->canBeAccessedBy($request->user()), 403, 'Unauthorized');

        $brand->update($validated);

        ActivityLogService::log(
            auth()->user(),

            'brand',
            (string) $brand->id,
            'updated',
            "Mengupdate brand '{$brand->name}'",
            ['brand_id' => $brand->id, 'campaign_id' => $brand->campaign_id]
        );

        return response()->json($brand);
    }

    public function destroy(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        abort_unless(ResourceAccess::brand($request->user(), $brand), 403, 'Unauthorized');

        $usageCount = $brand->cards()->count();

        if ($usageCount > 0) {
            return response()->json([
                'message' => 'Brand tidak dapat dihapus karena masih digunakan pada card.',
                'usage_count' => $usageCount,
            ], 409);
        }

        ActivityLogService::log(
            auth()->user(),

            'brand',
            (string) $brand->id,
            'deleted',
            "Menghapus brand '{$brand->name}'",
            ['brand_id' => $brand->id, 'campaign_id' => $brand->campaign_id]
        );

        $brand->delete();

        return response()->json([
            'message' => 'Brand deleted successfully',
        ]);
    }
}
