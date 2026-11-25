<?php

namespace App\Services;

use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ReportDateSummaryService
{
    public function __construct(private readonly ReportDataLoader $loader)
    {
    }

    /**
     * @return array<int, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>
     */
    public function build(Request $request): array
    {
        return $this->analyze($request)['rows'];
    }

    /**
     * Single-pass aggregation across chunks returning date summary rows and global KPI totals.
     *
     * @return array{
     *     rows: array<int, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>,
     *     totals: array{cards: int, attachments: int, qc: int}
     * }
     */
    public function analyze(Request $request): array
    {
        $buckets = [];
        $totals = [
            'cards' => 0,
            'attachments' => 0,
            'qc' => 0,
        ];
        [$startDate, $endDate] = $this->resolveBoundaries($request);

        foreach ($this->loader->chunks($request) as $users) {
            $this->accumulateUsers($users, $buckets, $startDate, $endDate, $totals);
        }

        return [
            'rows' => $this->finalizeBuckets($buckets),
            'totals' => $totals,
        ];
    }

    /**
     * @return array<int, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>
     */
    public function fromUsers(
        Collection $users,
        ?Request $request = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): array {
        $buckets = [];
        $totals = [
            'cards' => 0,
            'attachments' => 0,
            'qc' => 0,
        ];

        if ($request !== null && $startDate === null && $endDate === null) {
            [$startDate, $endDate] = $this->resolveBoundaries($request);
        } else {
            $startDate = $this->toDateKey($startDate);
            $endDate = $this->toDateKey($endDate);
        }

        $this->accumulateUsers($users, $buckets, $startDate, $endDate, $totals);

        return $this->finalizeBuckets($buckets);
    }

    /**
     * @param  iterable<int, mixed>  $users
     * @param  array<string, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>  $buckets
     * @param  array{cards: int, attachments: int, qc: int}  $totals
     */
    private function accumulateUsers(
        iterable $users,
        array &$buckets,
        ?string $startDate,
        ?string $endDate,
        array &$totals,
    ): void {
        foreach ($users as $user) {
            $cards = collect($user->cards ?? []);

            foreach ($cards as $card) {
                $totals['cards']++;
                $this->recordEvent($buckets, $card->created_at ?? null, 'created', 1, $startDate, $endDate);
                $this->recordEvent($buckets, $card->completed_at ?? null, 'completed', 1, $startDate, $endDate);

                $attachments = collect($card->attachments ?? []);

                foreach ($attachments as $attachment) {
                    if (! empty($attachment->archived_at)) {
                        continue;
                    }

                    $totals['attachments']++;
                    $totals['qc'] += (int) ($attachment->qc_quantity ?? 0);

                    $this->recordEvent($buckets, $attachment->created_at ?? null, 'uploaded', 1, $startDate, $endDate);

                    $qcAt = $attachment->qc_at ?? null;
                    if ($qcAt !== null) {
                        $dateKey = $this->toDateKey($qcAt);
                        if ($dateKey !== null && $this->isWithinBoundaries($dateKey, $startDate, $endDate)) {
                            $this->ensureBucket($buckets, $dateKey);
                            $buckets[$dateKey]['qc']++;
                            $buckets[$dateKey]['qc_quantity'] += (int) ($attachment->qc_quantity ?? 0);
                        }
                    }
                }
            }
        }
    }

    /**
     * @param  array<string, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>  $buckets
     */
    private function recordEvent(
        array &$buckets,
        mixed $timestamp,
        string $field,
        int $amount,
        ?string $startDate,
        ?string $endDate,
    ): void {
        if ($timestamp === null || $timestamp === '') {
            return;
        }

        $dateKey = $this->toDateKey($timestamp);

        if ($dateKey === null || ! $this->isWithinBoundaries($dateKey, $startDate, $endDate)) {
            return;
        }

        $this->ensureBucket($buckets, $dateKey);
        $buckets[$dateKey][$field] += $amount;
    }

    /**
     * @param  array<string, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>  $buckets
     */
    private function ensureBucket(array &$buckets, string $dateKey): void
    {
        if (! isset($buckets[$dateKey])) {
            $buckets[$dateKey] = [
                'date' => $dateKey,
                'created' => 0,
                'completed' => 0,
                'uploaded' => 0,
                'qc' => 0,
                'qc_quantity' => 0,
            ];
        }
    }

    /**
     * @param  array<string, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>  $buckets
     * @return array<int, array{date: string, created: int, completed: int, uploaded: int, qc: int, qc_quantity: int}>
     */
    private function finalizeBuckets(array $buckets): array
    {
        ksort($buckets);

        return array_values(array_filter(
            $buckets,
            fn (array $row): bool => ($row['created'] + $row['completed'] + $row['uploaded'] + $row['qc']) > 0
        ));
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private function resolveBoundaries(Request $request): array
    {
        $start = $request->filled('start_date') ? $this->toDateKey($request->input('start_date')) : null;
        $end = $request->filled('end_date') ? $this->toDateKey($request->input('end_date')) : null;

        return [$start, $end];
    }

    private function isWithinBoundaries(string $dateKey, ?string $startDate, ?string $endDate): bool
    {
        if ($startDate !== null && $dateKey < $startDate) {
            return false;
        }

        if ($endDate !== null && $dateKey > $endDate) {
            return false;
        }

        return true;
    }

    private function toDateKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        try {
            return Carbon::parse((string) $value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
