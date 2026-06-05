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
            
            'card',
            (string) $card->id,
            'attached',
            "Melampirkan brand ke card '{$card->title}'",
            ['card_id' => (string) $card->id, 'brand_id' => (string) $brand->id]
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
            
            'card',
            (string) $card->id,
            'detached',
            "Melepas brand dari card '{$card->title}'",
            ['card_id' => (string) $card->id, 'brand_id' => (string) $brand->id]
        );

        return response()->json([
            'message' => 'Brand detached successfully'
        ]);
    }
}
