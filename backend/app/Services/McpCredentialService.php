<?php

namespace App\Services;

use App\Models\McpClient;
use Illuminate\Support\Str;

class McpCredentialService
{
    public function issue(McpClient $client): string
    {
        $secret = Str::random(64);
        $client->forceFill(['secret_hash' => hash('sha256', $secret)])->save();

        return 'traco_mcp_'.$client->id.'.'.$secret;
    }

    public function resolve(string $credential): ?McpClient
    {
        if (! preg_match('/^traco_mcp_([0-9a-f-]{36})\.([A-Za-z0-9]{64})$/i', $credential, $matches)) {
            return null;
        }

        $client = McpClient::query()->find($matches[1]);

        if (! $client || ! hash_equals($client->secret_hash, hash('sha256', $matches[2]))) {
            return null;
        }

        return $client;
    }
}
