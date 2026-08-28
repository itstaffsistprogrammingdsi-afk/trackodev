<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\HeaderFooter;
use PhpOffice\PhpSpreadsheet\Worksheet\HeaderFooterDrawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use RuntimeException;

class ReportWatermarkService
{
    public const TEXT = 'PT. DERMA SEMBILAN INDONESIA';

    public function applyToWorksheet(Worksheet $worksheet): void
    {
        $imagePath = $this->imagePath();

        $drawing = new Drawing;
        $drawing->setName('Kepemilikan aset '.self::TEXT);
        $drawing->setDescription('Watermark kepemilikan aset '.self::TEXT);
        $drawing->setPath($imagePath);
        $drawing->setCoordinates('A3');
        $drawing->setWidth(860);
        $drawing->setWorksheet($worksheet);

        // Header image membuat watermark tetap muncul saat worksheet dicetak
        // atau diekspor ke PDF dan terdiri dari beberapa halaman.
        $headerDrawing = new HeaderFooterDrawing;
        $headerDrawing->setName('Watermark cetak '.self::TEXT);
        $headerDrawing->setPath($imagePath);
        $headerDrawing->setWidth(650);

        $worksheet->getHeaderFooter()
            ->setOddHeader('&C&G')
            ->setEvenHeader('&C&G')
            ->addImage($headerDrawing, HeaderFooter::IMAGE_HEADER_CENTER);
    }

    public function imagePath(): string
    {
        $directory = storage_path('app/watermarks');
        $path = $directory.'/report-ownership.png';

        if (is_file($path)) {
            return $path;
        }

        if (! extension_loaded('gd')) {
            throw new RuntimeException('Ekstensi PHP GD dibutuhkan untuk membuat watermark laporan Excel.');
        }

        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            throw new RuntimeException('Folder watermark laporan tidak dapat dibuat.');
        }

        $fontPath = base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans-Bold.ttf');

        if (! is_file($fontPath)) {
            throw new RuntimeException('Font watermark laporan tidak ditemukan.');
        }

        $width = 1400;
        $height = 560;
        $fontSize = 58;
        $angle = 22;
        $image = imagecreatetruecolor($width, $height);

        if ($image === false) {
            throw new RuntimeException('Kanvas watermark laporan tidak dapat dibuat.');
        }

        imagealphablending($image, false);
        imagesavealpha($image, true);
        $transparent = imagecolorallocatealpha($image, 255, 255, 255, 127);
        imagefilledrectangle($image, 0, 0, $width, $height, $transparent);
        imagealphablending($image, true);

        $textColor = imagecolorallocatealpha($image, 55, 65, 81, 102);
        $bounds = imagettfbbox($fontSize, $angle, $fontPath, self::TEXT);

        if ($bounds === false) {
            imagedestroy($image);
            throw new RuntimeException('Ukuran teks watermark laporan tidak dapat dihitung.');
        }

        $textWidth = max($bounds[0], $bounds[2], $bounds[4], $bounds[6]) - min($bounds[0], $bounds[2], $bounds[4], $bounds[6]);
        $textHeight = max($bounds[1], $bounds[3], $bounds[5], $bounds[7]) - min($bounds[1], $bounds[3], $bounds[5], $bounds[7]);
        $x = (int) (($width - $textWidth) / 2 - min($bounds[0], $bounds[2], $bounds[4], $bounds[6]));
        $y = (int) (($height - $textHeight) / 2 - min($bounds[1], $bounds[3], $bounds[5], $bounds[7]));

        imagettftext($image, $fontSize, $angle, $x, $y, $textColor, $fontPath, self::TEXT);

        if (! imagepng($image, $path, 6)) {
            imagedestroy($image);
            throw new RuntimeException('File watermark laporan tidak dapat disimpan.');
        }

        imagedestroy($image);

        return $path;
    }
}
