<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use RuntimeException;
use setasign\Fpdi\Tcpdf\Fpdi;

class ReportPdfService
{
    private const USERS_PER_CHUNK = 100;

    public function render(Collection $users, array $dateSummary = [], array $meta = []): string
    {
        return $this->renderChunks([$users], $users->count(), $dateSummary, $meta);
    }

    /**
     * Render already chunked users while preserving a global row number.
     * Chunks are consumed lazily, so callers can release each batch after it
     * has been merged into the temporary PDF.
     */
    public function renderChunks(
        iterable $chunks,
        int $totalUsers,
        array $dateSummary = [],
        array $meta = [],
    ): string {
        $merged = new Fpdi('L', 'mm');
        $merged->setPrintHeader(false);
        $merged->setPrintFooter(false);
        $merged->SetAutoPageBreak(false, 0);
        $merged->SetMargins(0, 0, 0);

        $temporaryFiles = [];

        try {
            $userOffset = 0;
            $qcOffset = 0;
            $hasShownDateSummary = false;

            foreach ($chunks as $chunk) {
                $chunk = $chunk instanceof Collection ? $chunk->values() : collect($chunk);

                if ($chunk->isEmpty()) {
                    continue;
                }

                $showDateSummary = ! $hasShownDateSummary;
                $hasShownDateSummary = true;

                $sourcePath = tempnam(sys_get_temp_dir(), 'tracko-report-chunk-');

                if ($sourcePath === false) {
                    throw new RuntimeException('File sementara laporan tidak dapat dibuat.');
                }

                $temporaryFiles[] = $sourcePath;
                $contents = $this->renderChunk(
                    $chunk,
                    $totalUsers,
                    $userOffset,
                    $showDateSummary,
                    $dateSummary,
                    $meta,
                    $qcOffset,
                );

                if (file_put_contents($sourcePath, $contents) === false) {
                    throw new RuntimeException('Potongan PDF laporan tidak dapat disimpan.');
                }

                $pageCount = $merged->setSourceFile($sourcePath);

                for ($pageNumber = 1; $pageNumber <= $pageCount; $pageNumber++) {
                    $template = $merged->importPage($pageNumber, importExternalLinks: true);
                    $size = $merged->getTemplateSize($template);
                    $merged->AddPage($size['orientation'], [$size['width'], $size['height']]);
                    $merged->useTemplate($template, 0, 0, $size['width'], $size['height'], true);
                }

                $chunkQcCount = 0;
                foreach ($chunk as $user) {
                    foreach (collect($user->cards ?? []) as $card) {
                        foreach (collect($card->attachments ?? []) as $attachment) {
                            if (empty($attachment->archived_at)) {
                                $chunkQcCount++;
                            }
                        }
                    }
                }

                unset($contents);
                gc_collect_cycles();
                $userOffset += $chunk->count();
                $qcOffset += $chunkQcCount;
            }

            $contents = $merged->Output('report.pdf', 'S');

            if (! is_string($contents) || ! str_starts_with($contents, '%PDF-')) {
                throw new RuntimeException('Hasil penggabungan PDF laporan tidak valid.');
            }

            return $contents;
        } finally {
            foreach ($temporaryFiles as $temporaryFile) {
                @unlink($temporaryFile);
            }
        }
    }

    private function renderChunk(
        Collection $users,
        int $totalUsers,
        int $userOffset = 0,
        bool $showDateSummary = true,
        array $dateSummary = [],
        array $meta = [],
        int $qcOffset = 0,
    ): string {
        $contents = Pdf::loadView('exports.report_pdf', [
            'users' => $users,
            'totalUsers' => $totalUsers,
            'userOffset' => $userOffset,
            'qcOffset' => $qcOffset,
            'signedLinks' => true,
            'showDateSummary' => $showDateSummary,
            'dateSummary' => $dateSummary,
            'meta' => $meta,
        ])
            ->setPaper('a4', 'landscape')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => false,
            ])
            ->output();

        if (! str_starts_with($contents, '%PDF-')) {
            throw new RuntimeException('PDF laporan yang dihasilkan tidak valid.');
        }

        return $contents;
    }
}
