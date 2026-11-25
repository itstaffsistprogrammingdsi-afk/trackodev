<?php

namespace Tests\Unit;

use App\Services\ReportPreviewTableService;
use Illuminate\Support\Collection;
use Tests\TestCase;

class ReportPreviewTableServiceTest extends TestCase
{
    public function test_columns_are_returned_in_order(): void
    {
        $table = (new ReportPreviewTableService())->build(collect());

        $this->assertSame([
            'No', 'Nama User', 'Divisi', 'Card', 'Campaign', 'Board',
            'Tanggal Dibuat', 'Due Date', 'Tanggal Selesai', 'Lampiran', 'Tipe',
            'Tanggal Upload', 'Tanggal QC', 'Qty', 'Status QC', 'QC Oleh',
            'Catatan QC', 'Label & Brand',
        ], $table['columns']);
        $this->assertCount(18, $table['columns']);
        $this->assertSame([], $table['rows']);
    }

    public function test_card_with_attachment_produces_one_row_with_values(): void
    {
        $users = collect([
            (object) [
                'name' => 'Andi',
                'divisions' => [(object) ['name' => 'Desain']],
                'cards' => collect([
                    (object) [
                        'title' => 'Banner Lebaran',
                        'campaign' => (object) ['name' => 'Campaign A'],
                        'board' => (object) ['name' => 'Done', 'campaign' => null],
                        'created_at' => '2026-11-01 08:00:00',
                        'due_date' => '2026-11-10',
                        'completed_at' => '2026-11-09 17:00:00',
                        'labels' => [(object) ['name' => 'Urgent'], (object) ['name' => 'Promo']],
                        'brands' => [(object) ['name' => 'Tracko']],
                        'attachments' => collect([
                            (object) [
                                'file_name' => 'banner.png',
                                'attachment_type' => 'file',
                                'created_at' => '2026-11-08 10:00:00',
                                'qc_at' => '2026-11-09 09:00:00',
                                'quantity' => 5,
                                'qc_quantity' => 4,
                                'qc_note' => 'Revisi warna',
                                'qcBy' => (object) ['name' => 'Budi'],
                                'archived_at' => null,
                            ],
                        ]),
                    ],
                ]),
            ],
        ]);

        $table = (new ReportPreviewTableService())->build($users);

        $this->assertCount(1, $table['rows']);
        $this->assertSame([
            1, 'Andi', 'Desain',
            'Banner Lebaran', 'Campaign A', 'Done',
            '01/11/2026', '10/11/2026', '09/11/2026',
            'banner.png', 'file', '08/11/2026', '09/11/2026',
            '4 / 5', 'ACC', 'Budi', 'Revisi warna',
            'Label: Urgent, Promo | Brand: Tracko',
        ], $table['rows'][0]);
        $this->assertCount(count($table['columns']), $table['rows'][0]);
    }

    public function test_card_without_attachment_produces_placeholder_attachment_row(): void
    {
        $users = collect([
            (object) [
                'name' => 'Sari',
                'divisions' => [],
                'cards' => collect([
                    (object) [
                        'title' => 'Riset Pasar',
                        'campaign' => null,
                        'board' => (object) ['name' => 'Todo', 'campaign' => (object) ['name' => 'Campaign B']],
                        'created_at' => null,
                        'labels' => [],
                        'brands' => [],
                        'attachments' => collect(),
                    ],
                ]),
            ],
        ]);

        $table = (new ReportPreviewTableService())->build($users);

        $this->assertCount(1, $table['rows']);
        $row = $table['rows'][0];
        $this->assertCount(18, $row);
        $this->assertSame(['Sari', '-'], [$row[1], $row[2]]);
        $this->assertSame(['Riset Pasar', 'Campaign B', 'Todo'], [$row[3], $row[4], $row[5]]);
        $this->assertSame(['-', '-', '-', '-', '-', '-'], [$row[6], $row[7], $row[8], $row[10], $row[11], $row[12]]);
        $this->assertSame('-', $row[9]);
        $this->assertSame('-', $row[13]);
        $this->assertSame(['-', '-', '-'], [$row[14], $row[15], $row[16]]);
        $this->assertSame('-', $row[17]);
    }

    public function test_user_without_cards_gets_single_placeholder_row(): void
    {
        $users = collect([
            (object) ['name' => 'Rudi', 'divisions' => [(object) ['name' => 'Ops']], 'cards' => collect()],
        ]);

        $table = (new ReportPreviewTableService())->build($users);

        $this->assertCount(1, $table['rows']);
        $row = $table['rows'][0];
        $this->assertCount(18, $row);
        $this->assertSame([1, 'Rudi', 'Ops', 'Tidak ada data'], array_slice($row, 0, 4));
        $this->assertSame(array_fill(0, 14, '-'), array_slice($row, 4));
    }

    public function test_rows_are_numbered_sequentially_across_users_and_attachments(): void
    {
        $makeCard = fn (string $title, array $files) => (object) [
            'title' => $title,
            'attachments' => collect($files)->map(fn ($name) => (object) [
                'file_name' => $name,
                'quantity' => 1,
            ]),
        ];

        $users = collect([
            (object) [
                'name' => 'Andi',
                'divisions' => [],
                'cards' => collect([
                    $makeCard('Card A', ['a1.pdf', 'a2.pdf']),
                    $makeCard('Card B', ['b1.pdf']),
                ]),
            ],
            (object) [
                'name' => 'Sari',
                'divisions' => [],
                'cards' => collect([$makeCard('Card C', ['c1.pdf'])]),
            ],
        ]);

        $table = (new ReportPreviewTableService())->build($users);

        $this->assertSame([1, 2, 3, 4], array_column($table['rows'], 0));
    }

    public function test_locked_attachment_status_is_marked_and_archived_attachments_are_skipped(): void
    {
        $locked = new class {
            public string $file_name = 'lama.pdf';
            public ?string $attachment_type = 'file';
            public $created_at = '2025-01-01 00:00:00';
            public $qc_at = null;
            public int $quantity = 2;
            public $qc_quantity = null;
            public $qc_note = null;
            public $qcBy = null;
            public $archived_at = null;

            public function isDownloadLocked(): bool
            {
                return true;
            }
        };

        $users = collect([
            (object) [
                'name' => 'Dewi',
                'divisions' => [],
                'cards' => collect([
                    (object) [
                        'title' => 'Laporan',
                        'attachments' => collect([
                            $locked,
                            (object) ['file_name' => 'arsip.pdf', 'archived_at' => '2026-01-01 00:00:00'],
                        ]),
                    ],
                ]),
            ],
        ]);

        $table = (new ReportPreviewTableService())->build($users);

        $this->assertCount(1, $table['rows']);
        $this->assertSame('lama.pdf', $table['rows'][0][9]);
        $this->assertSame('0 / 2', $table['rows'][0][13]);
        $this->assertSame('Belum QC (Terkunci)', $table['rows'][0][14]);
    }
}
