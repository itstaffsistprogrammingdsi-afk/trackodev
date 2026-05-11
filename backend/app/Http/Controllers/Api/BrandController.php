<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Brand;

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

        return response()->json($brand);
    }

    public function destroy(string $id)
    {
        $brand = Brand::findOrFail($id);

        $brand->delete();

        return response()->json([
            'message' => 'Brand deleted successfully'
        ]);
    }
}