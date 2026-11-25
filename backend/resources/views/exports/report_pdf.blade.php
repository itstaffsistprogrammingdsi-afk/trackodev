<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Laporan Kinerja &amp; Quality Control</title>
    <style>
        .report-document,
        .report-document * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .report-document {
            font-family: 'DejaVu Sans', 'Arial', 'Helvetica', sans-serif;
            font-size: 7.5px;
            color: #1f2937;
            line-height: 1.38;
            padding: 6px;
            background: #ffffff;
        }

        /* Header */
        .report-document .doc-header {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            border-bottom: 2px solid #1a237e;
        }

        .report-document .doc-header td {
            border: none;
            padding: 0 0 8px 0;
            vertical-align: bottom;
        }

        .report-document .doc-wordmark {
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #1a237e;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .report-document .doc-title {
            font-size: 15px;
            font-weight: bold;
            color: #111827;
            letter-spacing: 0.3px;
        }

        .report-document .doc-subtitle {
            font-size: 8px;
            color: #4b5563;
            margin-top: 2px;
        }

        .report-document .doc-meta-right {
            text-align: right;
            font-size: 7.5px;
            color: #4b5563;
        }

        .report-document .period-badge {
            display: inline-block;
            background-color: #e8eaf6;
            color: #1a237e;
            border: 1px solid #c5cae9;
            padding: 2px 7px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7.5px;
            margin-bottom: 3px;
        }

        /* KPI Grid */
        .report-document .kpi-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px 0;
            margin: 0 0 12px -6px;
            table-layout: fixed;
        }

        .report-document .kpi-table td {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-top: 3px solid #1a237e;
            border-radius: 4px;
            padding: 6px 8px;
            vertical-align: top;
        }

        .report-document .kpi-table td.kpi-card {
            border-top-color: #0d47a1;
        }

        .report-document .kpi-table td.kpi-attachment {
            border-top-color: #d97706;
        }

        .report-document .kpi-table td.kpi-qc {
            border-top-color: #15803d;
        }

        .report-document .kpi-label {
            font-size: 6.5px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 2px;
        }

        .report-document .kpi-value {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
        }

        /* Section Titles */
        .report-document .section-block {
            margin-bottom: 12px;
        }

        .report-document .section-header {
            margin-bottom: 5px;
            padding-bottom: 3px;
            border-bottom: 1px solid #cbd5e1;
        }

        .report-document .section-number {
            display: inline-block;
            background-color: #1a237e;
            color: #ffffff;
            font-size: 7px;
            font-weight: bold;
            padding: 1px 5px;
            border-radius: 2px;
            margin-right: 5px;
        }

        .report-document .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #1a237e;
            letter-spacing: 0.2px;
        }

        .report-document .section-note {
            font-size: 7px;
            color: #64748b;
            margin-left: 6px;
        }

        /* Data Tables */
        .report-document table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5px;
            table-layout: fixed;
        }

        .report-document thead {
            display: table-header-group;
        }

        .report-document tr,
        .report-document .attachment-item {
            page-break-inside: avoid;
        }

        .report-document table.data-table th {
            background-color: #1a237e;
            color: #ffffff;
            font-weight: bold;
            padding: 4px 4px;
            border: 1px solid #1a237e;
            text-align: left;
            font-size: 7.5px;
            vertical-align: middle;
        }

        .report-document table.data-table td {
            padding: 3.5px 4px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            font-size: 7.5px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .report-document .row-even td {
            background-color: #f8fafc;
        }

        .report-document .row-odd td {
            background-color: #ffffff;
        }

        .report-document .row-total td {
            background-color: #e8eaf6;
            color: #1a237e;
            font-weight: bold;
            border-top: 1.5px solid #1a237e;
        }

        /* Utilities */
        .report-document .text-center { text-align: center; }
        .report-document .text-right { text-align: right; }
        .report-document .text-muted { color: #94a3b8; font-style: italic; }
        .report-document .font-bold { font-weight: bold; }

        /* Section 01 columns */
        .report-document .col-date-recap { width: 20%; }
        .report-document .col-metric-recap { width: 16%; text-align: center; }

        /* Section 02 columns (11 cols = 100%) */
        .report-document .col-no { width: 3.5%; text-align: center; }
        .report-document .col-user { width: 10%; }
        .report-document .col-divisi { width: 8.5%; }
        .report-document .col-card { width: 17%; }
        .report-document .col-campaign { width: 11%; }
        .report-document .col-board { width: 8%; }
        .report-document .col-date { width: 7.5%; text-align: center; }
        .report-document .col-status { width: 7.5%; text-align: center; }
        .report-document .col-labels { width: 12%; }

        /* Section 03 columns (11 cols = 100%) */
        .report-document .col-qc-no { width: 3.5%; text-align: center; }
        .report-document .col-qc-user { width: 9.5%; }
        .report-document .col-qc-card { width: 14%; }
        .report-document .col-qc-file { width: 17%; }
        .report-document .col-qc-type { width: 5.5%; text-align: center; }
        .report-document .col-qc-date { width: 7.5%; text-align: center; }
        .report-document .col-qc-qty { width: 6%; text-align: center; }
        .report-document .col-qc-status { width: 7.5%; text-align: center; }
        .report-document .col-qc-by { width: 8.5%; }
        .report-document .col-qc-note { width: 13.5%; }

        /* Content Styling */
        .report-document .user-name {
            font-weight: bold;
            font-size: 7.5px;
            color: #1a237e;
        }

        .report-document .divisi-list {
            font-size: 7px;
            color: #334155;
            display: block;
            line-height: 1.3;
        }

        .report-document .card-title {
            font-weight: bold;
            font-size: 7.5px;
            color: #0d47a1;
            display: block;
        }

        .report-document .card-desc {
            font-size: 6.5px;
            color: #64748b;
            display: block;
            margin-top: 1px;
        }

        .report-document .workspace-sub {
            font-size: 6.5px;
            color: #64748b;
            display: block;
        }

        /* Status Chips */
        .report-document .chip {
            display: inline-block;
            padding: 1.5px 5px;
            border-radius: 3px;
            font-size: 6.5px;
            font-weight: bold;
            white-space: nowrap;
        }

        .report-document .chip-green {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
        }

        .report-document .chip-red {
            background-color: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
        }

        .report-document .chip-blue {
            background-color: #dbeafe;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
        }

        .report-document .chip-amber {
            background-color: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
        }

        .report-document .chip-gray {
            background-color: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
        }

        .report-document .label-item {
            display: inline-block;
            padding: 1px 4px;
            margin: 1px 2px 1px 0;
            border-radius: 2px;
            font-size: 6.5px;
            font-weight: bold;
            white-space: nowrap;
        }

        .report-document .brand-item {
            display: inline-block;
            padding: 1px 4px;
            margin: 1px 2px 1px 0;
            border-radius: 2px;
            font-size: 6.5px;
            border: 1px solid #cbd5e1;
            white-space: nowrap;
        }

        .report-document .attachment-link {
            color: #1a237e;
            text-decoration: underline;
            font-weight: bold;
            word-break: break-all;
        }

        .report-document .attachment-plain {
            color: #1f2937;
            font-weight: bold;
            word-break: break-all;
        }

        .report-document .empty-state {
            text-align: center;
            color: #64748b;
            font-style: italic;
            padding: 8px;
            background-color: #f8fafc;
        }

        .report-document .no-data-card {
            color: #64748b;
            font-style: italic;
            font-size: 7px;
            padding: 4px;
        }

        .report-document .footer {
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px solid #cbd5e1;
            font-size: 7px;
            color: #64748b;
            text-align: center;
        }

        @media print {
            .report-document {
                padding: 0;
            }
        }
    </style>
</head>

<body>
<div class="report-document">
    @include('exports.partials.ownership-watermark')

    @php
        $usersCollection = collect($users ?? []);
        $metaData = is_array($meta ?? null) ? $meta : [];
        $periodLabel = $metaData['period_label'] ?? 'Semua periode';
        $generatedAt = $metaData['generated_at'] ?? now()->format('d M Y H:i');
        $shouldShowDateSummary = array_key_exists('showDateSummary', get_defined_vars())
            ? (bool) $showDateSummary
            : true;
        $dateSummaryRows = is_array($dateSummary ?? null) ? $dateSummary : [];

        $chunkCardsCount = $usersCollection->sum(fn ($u) => collect($u->cards ?? [])->count());
        $chunkAttachments = $usersCollection->flatMap(
            fn ($u) => collect($u->cards ?? [])->flatMap(fn ($c) => collect($c->attachments ?? []))
        );
        $chunkAttachmentsCount = $chunkAttachments->count();
        $chunkQcTotal = (int) $chunkAttachments->sum(fn ($a) => (int) ($a->qc_quantity ?? 0));

        $recapCreatedTotal = (int) collect($dateSummaryRows)->sum(fn ($r) => (int) ($r['created'] ?? 0));
        $recapCompletedTotal = (int) collect($dateSummaryRows)->sum(fn ($r) => (int) ($r['completed'] ?? 0));
        $recapUploadedTotal = (int) collect($dateSummaryRows)->sum(fn ($r) => (int) ($r['uploaded'] ?? 0));
        $recapQcCountTotal = (int) collect($dateSummaryRows)->sum(fn ($r) => (int) ($r['qc'] ?? 0));
        $recapQcQtyTotal = (int) collect($dateSummaryRows)->sum(fn ($r) => (int) ($r['qc_quantity'] ?? 0));

        $kpiUsers = (int) ($totalUsers ?? $usersCollection->count());
        $kpiCards = (int) ($metaData['total_cards'] ?? (! empty($dateSummaryRows) ? $recapCreatedTotal : $chunkCardsCount));
        $kpiAttachments = (int) ($metaData['total_attachments'] ?? (! empty($dateSummaryRows) ? $recapUploadedTotal : $chunkAttachmentsCount));
        $kpiQc = (int) ($metaData['total_qc'] ?? (! empty($dateSummaryRows) ? $recapQcQtyTotal : $chunkQcTotal));
        $qcNumberOffset = (int) ($qcOffset ?? 0);

        $formatDate = function ($value, string $format = 'd/m/Y'): string {
            if (empty($value)) {
                return '-';
            }
            try {
                return \Carbon\Carbon::parse($value)->format($format);
            } catch (\Throwable) {
                return '-';
            }
        };

        $todayStart = \Carbon\Carbon::today();
    @endphp

    <!-- HEADER -->
    <table class="doc-header">
        <tr>
            <td>
                <div class="doc-wordmark">TRACKO</div>
                <div class="doc-title">Laporan Kinerja &amp; Quality Control</div>
                <div class="doc-subtitle">
                    Ringkasan aktivitas tanggal, detail penyelesaian card, dan verifikasi quality control lampiran
                    @if(isset($workspace))
                        &bull; Workspace: {{ $workspace->name ?? 'Semua' }}
                    @endif
                    @if(isset($campaign))
                        &bull; Campaign: {{ $campaign->name ?? 'Semua' }}
                    @endif
                    @if(isset($board))
                        &bull; Board: {{ $board->name ?? 'Semua' }}
                    @endif
                </div>
            </td>
            <td class="doc-meta-right">
                <div class="period-badge">Periode: {{ $periodLabel }}</div>
                <div>Generated: {{ $generatedAt }}</div>
            </td>
        </tr>
    </table>

    <!-- KPI SUMMARY -->
    <table class="kpi-table">
        <tr>
            <td>
                <div class="kpi-label">Total User</div>
                <div class="kpi-value">{{ $kpiUsers }}</div>
            </td>
            <td class="kpi-card">
                <div class="kpi-label">Total Card</div>
                <div class="kpi-value">{{ $kpiCards }}</div>
            </td>
            <td class="kpi-attachment">
                <div class="kpi-label">Total Attachment</div>
                <div class="kpi-value">{{ $kpiAttachments }}</div>
            </td>
            <td class="kpi-qc">
                <div class="kpi-label">Total QC</div>
                <div class="kpi-value">{{ $kpiQc }}</div>
            </td>
        </tr>
    </table>

    <!-- SECTION 01: REKAP TANGGAL -->
    @if ($shouldShowDateSummary)
        <div class="section-block">
            <div class="section-header">
                <span class="section-number">01</span>
                <span class="section-title">Rekap Tanggal</span>
                <span class="section-note">Agregasi aktivitas harian berdasarkan periode laporan</span>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="col-date-recap">Tanggal</th>
                        <th class="col-metric-recap text-center">Card Dibuat</th>
                        <th class="col-metric-recap text-center">Card Selesai</th>
                        <th class="col-metric-recap text-center">Attachment Diunggah</th>
                        <th class="col-metric-recap text-center">Attachment Di-QC</th>
                        <th class="col-metric-recap text-center">Jumlah QC</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($dateSummaryRows as $recapIndex => $recap)
                        @php
                            $recapRowClass = $recapIndex % 2 === 0 ? 'row-even' : 'row-odd';
                        @endphp
                        <tr class="{{ $recapRowClass }}">
                            <td class="font-bold">{{ $formatDate($recap['date'] ?? null, 'd/m/Y') }}</td>
                            <td class="text-center">{{ (int) ($recap['created'] ?? 0) }}</td>
                            <td class="text-center">{{ (int) ($recap['completed'] ?? 0) }}</td>
                            <td class="text-center">{{ (int) ($recap['uploaded'] ?? 0) }}</td>
                            <td class="text-center">{{ (int) ($recap['qc'] ?? 0) }}</td>
                            <td class="text-center font-bold">{{ (int) ($recap['qc_quantity'] ?? 0) }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="empty-state">Tidak ada aktivitas tanggal yang tercatat pada periode ini.</td>
                        </tr>
                    @endforelse
                    @if (! empty($dateSummaryRows))
                        <tr class="row-total">
                            <td>TOTAL</td>
                            <td class="text-center">{{ $recapCreatedTotal }}</td>
                            <td class="text-center">{{ $recapCompletedTotal }}</td>
                            <td class="text-center">{{ $recapUploadedTotal }}</td>
                            <td class="text-center">{{ $recapQcCountTotal }}</td>
                            <td class="text-center">{{ $recapQcQtyTotal }}</td>
                        </tr>
                    @endif
                </tbody>
            </table>
        </div>
    @endif

    <!-- SECTION 02: DETAIL KINERJA -->
    <div class="section-block">
        <div class="section-header">
            <span class="section-number">02</span>
            <span class="section-title">Detail Kinerja</span>
            <span class="section-note">Daftar card per user beserta tanggal pembuatan, tenggat waktu, dan tanggal selesai</span>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th class="col-no text-center">No</th>
                    <th class="col-user">User</th>
                    <th class="col-divisi">Divisi</th>
                    <th class="col-card">Card</th>
                    <th class="col-campaign">Campaign</th>
                    <th class="col-board">Board</th>
                    <th class="col-date text-center">Tanggal Dibuat</th>
                    <th class="col-date text-center">Due Date</th>
                    <th class="col-date text-center">Tanggal Selesai</th>
                    <th class="col-status text-center">Status</th>
                    <th class="col-labels">Label &amp; Brand</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($usersCollection as $index => $user)
                    @php
                        $cards = collect($user->cards ?? []);
                        $cardCount = $cards->count();
                        $divisions = collect($user->divisions ?? []);
                        $globalIndex = (int) ($user->report_number ?? ((int) ($userOffset ?? 0) + (int) $index + 1));
                        $rowClass = ($globalIndex - 1) % 2 === 0 ? 'row-even' : 'row-odd';
                    @endphp

                    @if ($cardCount > 0)
                        @foreach ($cards as $cardIndex => $card)
                            @php
                                $completedAt = $card->completed_at ?? null;
                                $dueDate = $card->due_date ?? null;
                                $cardStatusRaw = strtolower((string) ($card->status ?? ''));
                                $boardNameRaw = strtolower((string) data_get($card, 'board.name', ''));
                                $boardTypeRaw = strtolower((string) data_get($card, 'board.type', ''));

                                $isCompleted = ! empty($completedAt)
                                    || $cardStatusRaw === 'completed'
                                    || $boardTypeRaw === 'done'
                                    || $boardNameRaw === 'done';

                                $isOverdue = false;
                                if (! $isCompleted && ! empty($dueDate)) {
                                    try {
                                        $isOverdue = \Carbon\Carbon::parse($dueDate)->startOfDay()->lt($todayStart);
                                    } catch (\Throwable) {
                                        $isOverdue = false;
                                    }
                                }

                                if ($isCompleted) {
                                    $statusText = 'Selesai';
                                    $statusChipClass = 'chip-green';
                                } elseif ($isOverdue) {
                                    $statusText = 'Terlambat';
                                    $statusChipClass = 'chip-red';
                                } elseif (in_array($cardStatusRaw, ['in_progress', 'progress', 'review'], true) || in_array($boardTypeRaw, ['in_progress', 'progress'], true)) {
                                    $statusText = 'Berjalan';
                                    $statusChipClass = 'chip-blue';
                                } else {
                                    $statusText = 'Belum';
                                    $statusChipClass = 'chip-gray';
                                }

                                $campaignName = data_get($card, 'campaign.name')
                                    ?? data_get($card, 'board.campaign.name')
                                    ?? '-';
                                $workspaceName = data_get($card, 'board.campaign.workspace.name')
                                    ?? data_get($card, 'campaign.workspace.name')
                                    ?? data_get($card, 'workspace.name');
                                $labels = collect($card->labels ?? []);
                                $brands = collect($card->brands ?? []);
                            @endphp
                            <tr class="{{ $rowClass }}">
                                @if ($cardIndex === 0)
                                    <td class="col-no text-center">{{ $globalIndex }}</td>
                                    <td class="col-user">
                                        <span class="user-name">{{ $user->name ?? '-' }}</span>
                                    </td>
                                    <td class="col-divisi">
                                        @if ($divisions->isNotEmpty())
                                            <span class="divisi-list">{{ $divisions->pluck('name')->implode(', ') }}</span>
                                        @else
                                            <span class="text-muted">-</span>
                                        @endif
                                    </td>
                                @else
                                    <td class="col-no text-center"></td>
                                    <td class="col-user"></td>
                                    <td class="col-divisi"></td>
                                @endif

                                <td class="col-card">
                                    <span class="card-title">{{ $card->title ?? '-' }}</span>
                                    @if (! empty($card->description))
                                        <span class="card-desc">{{ Str::limit(\App\Services\RichTextService::plainText($card->description), 55) }}</span>
                                    @endif
                                </td>

                                <td class="col-campaign">
                                    <div>{{ $campaignName }}</div>
                                    @if (! empty($workspaceName))
                                        <span class="workspace-sub">{{ $workspaceName }}</span>
                                    @endif
                                </td>

                                <td class="col-board">
                                    {{ data_get($card, 'board.name') ?? '-' }}
                                </td>

                                <td class="col-date text-center">
                                    {{ $formatDate($card->created_at ?? null) }}
                                </td>

                                <td class="col-date text-center">
                                    {{ $formatDate($dueDate) }}
                                </td>

                                <td class="col-date text-center">
                                    {{ $formatDate($completedAt) }}
                                </td>

                                <td class="col-status text-center">
                                    <span class="chip {{ $statusChipClass }}">{{ $statusText }}</span>
                                </td>

                                <td class="col-labels">
                                    @if ($labels->isNotEmpty())
                                        <div style="margin-bottom:2px;">
                                            @foreach ($labels as $label)
                                                <span class="label-item"
                                                    style="background: {{ $label->color ?? '#e0e0e0' }}20; border-left: 3px solid {{ $label->color ?? '#999' }};">
                                                    {{ $label->name ?? '-' }}
                                                </span>
                                            @endforeach
                                        </div>
                                    @endif
                                    @if ($brands->isNotEmpty())
                                        <div>
                                            @foreach ($brands as $brand)
                                                <span class="brand-item"
                                                    style="color: {{ $brand->color ?? '#333' }}; border-color: {{ $brand->color ?? '#ccc' }};">
                                                    {{ $brand->name ?? '-' }}
                                                </span>
                                            @endforeach
                                        </div>
                                    @endif
                                    @if ($labels->isEmpty() && $brands->isEmpty())
                                        <span class="text-muted">-</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    @else
                        <tr class="{{ $rowClass }}">
                            <td class="col-no text-center">{{ $globalIndex }}</td>
                            <td class="col-user"><span class="user-name">{{ $user->name ?? '-' }}</span></td>
                            <td class="col-divisi">
                                @if ($divisions->isNotEmpty())
                                    <span class="divisi-list">{{ $divisions->pluck('name')->implode(', ') }}</span>
                                @else
                                    <span class="text-muted">-</span>
                                @endif
                            </td>
                            <td colspan="8" class="no-data-card">Tidak ada data task/card yang sesuai filter</td>
                        </tr>
                    @endif
                @empty
                    <tr>
                        <td colspan="11" class="empty-state"><strong>Tidak ada data user yang ditemukan.</strong></td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <!-- SECTION 03: QUALITY CONTROL -->
    @php
        $qcRows = [];
        foreach ($usersCollection as $user) {
            foreach (collect($user->cards ?? []) as $card) {
                foreach (collect($card->attachments ?? []) as $attachment) {
                    if (! empty($attachment->archived_at)) {
                        continue;
                    }
                    $qcRows[] = [
                        'user' => $user,
                        'card' => $card,
                        'attachment' => $attachment,
                    ];
                }
            }
        }
        $isExport = isset($signedLinks) && $signedLinks;
    @endphp

    <div class="section-block">
        <div class="section-header">
            <span class="section-number">03</span>
            <span class="section-title">Quality Control</span>
            <span class="section-note">Rincian lampiran kerja, tanggal unggah, tanggal verifikasi QC, dan catatan hasil</span>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th class="col-qc-no text-center">No</th>
                    <th class="col-qc-user">User</th>
                    <th class="col-qc-card">Card</th>
                    <th class="col-qc-file">Lampiran</th>
                    <th class="col-qc-type text-center">Tipe</th>
                    <th class="col-qc-date text-center">Tanggal Upload</th>
                    <th class="col-qc-date text-center">Tanggal QC</th>
                    <th class="col-qc-qty text-center">Qty</th>
                    <th class="col-qc-status text-center">Status</th>
                    <th class="col-qc-by">QC Oleh</th>
                    <th class="col-qc-note">Catatan</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($qcRows as $qcIndex => $item)
                    @php
                        $qcUser = $item['user'];
                        $qcCard = $item['card'];
                        $attachment = $item['attachment'];
                        $qcRowClass = $qcIndex % 2 === 0 ? 'row-even' : 'row-odd';

                        $rawName = $attachment->file_name
                            ?? ($attachment->link_url
                            ?? ($attachment->result_description ?? 'Attachment'));
                        $displayName = Str::limit((string) $rawName, 36);
                        $attachmentType = $attachment->attachment_type ?? '-';

                        $isLocked = method_exists($attachment, 'isDownloadLocked') && $attachment->isDownloadLocked();

                        $hasUrl = false;
                        $url = null;
                        if ($attachmentType === 'link' && ! empty($attachment->link_url)) {
                            $hasUrl = true;
                            $url = $attachment->link_url;
                        } elseif (! empty($attachment->file_url)) {
                            $hasUrl = true;
                            $url = $attachment->file_url;
                        }

                        $hasQc = ($attachment->qc_quantity ?? null) !== null;
                        $qtyDisplay = $hasQc
                            ? ((int) $attachment->qc_quantity) . ' / ' . ((int) ($attachment->quantity ?? 0))
                            : (string) ((int) ($attachment->quantity ?? 0));
                        $qcByName = data_get($attachment, 'qcBy.name') ?? '-';
                        $qcNote = ! empty($attachment->qc_note) ? Str::limit((string) $attachment->qc_note, 80) : '-';
                    @endphp
                    <tr class="{{ $qcRowClass }}">
                        <td class="col-qc-no text-center">{{ $qcNumberOffset + $qcIndex + 1 }}</td>
                        <td class="col-qc-user">
                            <span class="user-name">{{ $qcUser->name ?? '-' }}</span>
                        </td>
                        <td class="col-qc-card">
                            <span class="card-title">{{ $qcCard->title ?? '-' }}</span>
                        </td>
                        <td class="col-qc-file">
                            @if ($isLocked)
                                <span class="attachment-plain">{{ $displayName }}</span>
                                <span class="chip chip-gray" style="margin-left:2px;">Terkunci</span>
                            @elseif ($isExport && $attachmentType === 'file' && ! empty($attachment->file_path))
                                <a
                                    href="{{ app(\App\Services\AttachmentSignedUrlService::class)->for($attachment) }}"
                                    class="attachment-link"
                                >{{ $displayName }}</a>
                            @elseif ($isExport && $hasUrl && $url)
                                <a
                                    href="{{ $url }}"
                                    class="attachment-link"
                                >{{ $displayName }}</a>
                            @elseif ($hasUrl && $url && $attachmentType === 'file')
                                <a
                                    href="#attachment-preview"
                                    class="attachment-link"
                                    data-attachment-preview="true"
                                    data-attachment-url="{{ $url }}"
                                    data-attachment-name="{{ $attachment->file_name ?? $displayName }}"
                                    data-attachment-file-type="{{ $attachment->file_type ?? '' }}"
                                    title="Preview {{ $attachment->file_name ?? $displayName }}"
                                >{{ $displayName }}</a>
                            @else
                                <span class="attachment-plain">{{ $displayName }}</span>
                            @endif
                        </td>
                        <td class="col-qc-type text-center">
                            <span class="chip chip-gray">{{ $attachmentType }}</span>
                        </td>
                        <td class="col-qc-date text-center">
                            {{ $formatDate($attachment->created_at ?? null) }}
                        </td>
                        <td class="col-qc-date text-center">
                            {{ $formatDate($attachment->qc_at ?? null) }}
                        </td>
                        <td class="col-qc-qty text-center font-bold">
                            {{ $qtyDisplay }}
                        </td>
                        <td class="col-qc-status text-center">
                            @if ($hasQc)
                                <span class="chip chip-green">ACC</span>
                            @else
                                <span class="chip chip-amber">Belum QC</span>
                            @endif
                        </td>
                        <td class="col-qc-by">
                            {{ $qcByName }}
                        </td>
                        <td class="col-qc-note">
                            @if ($qcNote !== '-')
                                {{ $qcNote }}
                            @else
                                <span class="text-muted">-</span>
                            @endif
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="11" class="empty-state">Tidak ada lampiran quality control pada data ini.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <span>Laporan ini dihasilkan secara otomatis oleh sistem TRACKO</span>
        <span>|</span>
        <span>Generated: {{ $generatedAt }}</span>
    </div>

</div>
</body>
</html>
