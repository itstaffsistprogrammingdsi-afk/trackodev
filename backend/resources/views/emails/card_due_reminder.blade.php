<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pengingat Task Traco</title>
</head>
<body style="margin:0;background:#f4f6fb;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
@php
    $isOverdue = $stage === 'overdue';
    $accent = $isOverdue ? '#dc2626' : '#d97706';
    $accentBackground = $isOverdue ? '#fef2f2' : '#fffbeb';
    $statusLabel = $isOverdue ? 'OVERDUE' : 'JATUH TEMPO BESOK';
@endphp

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;">
    <tr>
        <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
                <tr>
                    <td style="height:7px;background:#465fff;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                    <td style="padding:28px 32px 20px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <div style="font-size:20px;font-weight:700;color:#111827;">Traco</div>
                                    <div style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:1.6px;color:#9ca3af;">TASK REMINDER</div>
                                </td>
                                <td align="right">
                                    <span style="display:inline-block;padding:7px 10px;border-radius:999px;background:{{ $accentBackground }};color:{{ $accent }};font-size:10px;font-weight:700;letter-spacing:.6px;">
                                        {{ $statusLabel }}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 32px 28px;">
                        <h1 style="margin:0;font-size:24px;line-height:1.35;color:#111827;">
                            {{ $isOverdue ? 'Task telah melewati deadline' : 'Deadline task sudah dekat' }}
                        </h1>
                        <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">
                            Halo {{ $assignee->name }}, segera periksa task berikut dan perbarui progresnya di Traco.
                        </p>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb;">
                            <tr>
                                <td style="padding:18px 20px;border-bottom:1px solid #e5e7eb;">
                                    <div style="font-size:11px;font-weight:700;letter-spacing:.7px;color:#9ca3af;">TASK</div>
                                    <div style="margin-top:6px;font-size:16px;font-weight:700;color:#111827;">{{ $card->title }}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:16px 20px;">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="50%" style="padding-right:8px;">
                                                <div style="font-size:11px;color:#9ca3af;">Board</div>
                                                <div style="margin-top:4px;font-size:13px;font-weight:600;color:#374151;">{{ $card->board?->name ?? '-' }}</div>
                                            </td>
                                            <td width="50%" style="padding-left:8px;">
                                                <div style="font-size:11px;color:#9ca3af;">Prioritas</div>
                                                <div style="margin-top:4px;font-size:13px;font-weight:600;color:#374151;">{{ strtoupper($card->priority) }}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" style="padding-top:16px;">
                                                <div style="font-size:11px;color:#9ca3af;">Deadline</div>
                                                <div style="margin-top:4px;font-size:14px;font-weight:700;color:{{ $accent }};">
                                                    {{ $card->due_date?->timezone(config('app.timezone'))->format('d M Y, H:i') ?? '-' }}
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="margin-top:20px;padding:14px 16px;border-left:4px solid {{ $accent }};border-radius:8px;background:{{ $accentBackground }};font-size:13px;line-height:1.6;color:#4b5563;">
                            @if ($isOverdue)
                                Task ini sudah melewati batas waktu. Mohon segera selesaikan atau koordinasikan perubahan deadline.
                            @else
                                Task akan jatuh tempo dalam kurang dari 24 jam. Pastikan progresnya tetap sesuai rencana.
                            @endif
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:18px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;font-size:11px;line-height:1.6;color:#9ca3af;">
                        Email ini dikirim otomatis oleh Traco. Jangan membalas email ini.
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
