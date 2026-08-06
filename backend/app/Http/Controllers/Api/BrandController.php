<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Campaign;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Brand::query()->latest();
        $campaignId = $request->query('campaign_id');

        if (is_string($campaignId) && $campaignId !== '') {
            $query->where('campaign_id', $campaignId);
        }

        if (! $user->isSuperAdmin()) {
            $query->whereIn(
                'campaign_id',
                $user->accessibleCampaigns()->select('campaigns.id')
            );
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'name' => 'required|string|max:255',
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

    public function show(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        abort_unless(ResourceAccess::brand($request->user(), $brand), 403, 'Unauthorized');

        return response()->json($brand);
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);
        abort_unless(ResourceAccess::brand($request->user(), $brand), 403, 'Unauthorized');

        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'name' => 'required|string|max:255',
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
