<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Label;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
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
        abort_unless(ResourceAccess::card($request->user(), $card), 403, 'Unauthorized');

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
        $label = Label::findOrFail($validated['label_id']);

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'label_attached',
            "Menambahkan label '{$label->name}' ke card '{$card->title}'",
            ['card_id' => (string) $card->id, 'label_id' => (string) $label->id, 'label_name' => $label->name]
        );

        return response()->json(
            $card->load('labels')
        );
    }

    /**
     * Detach label dari card
     */
    public function detach(
        Request $request,
        Card $card,
        Label $label
    ) {
        abort_unless(ResourceAccess::card($request->user(), $card), 403, 'Unauthorized');

        $card->labels()
            ->detach($label->id);

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'label_detached',
            "Menghapus label '{$label->name}' dari card '{$card->title}'",
            ['card_id' => (string) $card->id, 'label_id' => (string) $label->id, 'label_name' => $label->name]
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
        abort_unless(ResourceAccess::card($request->user(), $card), 403, 'Unauthorized');

        $validated = $request->validate([
            'label_id' => [
                'required',
                'exists:labels,id',
            ],
        ]);

        $labelId = $validated['label_id'];
        $label = Label::findOrFail($labelId);

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
            $exists ? 'label_detached' : 'label_attached',
            $exists
                ? "Menghapus label '{$label->name}' dari card '{$card->title}'"
                : "Menambahkan label '{$label->name}' ke card '{$card->title}'",
            ['card_id' => (string) $card->id, 'label_id' => (string) $labelId, 'label_name' => $label->name]
        );

        return response()->json(
            $card->load('labels')
        );
    }
}
