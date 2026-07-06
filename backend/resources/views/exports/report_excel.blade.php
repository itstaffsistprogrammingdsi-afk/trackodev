<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Kinerja & QC</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #333; }
        h2 { text-align: center; font-size: 14px; margin-bottom: 5px; }
        .subtitle { text-align: center; font-size: 10px; color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #e8eaf6; color: #1a237e; font-weight: bold; padding: 5px 4px; border: 1px solid #999; text-align: left; font-size: 9px; }
        td { padding: 4px; border: 1px solid #999; vertical-align: top; font-size: 9px; }
        .text-center { text-align: center; }
        .text-muted { color: #999; }
        .text-success { color: #2e7d32; }
        .text-warning { color: #f57f17; }
        .attachment-item { margin-bottom: 3px; padding-bottom: 3px; border-bottom: 1px dotted #ddd; }
        .attachment-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .badge { display: inline-block; padding: 1px 5px; border-radius: 2px; font-size: 8px; font-weight: bold; background: #e0e0e0; }
        .badge-success { background: #c8e6c9; color: #1b5e20; }
        .badge-warning { background: #fff3e0; color: #e65100; }
    </style>
</head>
<body>
    <h2>LAPORAN KINERJA &amp; QUALITY CONTROL</h2>
    <div class="subtitle">
        Tanggal Export: {{ now()->format('d M Y H:i') }} | Total User: {{ $users->count() }}
    </div>

    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Nama User</th>
                <th>Divisi</th>
                <th>Judul Card</th>
                <th>Campaign</th>
                <th>Board</th>
                <th>Label &amp; Brand</th>
                <th>Attachment &amp; QC</th>
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
                                <td rowspan="{{ $cardCount }}" class="text-center">{{ $index + 1 }}</td>
                                <td rowspan="{{ $cardCount }}"><strong>{{ $user->name }}</strong></td>
                                <td rowspan="{{ $cardCount }}">
                                    {{ $user->divisions->pluck('name')->implode(', ') ?: '-' }}
                                </td>
                            @endif

                            <td>
                                <strong>{{ $card->title ?? '-' }}</strong>
                                @if($card->description)
                                    <br><span style="color: #666;">{{ Str::limit($card->description, 50) }}</span>
                                @endif
                            </td>
                            
                            <td>{{ optional($card->campaign)->name ?? '-' }}</td>
                            <td>{{ optional($card->board)->name ?? '-' }}</td>
                            
                            <td>
                                @if($card->labels && $card->labels->count() > 0)
                                    <div><strong>Label:</strong> {{ $card->labels->pluck('name')->implode(', ') }}</div>
                                @endif
                                @if($card->brands && $card->brands->count() > 0)
                                    <div><strong>Brand:</strong> {{ $card->brands->pluck('name')->implode(', ') }}</div>
                                @endif
                                @if(($card->labels && $card->labels->count() == 0) && ($card->brands && $card->brands->count() == 0))
                                    <span class="text-muted">-</span>
                                @endif
                            </td>

                            <td>
                                @php
                                    $attachments = $card->attachments ?? collect();
                                    $totalFiles = $attachments->count();
                                    $totalQuantity = $attachments->sum('quantity');
                                    $totalQcQuantity = $attachments->sum('qc_quantity');
                                    $qcCompleted = $attachments->filter(function($att) {
                                        return $att->qc_quantity !== null;
                                    })->count();
                                @endphp

                                <div style="margin-bottom: 4px;">
                                    <span class="badge {{ $qcCompleted == $totalFiles && $totalFiles > 0 ? 'badge-success' : 'badge-warning' }}">
                                        QC: {{ $totalQcQuantity }}/{{ $totalQuantity }} 
                                        ({{ $totalFiles > 0 ? round(($qcCompleted / $totalFiles) * 100) : 0 }}%)
                                    </span>
                                </div>

                                @if($attachments->count() > 0)
                                    @foreach($attachments as $attachment)
                                        <div class="attachment-item">
                                            <div>
                                                <strong>{{ Str::limit($attachment->file_name ?? 'Attachment', 20) }}</strong>
                                                @if($attachment->attachment_type)
                                                    <span style="font-size: 8px; color: #888;">({{ $attachment->attachment_type }})</span>
                                                @endif
                                            </div>
                                            <div style="font-size: 8px;">
                                                Total: {{ $attachment->quantity ?? 0 }} | 
                                                @if($attachment->qc_quantity !== null)
                                                    <span class="text-success">QC: {{ $attachment->qc_quantity }}</span>
                                                    @if($attachment->qcBy)
                                                        (by: {{ $attachment->qcBy->name }})
                                                    @endif
                                                    @if($attachment->qc_note)
                                                        <br>Catatan: {{ Str::limit($attachment->qc_note, 30) }}
                                                    @endif
                                                @else
                                                    <span class="text-warning">Belum QC</span>
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
                    <tr>
                        <td class="text-center">{{ $index + 1 }}</td>
                        <td><strong>{{ $user->name }}</strong></td>
                        <td>{{ $user->divisions->pluck('name')->implode(', ') ?: '-' }}</td>
                        <td colspan="5" class="text-muted text-center">Tidak ada data task/card yang sesuai filter</td>
                    </tr>
                @endif
            @empty
                <tr>
                    <td colspan="8" class="text-center">Tidak ada data user yang ditemukan.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>