<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Task Assigned</title>
</head>
<body style="font-family: Arial;">

<h2>Halo {{ $assignedUser->name }}</h2>

<p>Kamu mendapatkan task baru:</p>

<table cellpadding="6">
    <tr>
        <td><b>Title</b></td>
        <td>{{ $card->title }}</td>
    </tr>

    <tr>
        <td><b>Board</b></td>
        <td>{{ $card->board->name }}</td>
    </tr>

    <tr>
        <td><b>Campaign</b></td>
        <td>{{ $card->board->campaign->name }}</td>
    </tr>

    <tr>
        <td><b>Assigned By</b></td>
        <td>{{ $assignedBy->name }}</td>
    </tr>

    @if($card->due_date)
    <tr>
        <td><b>Due Date</b></td>
        <td>{{ $card->due_date }}</td>
    </tr>
    @endif
</table>

<p>Silakan login ke sistem untuk detail task.</p>

</body>
</html>