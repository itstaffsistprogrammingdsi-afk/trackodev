<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Task Assigned</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height:1.6; color:#333;">

    <h2>Task Baru Ditugaskan Kepada Anda</h2>

    <p>Halo <strong>{{ $assignedUser->name }}</strong>,</p>

    <p>
        Anda mendapatkan task baru dari
        <strong>{{ $assignedBy->name }}</strong>.
    </p>

    <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
        <tr>
            <td><strong>Judul Task</strong></td>
            <td>{{ $card->title }}</td>
        </tr>

        <tr>
            <td><strong>Board</strong></td>
            <td>{{ $card->board?->name ?? '-' }}</td>
        </tr>

        <tr>
            <td><strong>Campaign</strong></td>
            <td>{{ $card->board?->campaign?->name ?? '-' }}</td>
        </tr>

        <tr>
            <td><strong>Priority</strong></td>
            <td>{{ ucfirst($card->priority) }}</td>
        </tr>

        @if($card->due_date)
        <tr>
            <td><strong>Due Date</strong></td>
            <td>{{ $card->due_date }}</td>
        </tr>
        @endif
    </table>

    @if($card->description)
        <h4>Deskripsi</h4>

        <p>
            {{ $card->description }}
        </p>
    @endif

    <p>
        Silakan login ke sistem Tracko untuk melihat detail task dan melakukan update progress.
    </p>

    <hr>

    <p style="font-size:12px;color:#666;">
        Email ini dikirim otomatis oleh sistem Tracko.
        Mohon tidak membalas email ini.
    </p>

</body>
</html>