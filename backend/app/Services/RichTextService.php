<?php

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

final class RichTextService
{
    /**
     * Store only the small formatting subset supported by the card editor.
     * This protects API callers and pasted content, not only the browser UI.
     */
    public static function sanitize(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'br,div[style],em,i,p[style],span[style],strong,b');
        $config->set('CSS.AllowedProperties', [
            'font-size',
            'font-style',
            'font-weight',
            'text-align',
        ]);
        $config->set('AutoFormat.AutoParagraph', false);
        $config->set('AutoFormat.RemoveEmpty', false);
        $config->set('URI.DisableExternalResources', true);

        $clean = trim((new HTMLPurifier($config))->purify($value));

        return $clean === '' ? null : $clean;
    }

    /**
     * Convert rich text to safe readable text for email and compact exports.
     */
    public static function plainText(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $withNewLines = preg_replace('/<br\s*\/?\s*>/i', "\n", $value) ?? $value;
        $text = html_entity_decode(strip_tags($withNewLines), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/[ \t]+/u', ' ', $text) ?? $text);
    }
}
