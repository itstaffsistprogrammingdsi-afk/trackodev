<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use Illuminate\Http\Request;

class CardLabelController extends Controller
{
    /**
     * Attach label ke card
     */
    public function attach(
        Request $request,
        Card $card
    ) {
        $request->validate([
            'label_id' => 'required|exists:labels,id',
        ]);

        $card->labels()
            ->syncWithoutDetaching([
                $request->label_id
            ]);

        return $card->load('labels');
    }

    /**
     * Detach label dari card
     */
    public function detach(
        Request $request,
        Card $card
    ) {
        $request->validate([
            'label_id' => 'required|exists:labels,id',
        ]);

        $card->labels()
            ->detach($request->label_id);

        return $card->load('labels');
    }

    /**
     * Toggle label
     */
    public function toggle(
        Request $request,
        Card $card
    ) {
        $request->validate([
            'label_id' => 'required|exists:labels,id',
        ]);

        $labelId = $request->label_id;

        $exists = $card->labels()
            ->where('labels.id', $labelId)
            ->exists();

        if ($exists) {
            $card->labels()->detach($labelId);
        } else {
            $card->labels()->attach($labelId);
        }

        return $card->load('labels');
    }
}