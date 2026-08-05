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
        $this->authorizePair($request, $card, $brand);
        $card->brands()->syncWithoutDetaching([
            $brand->id,
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
            'message' => 'Brand attached successfully',
        ]);
    }

    public function detach(Request $request, Card $card, Brand $brand)
    {
        $this->authorizePair($request, $card, $brand);
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
            'message' => 'Brand detached successfully',
        ]);
    }

    private function authorizePair(Request $request, Card $card, Brand $brand): void
    {
        abort_unless(
            ResourceAccess::card($request->user(), $card)
                && ResourceAccess::brand($request->user(), $brand),
            403,
            'Unauthorized'
        );

        abort_unless(
            $card->board?->campaign_id === $brand->campaign_id,
            422,
            'Brand harus berasal dari campaign yang sama dengan card.'
        );
    }
}
