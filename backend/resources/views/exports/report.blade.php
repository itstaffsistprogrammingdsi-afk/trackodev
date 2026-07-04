<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Laporan Kinerja & QC</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px; /* Font kecil agar muat banyak kolom di PDF Landscape */
            color: #333;
        }
        h2 {
            text-align: center;
            margin-bottom: 5px;
        }
        .subtitle {
            text-align: center;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #999;
            padding: 6px;
            vertical-align: top;
        }
        th {
            background-color: #e4e4e4;
            font-weight: bold;
            text-align: left;
        }
        .text-center {
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 2px 4px;
            margin-bottom: 2px;
            border-radius: 3px;
            font-size: 9px;
            background-color: #eee;
            border: 1px solid #ccc;
        }
    </style>
</head>
<body>

    <h2>Laporan Kinerja & Quality Control (QC)</h2>
    <div class="subtitle">Tanggal Export: {{ now()->format('d M Y H:i') }}</div>

    <table>
        <thead>
            <tr>
                <th width="3%" class="text-center">No</th>
                <th width="15%">Nama User</th>
                <th width="12%">Divisi</th>
                <th width="20%">Judul Card / Task</th>
                <th width="15%">Campaign & Board</th>
                <th width="15%">Label & Brand</th>
                <th width="20%">Status Attachment & QC</th>
            </tr>
        </thead>
        <tbody>
            @forelse($users as $index => $user)
                
                @php 
                    $cardCount = $user->cards->count(); 
                @endphp

                @if($cardCount > 0)
                    {{-- Loop jika user memiliki satu atau lebih Card --}}
                    @foreach($user->cards as $cardIndex => $card)
                        <tr>
                            {{-- Tampilkan Kolom User & Divisi hanya di baris pertama Card milik user tersebut --}}
                            @if($cardIndex === 0)
                                <td class="text-center" rowspan="{{ $cardCount }}">{{ $index + 1 }}</td>
                                <td rowspan="{{ $cardCount }}"><strong>{{ $user->name }}</strong></td>
                                <td rowspan="{{ $cardCount }}">{{ $user->divisions->pluck('name')->implode(', ') ?: '-' }}</td>
                            @endif

                            {{-- Data Card --}}
                            <td>{{ $card->title ?? '-' }}</td>
                            
                            <td>
                                <strong>Campaign:</strong> {{ optional($card->campaign)->name ?? '-' }}<br>
                                <strong>Board:</strong> {{ optional($card->board)->name ?? '-' }}
                            </td>
                            
                            <td>
                                @if($card->labels->count() > 0)
                                    <div><strong>Label:</strong> {{ $card->labels->pluck('name')->implode(', ') }}</div>
                                @endif
                                @if($card->brands->count() > 0)
                                    <div style="margin-top: 4px;"><strong>Brand:</strong> {{ $card->brands->pluck('name')->implode(', ') }}</div>
                                @endif
                            </td>

                            {{-- Data Attachment & QC --}}
                            <td>
                                @forelse($card->attachments as $attachment)
                                    <div style="margin-bottom: 6px; border-bottom: 1px dotted #ccc; padding-bottom: 4px;">
                                        File: <em>{{ $attachment->file_name ?? 'Attachment' }}</em><br>
                                        QC: <strong>{{ $attachment->qc_quantity ?? 0 }}</strong> / {{ $attachment->quantity ?? 0 }} ACC
                                        @if($attachment->qcBy)
                                            <br><span style="font-size: 9px; color: #666;">(by: {{ $attachment->qcBy->name }})</span>
                                        @endif
                                    </div>
                                @empty
                                    <span style="color: #999; font-style: italic;">Tidak ada file</span>
                                @endforelse
                            </td>
                        </tr>
                    @endforeach
                @else
                    {{-- Render jika User sama sekali tidak memiliki Card --}}
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td><strong>{{ $user->name }}</strong></td>
                        <td>{{ $user->divisions->pluck('name')->implode(', ') ?: '-' }}</td>
                        <td colspan="4" class="text-center" style="color: #999; font-style: italic;">
                            Tidak ada data task/card yang sesuai filter
                        </td>
                    </tr>
                @endif

            @empty
                <tr>
                    <td colspan="7" class="text-center" style="padding: 20px;">
                        <strong>Tidak ada data user yang ditemukan.</strong>
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

</body>
</html>