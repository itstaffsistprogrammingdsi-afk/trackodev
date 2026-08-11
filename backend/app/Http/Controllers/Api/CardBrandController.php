<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Card;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Http\Request;

class CardBrandController extends Controller
{
    public function attach(Request $request, Card $card, Brand $brand)
    {
        $this->authorizeCard($request, $card);
        $card->brands()->syncWithoutDetaching([
            $brand->id,
        ]);

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'brand_attached',
            "Menambahkan brand '{$brand->name}' ke card '{$card->title}'",
            ['card_id' => (string) $card->id, 'brand_id' => (string) $brand->id, 'brand_name' => $brand->name]
        );

        return response()->json([
            'message' => 'Brand attached successfully',
        ]);
    }

    public function detach(Request $request, Card $card, Brand $brand)
    {
        $this->authorizeCard($request, $card);
        $card->brands()->detach($brand->id);

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'brand_detached',
            "Menghapus brand '{$brand->name}' dari card '{$card->title}'",
            ['card_id' => (string) $card->id, 'brand_id' => (string) $brand->id, 'brand_name' => $brand->name]
        );

        return response()->json([
            'message' => 'Brand detached successfully',
        ]);
    }

    private function authorizeCard(Request $request, Card $card): void
    {
        abort_unless(
            ResourceAccess::card($request->user(), $card),
            403,
            'Unauthorized'
        );
    }
}
