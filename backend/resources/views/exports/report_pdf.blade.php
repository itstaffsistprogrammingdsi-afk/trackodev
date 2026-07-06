<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Laporan Kinerja & QC</title>
    <style>
        /* ============ RESET & BASE ============ */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', 'Arial', 'Helvetica', sans-serif;
            font-size: 9px;
            color: #333;
            line-height: 1.4;
            padding: 5px;
        }
        
        /* ============ HEADER ============ */
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
        
        /* ============ TABLE ============ */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
        }
        
        table th {
            background-color: #e8eaf6;
            color: #1a237e;
            font-weight: bold;
            padding: 5px 4px;
            border: 1px solid #999;
            text-align: left;
            font-size: 8px;
            vertical-align: middle;
        }
        
        table td {
            padding: 4px;
            border: 1px solid #999;
            vertical-align: top;
            font-size: 8px;
        }
        
        /* ============ COLUMN WIDTH ============ */
        .col-no { width: 3%; text-align: center; }
        .col-user { width: 12%; }
        .col-divisi { width: 10%; }
        .col-card { width: 16%; }
        .col-campaign { width: 12%; }
        .col-board { width: 8%; }
        .col-labels { width: 12%; }
        .col-attachment { width: 27%; }
        
        /* ============ TEXT STYLES ============ */
        .text-center { text-align: center; }
        .text-muted { color: #999; font-style: italic; }
        .text-success { color: #2e7d32; font-weight: bold; }
        .text-warning { color: #f57f17; }
        .text-danger { color: #c62828; }
        .font-bold { font-weight: bold; }
        
        /* ============ USER INFO ============ */
        .user-name {
            font-weight: bold;
            font-size: 9px;
            color: #1a237e;
        }
        
        .divisi-list {
            font-size: 7.5px;
            display: block;
            line-height: 1.3;
        }
        
        /* ============ CARD INFO ============ */
        .card-title {
            font-weight: bold;
            font-size: 8.5px;
            color: #0d47a1;
        }
        
        .card-desc {
            font-size: 7.5px;
            color: #666;
            margin-top: 1px;
            display: block;
        }
        
        /* ============ LABELS & BRANDS ============ */
        .label-item {
            display: inline-block;
            padding: 1px 4px;
            margin: 1px 2px 1px 0;
            border-radius: 2px;
            font-size: 7px;
            font-weight: bold;
            white-space: nowrap;
        }
        
        .brand-item {
            display: inline-block;
            padding: 1px 4px;
            margin: 1px 2px 1px 0;
            border-radius: 2px;
            font-size: 7px;
            border: 1px solid #ccc;
            white-space: nowrap;
        }
        
        /* ============ ATTACHMENT ============ */
        .attachment-item {
            margin-bottom: 4px;
            padding-bottom: 4px;
            border-bottom: 1px dotted #ddd;
        }
        
        .attachment-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .attachment-name {
            font-size: 7.5px;
            font-weight: bold;
            color: #333;
        }
        
        .attachment-qc {
            font-size: 7.5px;
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
            font-size: 7px;
            color: #888;
        }
        
        .attachment-type {
            font-size: 6.5px;
            color: #888;
            display: inline-block;
            padding: 1px 3px;
            background: #f5f5f5;
            border-radius: 2px;
        }
        
        /* ============ NO DATA ============ */
        .no-data {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 15px;
        }
        
        .no-data-card {
            color: #999;
            font-style: italic;
            font-size: 7.5px;
        }
        
        /* ============ FOOTER ============ */
        .footer {
            margin-top: 12px;
            padding-top: 6px;
            border-top: 1px solid #ddd;
            font-size: 7px;
            color: #999;
            text-align: center;
        }
        
        /* ============ PAGE BREAK ============ */
        .page-break {
            page-break-after: always;
            border-bottom: 2px dashed #ccc;
            margin: 10px 0;
        }
        
        /* ============ STRIPED ROWS ============ */
        .row-even {
            background-color: #fafafa;
        }
        
        .row-odd {
            background-color: #ffffff;
        }
        
        /* ============ BADGE ============ */
        .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 6.5px;
            font-weight: bold;
            background: #e0e0e0;
            border: 1px solid #bdbdbd;
        }
        
        .badge-success {
            background: #c8e6c9;
            border-color: #81c784;
            color: #1b5e20;
        }
        
        .badge-warning {
            background: #fff3e0;
            border-color: #ffcc80;
            color: #e65100;
        }
        
        /* ============ RESPONSIVE ============ */
        @media print {
            .page-break {
                border-bottom: none;
            }
            body {
                padding: 0;
            }
        }
    </style>
</head>
<body>

    <!-- ============ HEADER ============ -->
    <div class="header">
        <h2>📊 LAPORAN KINERJA &amp; QUALITY CONTROL</h2>
        <div class="subtitle">
            <span>📅 {{ now()->format('d M Y') }}</span>
            <span>|</span>
            <span>🕐 {{ now()->format('H:i') }}</span>
            <span>|</span>
            <span>👥 Total User: {{ $users->count() }}</span>
        </div>
    </div>

    <!-- ============ TABLE ============ -->
    <table>
        <thead>
            <tr>
                <th class="col-no">No</th>
                <th class="col-user">Nama User</th>
                <th class="col-divisi">Divisi</th>
                <th class="col-card">Judul Card</th>
                <th class="col-campaign">Campaign</th>
                <th class="col-board">Board</th>
                <th class="col-labels">Label &amp; Brand</th>
                <th class="col-attachment">Attachment &amp; QC</th>
            </tr>
        </thead>
        <tbody>
            @forelse($users as $index => $user)
                
                @php 
                    $cards = $user->cards ?? collect();
                    $cardCount = $cards->count(); 
                    $rowClass = ($index % 2 == 0) ? 'row-even' : 'row-odd';
                @endphp

                @if($cardCount > 0)
                    {{-- Loop untuk setiap card --}}
                    @foreach($cards as $cardIndex => $card)
                        <tr class="{{ $rowClass }}">
                            {{-- Kolom User & Divisi (hanya di baris pertama) --}}
                            @if($cardIndex === 0)
                                <td class="col-no text-center" rowspan="{{ $cardCount }}">
                                    {{ $index + 1 }}
                                </td>
                                <td class="col-user" rowspan="{{ $cardCount }}">
                                    <span class="user-name">{{ $user->name }}</span>
                                </td>
                                <td class="col-divisi" rowspan="{{ $cardCount }}">
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
                            <td class="col-card">
                                <span class="card-title">{{ $card->title ?? '-' }}</span>
                                @if($card->description)
                                    <span class="card-desc">{{ Str::limit($card->description, 60) }}</span>
                                @endif
                            </td>
                            
                            <td class="col-campaign">
                                @if($card->campaign)
                                    <span>{{ $card->campaign->name }}</span>
                                    @if($card->campaign->workspace)
                                        <br><span style="font-size: 6.5px; color: #888;">{{ $card->campaign->workspace->name }}</span>
                                    @endif
                                @else
                                    <span class="text-muted">-</span>
                                @endif
                            </td>
                            
                            <td class="col-board">
                                {{ optional($card->board)->name ?? '-' }}
                            </td>
                            
                            <td class="col-labels">
                                {{-- Labels --}}
                                @if($card->labels && $card->labels->count() > 0)
                                    <div style="margin-bottom: 2px;">
                                        @foreach($card->labels as $label)
                                            <span class="label-item" style="background: {{ $label->color ?? '#e0e0e0' }}20; border-left: 3px solid {{ $label->color ?? '#999' }};">
                                                {{ $label->name }}
                                            </span>
                                        @endforeach
                                    </div>
                                @endif
                                
                                {{-- Brands --}}
                                @if($card->brands && $card->brands->count() > 0)
                                    <div>
                                        @foreach($card->brands as $brand)
                                            <span class="brand-item" style="color: {{ $brand->color ?? '#333' }}; border-color: {{ $brand->color ?? '#ccc' }};">
                                                {{ $brand->name }}
                                            </span>
                                        @endforeach
                                    </div>
                                @endif
                                
                                @if(($card->labels && $card->labels->count() == 0) && ($card->brands && $card->brands->count() == 0))
                                    <span class="text-muted">-</span>
                                @endif
                            </td>

                            {{-- Data Attachment & QC --}}
                            <td class="col-attachment">
                                @php
                                    $attachments = $card->attachments ?? collect();
                                    $totalFiles = $attachments->count();
                                    $qcCompleted = $attachments->filter(function($att) {
                                        return $att->qc_quantity !== null;
                                    })->count();
                                @endphp
                                
                                {{-- Summary QC --}}
                                @if($totalFiles > 0)
                                    <div style="font-size: 7px; color: #666; margin-bottom: 3px;">
                                        <span class="badge {{ $qcCompleted == $totalFiles ? 'badge-success' : 'badge-warning' }}">
                                            {{ $qcCompleted }}/{{ $totalFiles }} QC
                                        </span>
                                    </div>
                                @endif
                                
                                {{-- Detail per file --}}
                                @if($attachments->count() > 0)
                                    @foreach($attachments as $attachment)
                                        <div class="attachment-item">
                                            <div class="attachment-name">
                                                {{ Str::limit($attachment->file_name ?? 'Attachment', 25) }}
                                                @if($attachment->attachment_type)
                                                    <span class="attachment-type">{{ $attachment->attachment_type }}</span>
                                                @endif
                                            </div>
                                            <div class="attachment-qc">
                                                @if($attachment->qc_quantity !== null)
                                                    <span class="qc-approved">
                                                        ✅ {{ $attachment->qc_quantity }} / {{ $attachment->quantity ?? 0 }} ACC
                                                    </span>
                                                    @if($attachment->qcBy)
                                                        <span class="qc-by">({{ $attachment->qcBy->name }})</span>
                                                    @endif
                                                    @if($attachment->qc_note)
                                                        <br><span style="font-size: 6.5px; color: #666;">📝 {{ Str::limit($attachment->qc_note, 30) }}</span>
                                                    @endif
                                                @else
                                                    <span class="qc-pending">⏳ Belum QC</span>
                                                    <span style="font-size: 6.5px; color: #888;">({{ $attachment->quantity ?? 0 }} file)</span>
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
                    <tr class="{{ $rowClass }}">
                        <td class="col-no text-center">{{ $index + 1 }}</td>
                        <td class="col-user"><span class="user-name">{{ $user->name }}</span></td>
                        <td class="col-divisi">
                            @if($user->divisions && $user->divisions->count() > 0)
                                <span class="divisi-list">{{ $user->divisions->pluck('name')->implode(', ') }}</span>
                            @else
                                <span class="text-muted">-</span>
                            @endif
                        </td>
                        <td colspan="5" class="no-data-card">
                            Tidak ada data task/card yang sesuai filter
                        </td>
                    </tr>
                @endif

            @empty
                <tr>
                    <td colspan="8" class="no-data">
                        <strong>Tidak ada data user yang ditemukan.</strong>
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- ============ FOOTER ============ -->
    <div class="footer">
        <span>Laporan ini dihasilkan secara otomatis oleh sistem</span>
        <span>|</span>
        <span>Generated: {{ now()->format('d/m/Y H:i:s') }}</span>
        <span>|</span>
        <span>Page {PAGE_NUM} of {PAGE_COUNT}</span>
    </div>

</body>
</html>