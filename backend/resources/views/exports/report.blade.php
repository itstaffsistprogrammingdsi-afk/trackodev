<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Laporan Kinerja & QC</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #333;
        }
        h2 {
            text-align: center;
            margin-bottom: 5px;
            font-size: 16px;
        }
        .subtitle {
            text-align: center;
            margin-bottom: 20px;
            font-size: 11px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #999;
            padding: 5px 6px;
            vertical-align: top;
        }
        th {
            background-color: #e4e4e4;
            font-weight: bold;
            text-align: left;
            font-size: 10px;
        }
        .text-center {
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 2px 4px;
            margin-bottom: 2px;
            border-radius: 3px;
            font-size: 8px;
            background-color: #eee;
            border: 1px solid #ccc;
        }
        .attachment-item {
            margin-bottom: 4px;
            border-bottom: 1px dotted #ddd;
            padding-bottom: 4px;
        }
        .attachment-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .text-muted {
            color: #999;
            font-style: italic;
        }
        .qc-approved {
            color: #28a745;
            font-weight: bold;
        }
        .qc-pending {
            color: #ffc107;
        }
        .divisi-list {
            font-size: 9px;
        }
    </style>
</head>
<body>

    <h2>Laporan Kinerja &amp; Quality Control (QC)</h2>
    <div class="subtitle">
        Tanggal Export: {{ now()->format('d M Y H:i') }} | 
        Total User: {{ $users->count() }}
    </div>

    <table>
        <thead>
            <tr>
                <th width="3%" class="text-center">No</th>
                <th width="14%">Nama User</th>
                <th width="12%">Divisi</th>
                <th width="18%">Judul Card</th>
                <th width="15%">Campaign</th>
                <th width="10%">Board</th>
                <th width="13%">Label &amp; Brand</th>
                <th width="15%">Attachment &amp; QC</th>
            </tr>
        </thead>
        <tbody>
            @forelse($users as $index => $user)
                
                @php 
                    $cards = $user->cards ?? collect();
                    $cardCount = $cards->count(); 
                @endphp

                @if($cardCount > 0)
                    @foreach($cards as $cardIndex => $card)
                        <tr>
                            @if($cardIndex === 0)
                                <td class="text-center" rowspan="{{ $cardCount }}">{{ $index + 1 }}</td>
                                <td rowspan="{{ $cardCount }}">
                                    <strong>{{ $user->name }}</strong>
                                </td>
                                <td rowspan="{{ $cardCount }}">
                                    @if($user->divisions && $user->divisions->count() > 0)
                                        <span class="divisi-list">
                                            {{ $user->divisions->pluck('name')->implode(', ') }}
                                        </span>
                                    @else
                                        <span class="text-muted">-</span>
                                    @endif
                                </td>
                            @endif

                            {{-- Data Card --}}
                            <td>
                                <strong>{{ $card->title ?? '-' }}</strong>
                                @if($card->description)
                                    <br><span style="font-size: 9px; color: #666;">{{ Str::limit($card->description, 50) }}</span>
                                @endif
                            </td>
                            
                            <td>
                                {{ optional($card->campaign)->name ?? '-' }}
                            </td>
                            
                            <td>
                                {{ optional($card->board)->name ?? '-' }}
                            </td>
                            
                            <td>
                                @if($card->labels && $card->labels->count() > 0)
                                    <div><strong>Label:</strong> {{ $card->labels->pluck('name')->implode(', ') }}</div>
                                @endif
                                @if($card->brands && $card->brands->count() > 0)
                                    <div style="margin-top: 2px;"><strong>Brand:</strong> {{ $card->brands->pluck('name')->implode(', ') }}</div>
                                @endif
                                @if($card->labels->count() == 0 && $card->brands->count() == 0)
                                    <span class="text-muted">-</span>
                                @endif
                            </td>

                            {{-- Data Attachment & QC --}}
                            <td>
                                @php
                                    $attachments = $card->attachments ?? collect();
                                @endphp
                                
                                @if($attachments->count() > 0)
                                    @foreach($attachments as $attachment)
                                        <div class="attachment-item">
                                            <div>
                                                <span style="font-size: 9px;">
                                                    {{ Str::limit($attachment->file_name ?? 'Attachment', 20) }}
                                                </span>
                                            </div>
                                            <div style="font-size: 9px;">
                                                QC: 
                                                @if($attachment->qc_quantity !== null)
                                                    <span class="qc-approved">
                                                        {{ $attachment->qc_quantity }} / {{ $attachment->quantity ?? 0 }} ACC
                                                    </span>
                                                    @if($attachment->qcBy)
                                                        <br><span style="font-size: 8px; color: #666;">
                                                            by: {{ $attachment->qcBy->name }}
                                                        </span>
                                                    @endif
                                                @else
                                                    <span class="qc-pending">Belum QC</span>
                                                    <span style="font-size: 8px; color: #666;">
                                                        ({{ $attachment->quantity ?? 0 }} file)
                                                    </span>
                                                @endif
                                            </div>
                                        </div>
                                    @endforeach
                                @else
                                    <span class="text-muted">Tidak ada file</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                @else
                    {{-- User tanpa Card --}}
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td><strong>{{ $user->name }}</strong></td>
                        <td>
                            @if($user->divisions && $user->divisions->count() > 0)
                                {{ $user->divisions->pluck('name')->implode(', ') }}
                            @else
                                <span class="text-muted">-</span>
                            @endif
                        </td>
                        <td colspan="5" class="text-center text-muted">
                            Tidak ada data task/card yang sesuai filter
                        </td>
                    </tr>
                @endif

            @empty
                <tr>
                    <td colspan="8" class="text-center" style="padding: 20px;">
                        <strong>Tidak ada data user yang ditemukan.</strong>
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div style="margin-top: 20px; font-size: 9px; color: #999; text-align: center;">
        Laporan ini dihasilkan secara otomatis oleh sistem {{ now()->format('d/m/Y H:i:s') }}
    </div>

</body>
</html>