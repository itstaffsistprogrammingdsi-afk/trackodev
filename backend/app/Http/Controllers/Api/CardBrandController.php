<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Brand;
use App\Services\ActivityLogService;

class CardBrandController extends Controller
{
    public function attach(Card $card, Brand $brand)
    {
        $card->brands()->syncWithoutDetaching([
            $brand->id
        ]);

        ActivityLogService::log(
            auth()->user(),
            'attached',
            'card',
            $card->id,
            "Melampirkan brand ke card '{$card->title}'",
            ['card_id' => $card->id, 'brand_id' => $brand->id]
        );
        return response()->json([
            'message' => 'Brand attached successfully'
        ]);
    }

    public function detach(Card $card, Brand $brand)
    {
        $card->brands()->detach($brand->id);

        ActivityLogService::log(
            auth()->user(),
            'detached',
            'card',
            $card->id,
            "Melepas brand dari card '{$card->title}'",
            ['card_id' => $card->id, 'brand_id' => $brand->id]
        );

        return response()->json([
            'message' => 'Brand detached successfully'
        ]);
    }
}
