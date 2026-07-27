<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Label;
use App\Services\ActivityLogService;
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
        $validated = $request->validate([
            'label_id' => [
                'required',
                'exists:labels,id',
            ],
        ]);

        $card->labels()
            ->syncWithoutDetaching([
                $validated['label_id'],
            ]);

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'attached',
            "Melampirkan label ke card '{$card->title}'",
            ['card_id' => (string) $card->id, 'label_id' => (string) $validated['label_id']]
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

            'card',
            (string) $card->id,
            'detached',
            "Melepas label dari card '{$card->title}'",
            ['card_id' => (string) $card->id, 'label_id' => (string) $label->id]
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

        $requiredPermission = $exists
            ? 'label.detach'
            : 'label.attach';

        abort_unless(
            $request->user()->can($requiredPermission),
            403,
            'Anda tidak memiliki izin untuk mengubah label pada card.'
        );

        if ($exists) {
            $card->labels()->detach($labelId);
        } else {
            $card->labels()->attach($labelId);
        }

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'toggled',
            "Mengalihkan label pada card '{$card->title}'",
            ['card_id' => (string) $card->id, 'label_id' => (string) $labelId]
        );

        return response()->json(
            $card->load('labels')
        );
    }
}
