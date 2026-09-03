<?php

namespace App\Console\Commands;

use App\Models\McpClient;
use App\Services\McpCredentialService;
use Illuminate\Console\Command;

class CreateMcpClient extends Command
{
    protected $signature = 'mcp:client:create
        {name : Nama MCP client}
        {--abilities=data:read,data:write,identity:link : Ability dipisahkan koma}
        {--allowed-ip=* : IP yang diizinkan; ulangi opsi untuk beberapa IP}
        {--expires-days= : Masa aktif dalam hari}';

    protected $description = 'Membuat kredensial service untuk Traco MCP server';

    public function handle(McpCredentialService $credentials): int
    {
        $abilities = collect(explode(',', (string) $this->option('abilities')))
            ->map(fn (string $ability) => trim($ability))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $unknownAbilities = array_diff($abilities, ['*', 'data:read', 'data:write', 'identity:link']);
        if ($abilities === [] || $unknownAbilities !== []) {
            $this->error('Ability tidak valid: '.implode(', ', $unknownAbilities ?: ['(kosong)']));

            return self::FAILURE;
        }

        $allowedIpOption = $this->option('allowed-ip');
        $allowedIps = is_array($allowedIpOption) ? $allowedIpOption : [$allowedIpOption];
        $allowedIps = collect($allowedIps)->filter()->values()->all();
        $expiresDays = $this->option('expires-days');

        foreach ($allowedIps as $allowedIp) {
            if ($allowedIp !== '*' && filter_var($allowedIp, FILTER_VALIDATE_IP) === false) {
                $this->error("Alamat IP tidak valid: {$allowedIp}");

                return self::FAILURE;
            }
        }

        if ($expiresDays !== null && (! ctype_digit((string) $expiresDays) || (int) $expiresDays < 1)) {
            $this->error('--expires-days harus berupa bilangan bulat positif.');

            return self::FAILURE;
        }

        $client = McpClient::query()->create([
            'name' => $this->argument('name'),
            'secret_hash' => str_repeat('0', 64),
            'abilities' => $abilities,
            'allowed_ips' => $allowedIps,
            'is_active' => true,
            'expires_at' => $expiresDays ? now()->addDays((int) $expiresDays) : null,
        ]);

        $credential = $credentials->issue($client);

        $this->newLine();
        $this->info('MCP client berhasil dibuat. Simpan credential berikut sekarang; nilainya tidak dapat dilihat lagi:');
        $this->line($credential);
        $this->newLine();
        $this->table(['ID', 'Name', 'Abilities', 'Allowed IPs', 'Expires'], [[
            $client->id,
            $client->name,
            implode(', ', $abilities),
            implode(', ', $allowedIps),
            $client->expires_at?->toIso8601String() ?? 'never',
        ]]);

        return self::SUCCESS;
    }
}
