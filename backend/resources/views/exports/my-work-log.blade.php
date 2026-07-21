<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Log Kerja - {{ $summary['periode'] }}</title>
    <style>
        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Helvetica', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #1f2937;
            background: #f3f4f6;
        }

        .page {
            max-width: 1040px;
            margin: 0 auto;
            background: #ffffff;
            padding: 28px 32px;
        }

        /* ---------------------------------------------------------------
           HEADER
        --------------------------------------------------------------- */

        .header {
            display: table;
            width: 100%;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }

        .header-left {
            display: table-cell;
            vertical-align: bottom;
        }

        .header-right {
            display: table-cell;
            vertical-align: bottom;
            text-align: right;
        }

        .eyebrow {
            font-size: 9px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #2563eb;
            font-weight: bold;
            margin: 0 0 4px 0;
        }

        .header h1 {
            font-size: 20px;
            margin: 0 0 4px 0;
            color: #111827;
        }

        .header p {
            margin: 0;
            font-size: 11px;
            color: #6b7280;
        }

        .user-chip {
            display: inline-block;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            border-radius: 4px;
            padding: 5px 10px;
            font-size: 10px;
            font-weight: bold;
        }

        .period-chip {
            display: block;
            margin-top: 6px;
            font-size: 10px;
            color: #6b7280;
        }

        /* ---------------------------------------------------------------
           SUMMARY METRIC CARDS
        --------------------------------------------------------------- */

        .summary-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
            margin: 0 0 22px -8px;
            width: calc(100% + 16px);
        }

        .summary-grid td {
            width: 25%;
            padding: 12px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            border-top: 3px solid #2563eb;
            text-align: left;
            background: #f9fafb;
        }

        .summary-grid td.accent-green {
            border-top-color: #16a34a;
        }

        .summary-grid td.accent-amber {
            border-top-color: #d97706;
        }

        .summary-grid td.accent-purple {
            border-top-color: #7c3aed;
        }

        .summary-grid .label {
            font-size: 8.5px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .summary-grid .value {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
        }

        /* ---------------------------------------------------------------
           SECTIONS
        --------------------------------------------------------------- */

        .section-title {
            display: table;
            width: 100%;
            font-size: 13px;
            font-weight: bold;
            color: #111827;
            margin: 20px 0 8px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
        }

        .section-title .count-badge {
            display: table-cell;
            text-align: right;
            font-size: 9px;
            font-weight: normal;
            color: #6b7280;
        }

        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            table-layout: fixed;
        }

        table.data-table th {
            background-color: #2563eb;
            color: #ffffff;
            font-size: 9.5px;
            text-align: left;
            padding: 7px 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        table.data-table th:first-child {
            border-radius: 4px 0 0 0;
        }

        table.data-table th:last-child {
            border-radius: 0 4px 0 0;
        }

        table.data-table td {
            font-size: 10px;
            padding: 7px 8px;
            border-bottom: 1px solid #e5e7eb;
            word-wrap: break-word;
            overflow-wrap: break-word;
            vertical-align: top;
        }

        table.data-table tr:nth-child(even) td {
            background-color: #f9fafb;
        }

        .location-path {
            color: #374151;
        }

        .location-path .sep {
            color: #9ca3af;
            padding: 0 2px;
        }

        .location-empty {
            color: #9ca3af;
            font-style: italic;
        }

        .file-link {
            color: #1d4ed8;
            text-decoration: underline;
        }

        .muted {
            color: #9ca3af;
        }

        /* Badges */

        .badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: bold;
            text-transform: capitalize;
            border: 1px solid transparent;
        }

        .badge-create {
            background: #dcfce7;
            color: #15803d;
            border-color: #bbf7d0;
        }

        .badge-update {
            background: #dbeafe;
            color: #1d4ed8;
            border-color: #bfdbfe;
        }

        .badge-delete {
            background: #fee2e2;
            color: #b91c1c;
            border-color: #fecaca;
        }

        .badge-default {
            background: #f3f4f6;
            color: #374151;
            border-color: #e5e7eb;
        }

        .badge-entity {
            background: #ede9fe;
            color: #6d28d9;
            border-color: #ddd6fe;
        }

        .badge-file {
            background: #fef3c7;
            color: #b45309;
            border-color: #fde68a;
        }

        .badge-link {
            background: #e0f2fe;
            color: #0369a1;
            border-color: #bae6fd;
        }

        .empty-note {
            font-size: 10px;
            color: #9ca3af;
            font-style: italic;
            padding: 10px 2px;
        }

        .footer {
            display: table;
            width: 100%;
            margin-top: 26px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #9ca3af;
        }

        .footer-left {
            display: table-cell;
        }

        .footer-right {
            display: table-cell;
            text-align: right;
        }

        /* ---------------------------------------------------------------
           SCREEN PREVIEW (ignored by dompdf's fixed-size PDF rendering,
           applies only if this view is ever opened directly in a browser
           for an on-screen "print preview")
        --------------------------------------------------------------- */

        @media screen {
            body {
                padding: 24px 12px;
            }

            .page {
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
                border-radius: 8px;
            }
        }

        @media screen and (max-width: 768px) {
            .page {
                padding: 18px 16px;
            }

            .header,
            .header-left,
            .header-right,
            .footer,
            .footer-left,
            .footer-right {
                display: block;
                text-align: left;
                width: 100%;
            }

            .header-right {
                margin-top: 10px;
            }

            .summary-grid,
            .summary-grid tbody,
            .summary-grid tr {
                display: block;
                width: 100%;
            }

            .summary-grid td {
                display: block;
                width: 100%;
                margin: 0 0 8px 0;
            }

            table.data-table,
            table.data-table thead,
            table.data-table tbody {
                display: block;
                width: 100%;
            }

            table.data-table th {
                display: none;
            }

            table.data-table tr {
                display: block;
                margin-bottom: 10px;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 6px 8px;
            }

            table.data-table td {
                display: block;
                border-bottom: none;
                padding: 3px 0;
            }
        }
    </style>
</head>

<body>
    <div class="page">

        <div class="header">
            <div class="header-left">
                <p class="eyebrow">Laporan Aktivitas Kerja</p>
                <h1>Log Kerja</h1>
                <p>Ringkasan task, aktivitas, dan attachment per periode</p>
            </div>
            <div class="header-right">
                <span class="user-chip">{{ $summary['nama_user'] }}</span>
                <span class="period-chip">Periode: {{ $summary['periode'] }}</span>
            </div>
        </div>

        <table class="summary-grid">
            <tr>
                <td class="accent-green">
                    <div class="value">{{ $summary['total_completed_tasks'] }}</div>
                    <div class="label">Task Selesai</div>
                </td>
                <td>
                    <div class="value">{{ $summary['total_activities'] }}</div>
                    <div class="label">Aktivitas</div>
                </td>
                <td class="accent-amber">
                    <div class="value">{{ $summary['total_attachments'] }}</div>
                    <div class="label">Attachment</div>
                </td>
                <td class="accent-purple">
                    <div class="value">{{ $summary['total_storage_used_mb'] }} MB</div>
                    <div class="label">Storage Terpakai</div>
                </td>
            </tr>
        </table>

        {{-- Small helper to render a Workspace / Campaign / Board breadcrumb
         consistently across every section below. --}}
        @php
            $renderPath = function (...$parts) {
                $parts = array_values(array_filter($parts));

                if (empty($parts)) {
                    return '<span class="location-empty">-</span>';
                }

                return '<span class="location-path">' .
                    implode('<span class="sep">&rsaquo;</span>', array_map('e', $parts)) .
                    '</span>';
            };

            $actionBadgeClass = function (?string $action) {
                $action = strtolower((string) $action);

                if (str_contains($action, 'create') || str_contains($action, 'tambah')) {
                    return 'badge-create';
                }

                if (str_contains($action, 'delete') || str_contains($action, 'hapus')) {
                    return 'badge-delete';
                }

                if (str_contains($action, 'update') || str_contains($action, 'edit') || str_contains($action, 'ubah')) {
                    return 'badge-update';
                }

                return 'badge-default';
            };
        @endphp

        {{-- TASK SELESAI --}}
        <div class="section-title">
            <span>Task Selesai</span>
            <span class="count-badge">{{ $completedTasks->count() }} task</span>
        </div>

        @if ($completedTasks->isEmpty())
            <p class="empty-note">Tidak ada task yang selesai pada periode ini.</p>
        @else
            <table class="data-table">
                <colgroup>
                    <col style="width: 22%">
                    <col style="width: 30%">
                    <col style="width: 16%">
                    <col style="width: 16%">
                    <col style="width: 16%">
                </colgroup>
                <thead>
                    <tr>
                        <th>Judul Task</th>
                        <th>Lokasi (Workspace &rsaquo; Campaign)</th>
                        <th>Board</th>
                        <th>Due Date</th>
                        <th>Selesai Pada</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($completedTasks as $task)
                        @php
                            $board = $task->board;
                            $campaign = $board?->campaign;
                            $workspace = $campaign?->workspace;
                        @endphp
                        <tr>
                            <td>{{ $task->title }}</td>
                            <td>{!! $renderPath($workspace?->name, $campaign?->name) !!}</td>
                            <td>{{ $board?->name ?? '-' }}</td>
                            <td>{{ optional($task->due_date)->format('d-m-Y') ?? '-' }}</td>
                            <td>{{ optional($task->completed_at)->format('d-m-Y H:i') ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        {{-- ATTACHMENT --}}
        <div class="section-title">
            <span>Attachment</span>
            <span class="count-badge">{{ $attachments->count() }} file</span>
        </div>

        @if ($attachments->isEmpty())
            <p class="empty-note">Tidak ada attachment pada periode ini.</p>
        @else
            <table class="data-table">
                <colgroup>
                    <col style="width: 20%">
                    <col style="width: 26%">
                    <col style="width: 24%">
                    <col style="width: 10%">
                    <col style="width: 10%">
                    <col style="width: 10%">
                </colgroup>
                <thead>
                    <tr>
                        <th>Nama File</th>
                        <th>Terkait Task</th>
                        <th>Lokasi (Workspace &rsaquo; Campaign &rsaquo; Board)</th>
                        <th>Tipe</th>
                        <th>Ukuran</th>
                        <th>Diupload Pada</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($attachments as $attachment)
                        @php
                            $board = $attachment->card?->board;
                            $campaign = $board?->campaign;
                            $workspace = $campaign?->workspace;

                            // Attachment tipe 'link' tidak pernah punya file_name
                            // (lihat CardController::addAttachment) — jadi kalau
                            // kosong, pakai link_url-nya sendiri sebagai label.
                            $attachmentUrl =
                                $attachment->attachment_type === 'link' ? $attachment->link_url : $attachment->file_url;

                            $attachmentLabel =
                                $attachment->file_name ?:
                                ($attachment->attachment_type === 'link'
                                    ? $attachment->link_url
                                    : null) ?:
                                '-';
                        @endphp
                        <tr>
                            <td>
                                @if ($attachmentUrl)
                                    <a href="{{ $attachmentUrl }}" class="file-link">{{ $attachmentLabel }}</a>
                                @else
                                    {{ $attachmentLabel }}
                                @endif
                            </td>
                            <td>{{ $attachment->card?->title ?? '-' }}</td>
                            <td>{!! $renderPath($workspace?->name, $campaign?->name, $board?->name) !!}</td>
                            <td>
                                <span
                                    class="badge {{ $attachment->attachment_type === 'file' ? 'badge-file' : 'badge-link' }}">
                                    {{ $attachment->attachment_type }}
                                </span>
                            </td>
                            <td>{{ round(($attachment->file_size ?? 0) / 1024, 1) }} KB</td>
                            <td>{{ optional($attachment->created_at)->format('d-m-Y H:i') }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

        {{-- LOG AKTIVITAS --}}
        <div class="section-title">
            <span>Log Aktivitas</span>
            <span class="count-badge">{{ $activities->count() }} aktivitas</span>
        </div>

        @if ($activities->isEmpty())
            <p class="empty-note">Tidak ada aktivitas pada periode ini.</p>
        @else
            <table class="data-table">
                <colgroup>
                    <col style="width: 13%">
                    <col style="width: 10%">
                    <col style="width: 10%">
                    <col style="width: 27%">
                    <col style="width: 40%">
                </colgroup>
                <thead>
                    <tr>
                        <th>Waktu</th>
                        <th>Aksi</th>
                        <th>Entity</th>
                        <th>Lokasi (Workspace &rsaquo; Campaign &rsaquo; Board / Card)</th>
                        <th>Deskripsi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($activities as $activity)
                        <tr>
                            <td>{{ optional($activity->created_at)->format('d-m-Y H:i') }}</td>
                            <td><span
                                    class="badge {{ $actionBadgeClass($activity->action) }}">{{ $activity->action }}</span>
                            </td>
                            <td><span class="badge badge-entity">{{ $activity->entity_type }}</span></td>
                            <td>
                                @if ($activity->location_label && $activity->location_label !== '-')
                                    <span class="location-path">{{ $activity->location_label }}</span>
                                @else
                                    <span class="location-empty">-</span>
                                @endif
                            </td>
                            <td>{{ $activity->description }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif



        <div class="footer">
            <div class="footer-left">Log Kerja &middot; {{ $summary['nama_user'] }}</div>
            <div class="footer-right">Dicetak pada {{ now()->translatedFormat('d F Y H:i') }}</div>
        </div>

    </div>
</body>

</html>
