<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Brand;

class CardBrandController extends Controller
{
    public function attach(Card $card, Brand $brand)
    {
        $card->brands()->syncWithoutDetaching([
            $brand->id
        ]);

        return response()->json([
            'message' => 'Brand attached successfully'
        ]);
    }

    public function detach(Card $card, Brand $brand)
    {
        $card->brands()->detach($brand->id);

        return response()->json([
            'message' => 'Brand detached successfully'
        ]);
    }


}