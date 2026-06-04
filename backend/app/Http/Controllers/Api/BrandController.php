<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function index()
    {
        return Brand::latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
        ]);

        $brand = Brand::create($validated);


        ActivityLogService::log(
            auth()->user(),
            'created',
            'brand',
            $brand->id,
            "Membuat brand '{$brand->name}'",
            ['brand_id' => $brand->id, 'campaign_id' => $brand->campaign_id]
        );
        return response()->json($brand, 201);
    }

    public function show(string $id)
    {
        $brand = Brand::findOrFail($id);

        return response()->json($brand);
    }

    public function update(Request $request, string $id)
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
        ]);

        $brand->update($validated);

        ActivityLogService::log(
            auth()->user(),
            'updated',
            'brand',
            $brand->id,
            "Mengupdate brand '{$brand->name}'",
            ['brand_id' => $brand->id, 'campaign_id' => $brand->campaign_id]
        );
        return response()->json($brand);
    }

    public function destroy(string $id)
    {
        $brand = Brand::findOrFail($id);

        ActivityLogService::log(
            auth()->user(),
            'deleted',
            'brand',
            $brand->id,
            "Menghapus brand '{$brand->name}'",
            ['brand_id' => $brand->id, 'campaign_id' => $brand->campaign_id]
        );

        $brand->delete();

        return response()->json([
            'message' => 'Brand deleted successfully'
        ]);
    }
}
