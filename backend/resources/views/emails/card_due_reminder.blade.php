<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Task Reminder</title>
</head>

<body>

    <h2>Task Reminder</h2>

    <p>
        Halo {{ $assignee->name }},
    </p>

    <p>
        Task berikut mendekati batas waktu pengerjaan:
    </p>

    <table cellpadding="6" cellspacing="0">
        <tr>
            <td><strong>Task</strong></td>
            <td>{{ $card->title }}</td>
        </tr>

        <tr>
            <td><strong>Board</strong></td>
            <td>{{ $card->board?->name ?? '-' }}</td>
        </tr>

        <tr>
            <td><strong>Priority</strong></td>
            <td>{{ strtoupper($card->priority) }}</td>
        </tr>

        <tr>
            <td><strong>Due Date</strong></td>
            <td>
                {{ $card->due_date?->format('d M Y H:i') }}
            </td>
        </tr>

        <tr>
            <td><strong>Reminder Level</strong></td>
            <td>{{ strtoupper($stage) }}</td>
        </tr>
    </table>

    <br>

    @if ($stage === 'h1')
        <p>
            ⚠️ Task akan jatuh tempo dalam waktu kurang dari 24 jam.
        </p>
    @elseif($stage === 'overdue')
        <p>
            🚨 Task telah melewati batas waktu pengerjaan.
        </p>
    @endif

    <p>
        Mohon segera menyelesaikan task tersebut agar tidak melewati batas waktu yang telah ditentukan.
    </p>

</body>

</html>
