<?php

namespace App\Services;

class CardStatusService
{
    public static function normalize(?string $boardName): string
    {
        $text = strtolower(trim($boardName ?? ''));

        $done = [
            'done', 'finish', 'finished', 'selesai',
            'closed', 'resolved', 'after qc',
            'approved', 'deployed', 'released', 'completed'
        ];

        $todo = [
            'todo', 'to do', 'backlog', 'queue',
            'request', 'new', 'open'
        ];

        foreach ($done as $keyword) {
            if (str_contains($text, $keyword)) {
                return 'done';
            }
        }

        foreach ($todo as $keyword) {
            if (str_contains($text, $keyword)) {
                return 'todo';
            }
        }

        return 'in_progress';
    }
}