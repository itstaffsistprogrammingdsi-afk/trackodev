<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Log Kerja - {{ $summary['periode'] }}</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica', Arial, sans-serif;
            font-size: 11px;
            color: #1f2937;
            margin: 0;
            padding: 0;
        }

        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }

        .header h1 {
            font-size: 18px;
            margin: 0 0 4px 0;
            color: #111827;
        }

        .header p {
            margin: 0;
            font-size: 11px;
            color: #6b7280;
        }

        .summary-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .summary-grid td {
            padding: 8px 10px;
            border: 1px solid #e5e7eb;
            width: 25%;
            text-align: center;
        }

        .summary-grid .label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
        }

        .summary-grid .value {
            font-size: 16px;
            font-weight: bold;
            color: #111827;
        }

        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #111827;
            margin: 18px 0 6px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #e5e7eb;
        }

        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        table.data-table th {
            background-color: #2563eb;
            color: #ffffff;
            font-size: 10px;
            text-align: left;
            padding: 6px 8px;
        }

        table.data-table td {
            font-size: 10px;
            padding: 6px 8px;
            border-bottom: 1px solid #e5e7eb;
        }

        table.data-table tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .empty-note {
            font-size: 10px;
            color: #9ca3af;
            font-style: italic;
            padding: 8px 0;
        }

        .footer {
            margin-top: 24px;
            font-size: 9px;
            color: #9ca3af;
            text-align: right;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>Laporan Log Kerja</h1>
        <p>{{ $summary['nama_user'] }} &middot; Periode: {{ $summary['periode'] }}</p>
    </div>

    <table class="summary-grid">
        <tr>
            <td>
                <div class="value">{{ $summary['total_completed_tasks'] }}</div>
                <div class="label">Task Selesai</div>
            </td>
            <td>
                <div class="value">{{ $summary['total_activities'] }}</div>
                <div class="label">Aktivitas</div>
            </td>
            <td>
                <div class="value">{{ $summary['total_attachments'] }}</div>
                <div class="label">Attachment</div>
            </td>
            <td>
                <div class="value">{{ $summary['total_storage_used_mb'] }} MB</div>
                <div class="label">Storage Terpakai</div>
            </td>
        </tr>
    </table>

    {{-- TASK SELESAI --}}
    <div class="section-title">Task Selesai</div>

    @if ($completedTasks->isEmpty())
        <p class="empty-note">Tidak ada task yang selesai pada periode ini.</p>
    @else
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 8%">ID</th>
                    <th style="width: 34%">Judul Task</th>
                    <th style="width: 18%">Board</th>
                    <th style="width: 18%">Due Date</th>
                    <th style="width: 22%">Selesai Pada</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($completedTasks as $task)
                    <tr>
                        <td>{{ $task->id }}</td>
                        <td>{{ $task->title }}</td>
                        <td>{{ $task->board?->name ?? '-' }}</td>
                        <td>{{ optional($task->due_date)->format('d-m-Y') ?? '-' }}</td>
                        <td>{{ optional($task->completed_at)->format('d-m-Y H:i') ?? '-' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- LOG AKTIVITAS --}}
    <div class="section-title">Log Aktivitas</div>

    @if ($activities->isEmpty())
        <p class="empty-note">Tidak ada aktivitas pada periode ini.</p>
    @else
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 18%">Waktu</th>
                    <th style="width: 14%">Aksi</th>
                    <th style="width: 16%">Entity</th>
                    <th style="width: 52%">Deskripsi</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($activities as $activity)
                    <tr>
                        <td>{{ optional($activity->created_at)->format('d-m-Y H:i') }}</td>
                        <td>{{ $activity->action }}</td>
                        <td>{{ $activity->entity_type }}</td>
                        <td>{{ $activity->description }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- ATTACHMENT --}}
    <div class="section-title">Attachment</div>

    @if ($attachments->isEmpty())
        <p class="empty-note">Tidak ada attachment pada periode ini.</p>
    @else
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 8%">ID</th>
                    <th style="width: 26%">Terkait Task</th>
                    <th style="width: 26%">Nama File</th>
                    <th style="width: 12%">Tipe</th>
                    <th style="width: 12%">Ukuran</th>
                    <th style="width: 16%">Diupload Pada</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($attachments as $attachment)
                    <tr>
                        <td>{{ $attachment->id }}</td>
                        <td>{{ $attachment->card?->title ?? '-' }}</td>
                        <td>{{ $attachment->file_name ?? '-' }}</td>
                        <td>{{ $attachment->attachment_type }}</td>
                        <td>{{ round(($attachment->file_size ?? 0) / 1024, 1) }} KB</td>
                        <td>{{ optional($attachment->created_at)->format('d-m-Y H:i') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        Dicetak pada {{ now()->translatedFormat('d F Y H:i') }}
    </div>

</body>
</html>
