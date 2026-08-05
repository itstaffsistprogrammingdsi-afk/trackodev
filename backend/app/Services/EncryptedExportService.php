<?php

namespace App\Services;

use Nick\SecureSpreadsheet\Encrypt;
use RuntimeException;
use setasign\Fpdi\Tcpdf\Fpdi;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

class EncryptedExportService
{
    public function downloadPdf(
        string $contents,
        string $fileName,
        ?string $password = null
    ): Response {
        $safeFileName = $this->sanitizeFileName($fileName, 'pdf');
        $password = $this->normalizePassword($password);

        if (! str_starts_with($contents, '%PDF-')) {
            throw new RuntimeException('Dokumen PDF sumber tidak valid.');
        }

        $downloadContents = $password === null
            ? $contents
            : $this->encryptPdf($contents, $password);

        return $this->downloadResponse(
            $downloadContents,
            $safeFileName,
            'application/pdf',
            $password === null ? 'NONE' : 'PDF-AES-256'
        );
    }

    public function downloadSpreadsheet(
        string $contents,
        string $fileName,
        ?string $password = null
    ): Response {
        $password = $this->normalizePassword($password);

        if ($password === null) {
            if (! str_starts_with($contents, "PK")) {
                throw new RuntimeException('Dokumen Excel sumber tidak valid.');
            }

            return $this->downloadResponse(
                $contents,
                $this->sanitizeFileName($fileName, 'xlsx'),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'NONE'
            );
        }

        try {
            $encrypted = (new Encrypt(true))
                ->input($contents)
                ->password($password)
                ->output();
        } catch (\Throwable $exception) {
            throw new RuntimeException(
                'Gagal mengenkripsi file Excel.',
                previous: $exception
            );
        }

        if (! is_string($encrypted) || ! str_starts_with($encrypted, "\xD0\xCF\x11\xE0")) {
            throw new RuntimeException('Hasil enkripsi Excel tidak valid.');
        }

        return $this->downloadResponse(
            $encrypted,
            $this->sanitizeFileName($fileName, 'xlsx'),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'OOXML-Agile-AES-256'
        );
    }

    private function encryptPdf(string $contents, string $password): string
    {
        if (! str_starts_with($contents, '%PDF-')) {
            throw new RuntimeException('Dokumen PDF sumber tidak valid.');
        }

        $sourcePath = tempnam(sys_get_temp_dir(), 'trackodev-pdf-');
        if ($sourcePath === false || file_put_contents($sourcePath, $contents) === false) {
            throw new RuntimeException('Gagal menyiapkan PDF untuk dienkripsi.');
        }

        try {
            $pdf = new Fpdi('L', 'mm');
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->SetAutoPageBreak(false, 0);
            $pdf->SetMargins(0, 0, 0);
            $pdf->SetProtection(
                ['print', 'print-high'],
                $password,
                bin2hex(random_bytes(32)),
                3
            );

            $pageCount = $pdf->setSourceFile($sourcePath);
            for ($pageNumber = 1; $pageNumber <= $pageCount; $pageNumber++) {
                $template = $pdf->importPage($pageNumber);
                $size = $pdf->getTemplateSize($template);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($template, 0, 0, $size['width'], $size['height'], true);
            }

            $encrypted = $pdf->Output('encrypted.pdf', 'S');
        } catch (\Throwable $exception) {
            throw new RuntimeException(
                'Gagal mengenkripsi file PDF.',
                previous: $exception
            );
        } finally {
            @unlink($sourcePath);
        }

        if (! is_string($encrypted) || ! str_starts_with($encrypted, '%PDF-')) {
            throw new RuntimeException('Hasil enkripsi PDF tidak valid.');
        }

        return $encrypted;
    }

    private function downloadResponse(
        string $contents,
        string $fileName,
        string $contentType,
        string $encryption
    ): Response {
        $response = new Response($contents, 200, [
            'Content-Type' => $contentType,
            'Cache-Control' => 'private, no-store, no-cache, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
            'X-Export-Encryption' => $encryption,
        ]);
        $response->headers->set(
            'Content-Disposition',
            $response->headers->makeDisposition(
                ResponseHeaderBag::DISPOSITION_ATTACHMENT,
                $fileName
            )
        );

        return $response;
    }

    private function sanitizeFileName(string $fileName, string $extension): string
    {
        $baseName = pathinfo(basename($fileName), PATHINFO_FILENAME);
        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $baseName) ?: 'laporan';

        return $safeName.'.'.$extension;
    }

    private function normalizePassword(?string $password): ?string
    {
        $password = $password === null ? '' : trim($password);

        return $password === '' ? null : $password;
    }
}
