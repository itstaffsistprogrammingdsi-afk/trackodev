<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ReportTotalsService
{
    public function __construct(private readonly ReportDataLoader $loader)
    {
    }

    /**
     * @return array{cards: int, attachments: int, qc: int}
     */
    public function totals(Request $request): array
    {
        $totals = [
            'cards' => 0,
            'attachments' => 0,
            'qc' => 0,
        ];

        foreach ($this->loader->chunks($request) as $users) {
            $this->accumulateUsers($users, $totals);
        }

        return $totals;
    }

    /**
     * @return array{cards: int, attachments: int, qc: int}
     */
    public function totalsFromUsers(Collection $users): array
    {
        $totals = [
            'cards' => 0,
            'attachments' => 0,
            'qc' => 0,
        ];

        $this->accumulateUsers($users, $totals);

        return $totals;
    }

    /**
     * @param  iterable<int, mixed>  $users
     * @param  array{cards: int, attachments: int, qc: int}  $totals
     */
    private function accumulateUsers(iterable $users, array &$totals): void
    {
        foreach ($users as $user) {
            foreach (collect($user->cards ?? []) as $card) {
                $totals['cards']++;

                foreach (collect($card->attachments ?? []) as $attachment) {
                    if (! empty($attachment->archived_at)) {
                        continue;
                    }

                    $totals['attachments']++;
                    $totals['qc'] += (int) ($attachment->qc_quantity ?? 0);
                }
            }
        }
    }
}
