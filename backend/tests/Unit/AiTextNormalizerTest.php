<?php

namespace Tests\Unit;

use App\Support\AiTextNormalizer;
use PHPUnit\Framework\TestCase;

class AiTextNormalizerTest extends TestCase
{
    public function test_it_removes_markdown_emphasis_and_pipe_tables(): void
    {
        $input = "**Salsabila** — 140 task\n\n| Peringkat | Nama | Task Selesai |\n|---|---|---|\n| 1 | Salsabila | 140 |";
        $expected = "Salsabila — 140 task\n\nPeringkat — Nama — Task Selesai\n1 — Salsabila — 140";

        $this->assertSame($expected, AiTextNormalizer::plain($input));
    }

    public function test_it_removes_headings_backticks_and_markdown_links(): void
    {
        $input = "## Ringkasan\n- **Alice**: `140` task\n> Catatan [detail](https://example.test)";
        $expected = "Ringkasan\n- Alice: 140 task\nCatatan detail";

        $this->assertSame($expected, AiTextNormalizer::plain($input));
    }
}
