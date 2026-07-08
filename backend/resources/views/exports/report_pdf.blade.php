<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Laporan Kinerja & QC</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', 'Arial', 'Helvetica', sans-serif;
            font-size: 8px;
            color: #333;
            line-height: 1.4;
            padding: 5px;
        }

        .header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
        }

        .header h2 {
            font-size: 16px;
            font-weight: bold;
            color: #1a237e;
            margin-bottom: 2px;
            letter-spacing: 0.5px;
        }

        .header .subtitle {
            font-size: 10px;
            color: #666;
        }

        .header .subtitle span {
            margin: 0 8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5px;
        }

        table th {
            background-color: #e8eaf6;
            color: #1a237e;
            font-weight: bold;
            padding: 4px 3px;
            border: 1px solid #999;
            text-align: left;
            font-size: 7.5px;
            vertical-align: middle;
        }

        table td {
            padding: 3px;
            border: 1px solid #999;
            vertical-align: top;
            font-size: 7.5px;
            word-wrap: break-word;
        }

        /* Lebar kolom tetap */
        .col-no { width: 3%; text-align: center; }
        .col-user { width: 9%; }
        .col-divisi { width: 8%; }
        .col-card { width: 13%; }
        .col-campaign { width: 9%; }
        .col-board { width: 7%; }
        .col-labels { width: 10%; }
        .col-attachment { width: 15%; }
        .col-qc-qty { width: 8%; text-align: center; }
        .col-qc-note { width: 18%; }

        .text-center { text-align: center; }
        .text-muted { color: #999; font-style: italic; }
        .font-bold { font-weight: bold; }

        .user-name {
            font-weight: bold;
            font-size: 8px;
            color: #1a237e;
        }
        .divisi-list {
            font-size: 7px;
            display: block;
            line-height: 1.3;
        }

        .card-title {
            font-weight: bold;
            font-size: 8px;
            color: #0d47a1;
        }
        .card-desc,
        .card-date {
            font-size: 6.5px;
            color: #666;
            display: block;
            margin-top: 1px;
        }

        .label-item {
            display: inline-block;
            padding: 1px 4px;
            margin: 1px 2px 1px 0;
            border-radius: 2px;
            font-size: 6.5px;
            font-weight: bold;
            white-space: nowrap;
        }
        .brand-item {
            display: inline-block;
            padding: 1px 4px;
            margin: 1px 2px 1px 0;
            border-radius: 2px;
            font-size: 6.5px;
            border: 1px solid #ccc;
            white-space: nowrap;
        }

        .attachment-item {
            margin-bottom: 3px;
            padding-bottom: 3px;
            border-bottom: 1px dotted #ddd;
        }
        .attachment-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .attachment-name {
            font-size: 7px;
            font-weight: bold;
            color: #333;
        }
        .attachment-name a {
            color: #1a237e;
            text-decoration: underline;
            word-break: break-all;
        }

        .attachment-qc {
            font-size: 7px;
            margin-top: 1px;
        }
        .attachment-qc .qc-approved {
            color: #2e7d32;
            font-weight: bold;
        }
        .attachment-qc .qc-pending {
            color: #f57f17;
        }
        .attachment-qc .qc-by {
            font-size: 6.5px;
            color: #888;
        }

        .attachment-type {
            font-size: 6px;
            color: #888;
            display: inline-block;
            padding: 1px 3px;
            background: #f5f5f5;
            border-radius: 2px;
        }

        .no-data {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 15px;
        }
        .no-data-card {
            color: #999;
            font-style: italic;
            font-size: 7px;
            padding: 5px;
        }

        .footer {
            margin-top: 12px;
            padding-top: 6px;
            border-top: 1px solid #ddd;
            font-size: 7px;
            color: #999;
            text-align: center;
        }

        .row-even {
            background-color: #fafafa;
        }
        .row-odd {
            background-color: #ffffff;
        }

        @media print {
            body {
                padding: 0;
            }
        }
    </style>
</head>

<body>

    <!-- HEADER -->
    <div class="header">
        <h2>LAPORAN KINERJA &amp; QUALITY CONTROL</h2>
        <div class="subtitle">
            <span>Tanggal: {{ now()->format('d M Y') }}</span>
            <span>|</span>
            <span>Waktu: {{ now()->format('H:i') }}</span>
            <span>|</span>
            <span>Total User: {{ $users->count() }}</span>
        </div>
    </div>

    <!-- TABLE -->
    <table>
        <thead>
            <tr>
                <th class="col-no">No</th>
                <th class="col-user">Nama User</th>
                <th class="col-divisi">Divisi</th>
                <th class="col-card">Judul Card<br><span style="font-weight:normal;font-size:6px;">(Created / Due)</span></th>
                <th class="col-campaign">Campaign</th>
                <th class="col-board">Board</th>
                <th class="col-labels">Label &amp; Brand</th>
                <th class="col-attachment">Attachment &amp; QC<br><span style="font-weight:normal;font-size:6px;">(Tanggal QC)</span></th>
                <th class="col-qc-qty">Jumlah Akhir QC</th>
                <th class="col-qc-note">Catatan QC</th>
            </tr>
        </thead>
        <tbody>
            @forelse($users as $index => $user)
                @php
                    $cards = $user->cards ?? collect();
                    $cardCount = $cards->count();
                    $rowClass = $index % 2 == 0 ? 'row-even' : 'row-odd';
                @endphp

                @if ($cardCount > 0)
                    @foreach ($cards as $cardIndex => $card)
                        <tr class="{{ $rowClass }}">
                            {{-- Kolom No, Nama User, Divisi menggunakan rowspan hanya jika ada lebih dari 1 card --}}
                            @if ($cardIndex === 0)
                                <td class="col-no text-center" rowspan="{{ $cardCount }}">{{ $index + 1 }}</td>
                                <td class="col-user" rowspan="{{ $cardCount }}">
                                    <span class="user-name">{{ $user->name ?? '-' }}</span>
                                </td>
                                <td class="col-divisi" rowspan="{{ $cardCount }}">
                                    @if ($user->divisions && $user->divisions->count() > 0)
                                        <span class="divisi-list">{{ $user->divisions->pluck('name')->implode(', ') }}</span>
                                    @else
                                        <span class="text-muted">-</span>
                                    @endif
                                </td>
                            @endif

                            {{-- Kolom Card --}}
                            <td class="col-card">
                                <span class="card-title">{{ $card->title ?? '-' }}</span>
                                @if (!empty($card->description))
                                    <span class="card-desc">{{ Str::limit($card->description, 50) }}</span>
                                @endif
                                <span class="card-date">
                                    Created: {{ $card->created_at ? \Carbon\Carbon::parse($card->created_at)->format('d/m/Y') : '-' }} 
                                    | Due: {{ $card->due_date ? \Carbon\Carbon::parse($card->due_date)->format('d/m/Y') : '-' }}
                                </span>
                            </td>

                            {{-- Campaign --}}
                            <td class="col-campaign">
                                {{ $card->campaign->name ?? ($card->board->campaign->name ?? '-') }}
                            </td>

                            {{-- Board --}}
                            <td class="col-board">
                                {{ $card->board->name ?? '-' }}
                            </td>

                            {{-- Label & Brand --}}
                            <td class="col-labels">
                                @if ($card->labels && $card->labels->count() > 0)
                                    <div style="margin-bottom:2px;">
                                        @foreach ($card->labels as $label)
                                            <span class="label-item"
                                                style="background: {{ $label->color ?? '#e0e0e0' }}20; border-left: 3px solid {{ $label->color ?? '#999' }};">
                                                {{ $label->name }}
                                            </span>
                                        @endforeach
                                    </div>
                                @endif
                                @if ($card->brands && $card->brands->count() > 0)
                                    <div>
                                        @foreach ($card->brands as $brand)
                                            <span class="brand-item"
                                                style="color: {{ $brand->color ?? '#333' }}; border-color: {{ $brand->color ?? '#ccc' }};">
                                                {{ $brand->name }}
                                            </span>
                                        @endforeach
                                    </div>
                                @endif
                                @if (($card->labels->count() ?? 0) == 0 && ($card->brands->count() ?? 0) == 0)
                                    <span class="text-muted">-</span>
                                @endif
                            </td>

                            {{-- Attachment & QC --}}
                            <td class="col-attachment">
                                @php
                                    $attachments = $card->attachments ?? collect();
                                @endphp
                                @if ($attachments->count() > 0)
                                    @foreach ($attachments as $attachment)
                                        <div class="attachment-item">
                                            <div class="attachment-name">
                                                @php
                                                    $displayName = $attachment->file_name 
                                                        ?? ($attachment->link_url 
                                                        ?? ($attachment->result_description ?? 'Attachment'));
                                                    $displayName = Str::limit($displayName, 30);
                                                    $hasUrl = false;
                                                    $url = null;
                                                    if ($attachment->attachment_type === 'link' && $attachment->link_url) {
                                                        $hasUrl = true;
                                                        $url = $attachment->link_url;
                                                    } elseif ($attachment->file_url) {
                                                        $hasUrl = true;
                                                        $url = $attachment->file_url;
                                                    }
                                                @endphp

                                                @if ($hasUrl && $url)
                                                    <a href="{{ $url }}">{{ $displayName }}</a>
                                                    @if ($attachment->attachment_type)
                                                        <span class="attachment-type">{{ $attachment->attachment_type }}</span>
                                                    @endif
                                                @else
                                                    {{ $displayName }}
                                                    @if ($attachment->attachment_type)
                                                        <span class="attachment-type">{{ $attachment->attachment_type }}</span>
                                                    @endif
                                                @endif
                                            </div>
                                            <div class="attachment-qc">
                                                @if ($attachment->qc_quantity !== null)
                                                    <span class="qc-approved">ACC: {{ $attachment->qc_quantity }} / {{ $attachment->quantity ?? 0 }}</span>
                                                    @if ($attachment->qcBy)
                                                        <span class="qc-by">oleh: {{ $attachment->qcBy->name }}</span>
                                                    @endif
                                                    @if ($attachment->qc_at)
                                                        <br><span class="qc-by">di QC pada: {{ \Carbon\Carbon::parse($attachment->qc_at)->format('d M Y H:i') }}</span>
                                                    @endif
                                                @else
                                                    <span class="qc-pending">Belum QC</span>
                                                    <span style="font-size:6.5px;color:#888;">({{ $attachment->quantity ?? 0 }} file)</span>
                                                @endif
                                            </div>
                                        </div>
                                    @endforeach
                                @else
                                    <span class="text-muted">Tidak ada file</span>
                                @endif
                            </td>

                            {{-- Jumlah Akhir QC --}}
                            <td class="col-qc-qty text-center">
                                @php
                                    $totalQc = $attachments->sum('qc_quantity');
                                @endphp
                                @if ($attachments->count() > 0 && $totalQc > 0)
                                    <span class="font-bold">{{ $totalQc }}</span>
                                @else
                                    <span class="text-muted">-</span>
                                @endif
                            </td>

                            {{-- Catatan QC --}}
                            <td class="col-qc-note">
                                @php
                                    $notes = $attachments->pluck('qc_note')->filter()->implode('; ');
                                @endphp
                                @if ($notes)
                                    {{ Str::limit($notes, 80) }}
                                @else
                                    <span class="text-muted">-</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                @else
                    {{-- User tanpa card --}}
                    <tr class="{{ $rowClass }}">
                        <td class="col-no text-center">{{ $index + 1 }}</td>
                        <td class="col-user"><span class="user-name">{{ $user->name ?? '-' }}</span></td>
                        <td class="col-divisi">
                            @if ($user->divisions && $user->divisions->count() > 0)
                                <span class="divisi-list">{{ $user->divisions->pluck('name')->implode(', ') }}</span>
                            @else
                                <span class="text-muted">-</span>
                            @endif
                        </td>
                        <td colspan="7" class="no-data-card">Tidak ada data task/card yang sesuai filter</td>
                    </tr>
                @endif

            @empty
                <tr>
                    <td colspan="10" class="no-data"><strong>Tidak ada data user yang ditemukan.</strong></td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- FOOTER -->
    <div class="footer">
        <span>Laporan ini dihasilkan secara otomatis oleh sistem</span>
        <span>|</span>
        <span>Generated: {{ now()->format('d/m/Y H:i:s') }}</span>
    </div>

</body>
</html>