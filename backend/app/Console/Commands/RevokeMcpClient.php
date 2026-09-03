<?php

namespace App\Console\Commands;

use App\Models\McpClient;
use Illuminate\Console\Command;

class RevokeMcpClient extends Command
{
    protected $signature = 'mcp:client:revoke {client : UUID MCP client}';

    protected $description = 'Mencabut akses sebuah Traco MCP client';

    public function handle(): int
    {
        $client = McpClient::query()->find($this->argument('client'));

        if (! $client) {
            $this->error('MCP client tidak ditemukan.');

            return self::FAILURE;
        }

        $client->update(['is_active' => false]);
        $this->info("MCP client '{$client->name}' berhasil dicabut.");

        return self::SUCCESS;
    }
}
