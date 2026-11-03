<?php

namespace App\Support;

final class AiTextNormalizer
{
    public static function plain(string $text): string
    {
        $text = str_replace(
            ["\r\n", "\r", "\u{00A0}", "\u{200B}", "\u{FEFF}"],
            ["\n", "\n", ' ', '', ''],
            $text
        );
        $text = strip_tags($text);
        $text = preg_replace('/^```[a-zA-Z0-9_-]*\s*$/m', '', $text) ?? $text;
        $text = str_replace('`', '', $text);
        $text = preg_replace('/^\s{0,3}#{1,6}\s+/m', '', $text) ?? $text;
        $text = preg_replace('/^\s{0,3}>\s?/m', '', $text) ?? $text;
        $text = preg_replace('/^\s*([-*_])\1{2,}\s*$/m', '', $text) ?? $text;
        $text = preg_replace('/^\s*[*+]\s+/m', '- ', $text) ?? $text;
        $text = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '$1', $text) ?? $text;
        $text = preg_replace('/\*\*(.+?)\*\*/s', '$1', $text) ?? $text;
        $text = preg_replace('/__(.+?)__/s', '$1', $text) ?? $text;
        $text = preg_replace('/(?<![\w*])\*(?!\*)(\S(?:.*?\S)?)\*(?![\w*])/s', '$1', $text) ?? $text;
        $text = preg_replace('/(?<![\w_])_(?!_)(\S(?:.*?\S)?)_(?![\w_])/s', '$1', $text) ?? $text;

        $lines = explode("\n", $text);
        $normalized = [];
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed !== '' && str_contains($trimmed, '|')) {
                if (str_contains($trimmed, '-') && preg_match('/^\|?[\s:|-]+\|?$/', $trimmed)) {
                    continue;
                }

                $cells = array_values(array_filter(
                    array_map('trim', explode('|', $trimmed)),
                    fn (string $cell) => $cell !== ''
                ));
                if (count($cells) >= 2) {
                    $normalized[] = implode(' — ', $cells);

                    continue;
                }
            }

            $normalized[] = rtrim($line);
        }

        $text = implode("\n", $normalized);
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;
        $text = preg_replace('/[ \t]{2,}/', ' ', $text) ?? $text;

        return trim($text);
    }
}
