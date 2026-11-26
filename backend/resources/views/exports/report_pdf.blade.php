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

        .report-document .kpi-table td.kpi-completed {
            border-top-color: #15803d;
        }

        .report-document .kpi-table td.kpi-rate {
            border-top-color: #7c3aed;
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

        /* Data Table */
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
            padding: 4px 3.5px;
            border: 1px solid #1a237e;
            text-align: left;
            font-size: 7.5px;
            vertical-align: middle;
        }

        .report-document table.data-table td {
            padding: 3.5px 3.5px;
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

        /* Utilities */
        .report-document .text-center { text-align: center; }
        .report-document .text-right { text-align: right; }
        .report-document .text-muted { color: #94a3b8; font-style: italic; }
        .report-document .font-bold { font-weight: bold; }

        /* 12 Columns = 100% */
        .report-document .col-no { width: 3%; text-align: center; }
        .report-document .col-user { width: 8.5%; }
        .report-document .col-divisi { width: 7%; }
        .report-document .col-card { width: 13.5%; }
        .report-document .col-campaign { width: 9%; }
        .report-document .col-board { width: 6.5%; }
        .report-document .col-date { width: 6.5%; text-align: center; }
        .report-document .col-status { width: 6.5%; text-align: center; }
        .report-document .col-attachment { width: 20%; }
        .report-document .col-labels { width: 6.5%; }

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
            padding: 2px 5px;
            border-radius: 999px;
            font-size: 6.2px;
            font-weight: bold;
            line-height: 1.2;
            white-space: nowrap;
            vertical-align: middle;
        }

        .report-document .chip-dot {
            display: inline-block;
            width: 3px;
            height: 3px;
            margin-right: 2.5px;
            border-radius: 50%;
            background: currentColor;
            vertical-align: middle;
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

        /* Attachment Stack */
        .report-document .attachment-item {
            margin-bottom: 4px;
            padding-bottom: 3.5px;
            border-bottom: 1px dashed #cbd5e1;
        }

        .report-document .attachment-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
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

        .report-document .attachment-meta {
            font-size: 6.5px;
            color: #475569;
            margin-top: 1.5px;
            line-height: 1.35;
        }

        .report-document .attachment-meta-table {
            width: 100%;
            margin-top: 3px;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .report-document .attachment-meta-table td {
            border: none;
            padding: 1.5px 2px 1.5px 0;
            vertical-align: top;
        }

        .report-document .attachment-meta-label {
            display: block;
            font-size: 5.8px;
            font-weight: bold;
            letter-spacing: 0.35px;
            text-transform: uppercase;
            color: #94a3b8;
            line-height: 1.2;
        }

        .report-document .attachment-meta-value {
            display: block;
            margin-top: 0.5px;
            font-size: 7px;
            color: #334155;
            line-height: 1.3;
        }

        .report-document .attachment-head {
            margin-bottom: 1px;
        }

        .report-document .attachment-note {
            font-size: 6.5px;
            color: #334155;
            margin-top: 1px;
            font-style: italic;
        }

        .report-document .empty-state {
            text-align: center;
            color: #64748b;
            font-style: italic;
            padding: 10px;
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
    @if (! isset($showOwnershipWatermark) || $showOwnershipWatermark)
        @include('exports.partials.ownership-watermark')
    @endif

    @php
        $usersCollection = collect($users ?? []);
        $metaData = is_array($meta ?? null) ? $meta : [];
        $periodLabel = $metaData['period_label'] ?? 'Semua periode';
        $generatedAt = $metaData['generated_at'] ?? now()->format('d M Y H:i');

        $chunkCardsCount = $usersCollection->sum(fn ($u) => collect($u->cards ?? [])->count());
        $chunkAttachments = $usersCollection->flatMap(
            fn ($u) => collect($u->cards ?? [])->flatMap(
                fn ($c) => collect($c->attachments ?? [])->filter(fn ($a) => empty($a->archived_at))
            )
        );
        $chunkAttachmentsCount = $chunkAttachments->count();
        $chunkQcTotal = (int) $chunkAttachments->sum(fn ($a) => (int) ($a->qc_quantity ?? 0));

        $kpiUsers = (int) ($totalUsers ?? $usersCollection->count());
        $kpiCards = (int) ($metaData['total_cards'] ?? $chunkCardsCount);
        $kpiTasks = (int) ($metaData['total_tasks'] ?? $kpiCards);
        $kpiCompleted = (int) ($metaData['completed_tasks'] ?? $usersCollection
            ->flatMap(fn ($u) => collect($u->cards ?? []))
            ->filter(fn ($c) => ! empty($c->completed_at))
            ->count());
        $kpiRate = (float) ($metaData['completion_rate'] ?? ($kpiTasks > 0
            ? round(($kpiCompleted / $kpiTasks) * 100, 2)
            : 0));
        $kpiAttachments = (int) ($metaData['total_attachments'] ?? $chunkAttachmentsCount);
        $kpiQc = (int) ($metaData['total_qc'] ?? $chunkQcTotal);

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
        $isExport = isset($signedLinks) && $signedLinks;
    @endphp

    <!-- HEADER -->
    <table class="doc-header">
        <tr>
            <td>
                <div class="doc-wordmark">TRACKO</div>
                <div class="doc-title">Laporan Kinerja &amp; Quality Control</div>
                <div class="doc-subtitle">
                    Detail penyelesaian card, tenggat waktu, dan verifikasi quality control lampiran
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
                <div class="kpi-label">Total Task</div>
                <div class="kpi-value">{{ $kpiTasks }}</div>
            </td>
            <td class="kpi-completed">
                <div class="kpi-label">Completed</div>
                <div class="kpi-value">{{ $kpiCompleted }}</div>
            </td>
            <td class="kpi-rate">
                <div class="kpi-label">Completion Rate</div>
                <div class="kpi-value">{{ number_format($kpiRate, 1) }}%</div>
            </td>
            <td class="kpi-attachment">
                <div class="kpi-label">Total Lampiran</div>
                <div class="kpi-value">{{ $kpiAttachments }}</div>
            </td>
            <td class="kpi-qc">
                <div class="kpi-label">Total QC</div>
                <div class="kpi-value">{{ $kpiQc }}</div>
            </td>
        </tr>
    </table>

    <!-- SECTION 01: DETAIL KINERJA & QUALITY CONTROL -->
    <div class="section-block">
        <div class="section-header">
            <span class="section-number">01</span>
            <span class="section-title">Detail Kinerja &amp; Quality Control</span>
            <span class="section-note">Daftar card per user beserta tanggal pengerjaan, lampiran hasil, dan status quality control</span>
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
                    <th class="col-attachment">Lampiran &amp; Quality Control</th>
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
                                $attachments = collect($card->attachments ?? [])->filter(fn ($a) => empty($a->archived_at))->values();
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

                                <td class="col-attachment">
                                    @if ($attachments->isNotEmpty())
                                        @foreach ($attachments as $attachment)
                                            @php
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
                                                $totalQty = (int) ($attachment->quantity ?? 0);
                                                $qtyDisplay = $hasQc
                                                    ? ((int) $attachment->qc_quantity) . '/' . $totalQty
                                                    : '0/' . $totalQty;
                                                $statusQcLabel = $hasQc ? 'ACC' : 'Belum QC';
                                                $statusQcClass = $hasQc ? 'chip-green' : 'chip-amber';
                                                $qcByName = data_get($attachment, 'qcBy.name') ?? '-';
                                                $uploadDateFormatted = $formatDate($attachment->created_at ?? null);
                                                $qcDateFormatted = $formatDate($attachment->qc_at ?? null);
                                                $qcNote = ! empty($attachment->qc_note) ? Str::limit((string) $attachment->qc_note, 90) : null;
                                            @endphp
                                            <div class="attachment-item">
                                                <div class="attachment-head">
                                                    @if ($isLocked)
                                                        <span class="attachment-plain">{{ $displayName }}</span>
                                                        <span class="chip chip-gray" style="margin-left:2px;"><span class="chip-dot"></span>Terkunci</span>
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
                                                    @if ($attachmentType !== '-')
                                                        <span class="chip chip-gray" style="margin-left:2px;">{{ $attachmentType }}</span>
                                                    @endif
                                                </div>

                                                <table class="attachment-meta-table">
                                                    <tr>
                                                        <td>
                                                            <span class="attachment-meta-label">Upload</span>
                                                            <span class="attachment-meta-value">{{ $uploadDateFormatted }}</span>
                                                        </td>
                                                        <td>
                                                            <span class="attachment-meta-label">QC</span>
                                                            <span class="attachment-meta-value">{{ $qcDateFormatted }}</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <span class="attachment-meta-label">Qty</span>
                                                            <span class="attachment-meta-value">{{ $qtyDisplay }}</span>
                                                        </td>
                                                        <td>
                                                            <span class="attachment-meta-label">Status</span>
                                                            <span class="attachment-meta-value">
                                                                <span class="chip {{ $statusQcClass }}"><span class="chip-dot"></span>{{ $statusQcLabel }}</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td colspan="2">
                                                            <span class="attachment-meta-label">QC oleh</span>
                                                            <span class="attachment-meta-value">{{ $qcByName }}</span>
                                                        </td>
                                                    </tr>
                                                </table>

                                                @if ($qcNote)
                                                    <div class="attachment-note">Catatan: {{ $qcNote }}</div>
                                                @endif
                                            </div>
                                        @endforeach
                                    @else
                                        <span class="text-muted">Tidak ada lampiran</span>
                                    @endif
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
                            <td colspan="9" class="no-data-card">Tidak ada data task/card yang sesuai filter</td>
                        </tr>
                    @endif
                @empty
                    <tr>
                        <td colspan="12" class="empty-state"><strong>Tidak ada data user yang ditemukan.</strong></td>
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
