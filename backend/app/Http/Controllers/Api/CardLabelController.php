<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Label;
use Illuminate\Http\Request;
use App\Services\ActivityLogService;

class CardLabelController extends Controller
{
    /**
     * Attach label ke card
     */
    public function attach(
        Request $request,
        Card $card
    ) {
        $validated = $request->validate([
            'label_id' => [
                'required',
                'exists:labels,id',
            ],
        ]);

        $card->labels()
            ->syncWithoutDetaching([
                $validated['label_id']
            ]);

        ActivityLogService::log(
            auth()->user(),
            'attached',
            'card',
            $card->id,
            "Melampirkan label ke card '{$card->title}'",
            ['card_id' => $card->id, 'label_id' => $validated['label_id']]
        );

        return response()->json(
            $card->load('labels')
        );
    }

    /**
     * Detach label dari card
     */
    public function detach(
        Card $card,
        Label $label
    ) {
        $card->labels()
            ->detach($label->id);

        ActivityLogService::log(
            auth()->user(),
            'detached',
            'card',
            $card->id,
            "Melepas label dari card '{$card->title}'",
            ['card_id' => $card->id, 'label_id' => $label->id]
        );

        return response()->json(
            $card->load('labels')
        );
    }

    /**
     * Toggle label
     */
    public function toggle(
        Request $request,
        Card $card
    ) {
        $validated = $request->validate([
            'label_id' => [
                'required',
                'exists:labels,id',
            ],
        ]);

        $labelId = $validated['label_id'];

        $exists = $card->labels()
            ->where('labels.id', $labelId)
            ->exists();

        if ($exists) {
            $card->labels()->detach($labelId);
        } else {
            $card->labels()->attach($labelId);
        }

        ActivityLogService::log(
            auth()->user(),
            'toggled',
            'card',
            $card->id,
            "Mengalihkan label pada card '{$card->title}'",
            ['card_id' => $card->id, 'label_id' => $labelId]
        );

        return response()->json(
            $card->load('labels')
        );
    }
}
