<?php

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

final class RichTextService
{
    private static ?HTMLPurifier $purifier = null;

    private static function purifier(): HTMLPurifier
    {
        if (self::$purifier instanceof HTMLPurifier) {
            return self::$purifier;
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

        // The default HTML Purifier cache lives under vendor/, which is often
        // read-only for the PHP-FPM user in production. Laravel's storage
        // directory is the correct runtime-owned location instead.
        $cacheRoot = storage_path('framework/cache/htmlpurifier');
        $parentCacheRoot = dirname($cacheRoot);
        if (! is_dir($cacheRoot) && is_dir($parentCacheRoot) && is_writable($parentCacheRoot)) {
            @mkdir($cacheRoot, 0775, true);
        }

        if (is_dir($cacheRoot) && is_writable($cacheRoot)) {
            $config->set('Cache.SerializerPath', $cacheRoot);
        } else {
            // Do not turn a missing runtime permission into a 500 on every
            // card autosave. The editor only allows a very small HTML subset,
            // so disabling the definition cache is a safe availability
            // fallback until the server permissions are corrected.
            $config->set('Cache.DefinitionImpl', null);
        }

        return self::$purifier = new HTMLPurifier($config);
    }

    /**
     * Store only the small formatting subset supported by the card editor.
     * This protects API callers and pasted content, not only the browser UI.
     */
    public static function sanitize(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $clean = trim(self::purifier()->purify($value));

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
