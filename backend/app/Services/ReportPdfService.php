<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use RuntimeException;
use setasign\Fpdi\Tcpdf\Fpdi;

class ReportPdfService
{
    private const USERS_PER_CHUNK = 100;

    public function render(Collection $users): string
    {
        return $this->renderChunks([$users], $users->count());
    }

    /**
     * Render already chunked users while preserving a global row number.
     * Chunks are consumed lazily, so callers can release each batch after it
     * has been merged into the temporary PDF.
     */
    public function renderChunks(iterable $chunks, int $totalUsers): string
    {
        $merged = new Fpdi('L', 'mm');
        $merged->setPrintHeader(false);
        $merged->setPrintFooter(false);
        $merged->SetAutoPageBreak(false, 0);
        $merged->SetMargins(0, 0, 0);

        $temporaryFiles = [];

        try {
            $userOffset = 0;

            foreach ($chunks as $chunk) {
                $chunk = $chunk instanceof Collection ? $chunk->values() : collect($chunk);

                if ($chunk->isEmpty()) {
                    continue;
                }

                $sourcePath = tempnam(sys_get_temp_dir(), 'tracko-report-chunk-');

                if ($sourcePath === false) {
                    throw new RuntimeException('File sementara laporan tidak dapat dibuat.');
                }

                $temporaryFiles[] = $sourcePath;
                $contents = $this->renderChunk($chunk, $totalUsers, $userOffset);

                if (file_put_contents($sourcePath, $contents) === false) {
                    throw new RuntimeException('Potongan PDF laporan tidak dapat disimpan.');
                }

                $pageCount = $merged->setSourceFile($sourcePath);

                for ($pageNumber = 1; $pageNumber <= $pageCount; $pageNumber++) {
                    $template = $merged->importPage($pageNumber);
                    $size = $merged->getTemplateSize($template);
                    $merged->AddPage($size['orientation'], [$size['width'], $size['height']]);
                    $merged->useTemplate($template, 0, 0, $size['width'], $size['height'], true);
                }

                unset($contents);
                gc_collect_cycles();
                $userOffset += $chunk->count();
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

    private function renderChunk(Collection $users, int $totalUsers, int $userOffset = 0): string
    {
        $contents = Pdf::loadView('exports.report_pdf', [
            'users' => $users,
            'totalUsers' => $totalUsers,
            'userOffset' => $userOffset,
            'signedLinks' => true,
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
