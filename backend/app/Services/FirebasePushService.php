<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PushDevice;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FirebasePushService
{
    public function send(Notification $notification): int
    {
        $credentials = $this->credentials();

        if ($credentials === null) {
            Log::debug('Firebase push dilewati karena kredensial belum dikonfigurasi.');

            return 0;
        }

        $projectId = config('services.firebase.project_id') ?: ($credentials['project_id'] ?? null);
        if (! is_string($projectId) || $projectId === '') {
            throw new RuntimeException('FIREBASE_PROJECT_ID belum dikonfigurasi.');
        }

        $devices = PushDevice::query()
            ->where('user_id', $notification->user_id)
            ->get();

        if ($devices->isEmpty()) {
            return 0;
        }

        $accessToken = $this->accessToken($credentials, $projectId);
        $sent = 0;

        foreach ($devices as $device) {
            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->timeout(15)
                ->post(
                    "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send",
                    ['message' => $this->message($notification, $device)],
                );

            if ($response->successful()) {
                $sent++;

                continue;
            }

            if ($this->isInvalidToken($response)) {
                $device->delete();

                continue;
            }

            if ($response->serverError() || $response->status() === 429) {
                $response->throw();
            }

            Log::warning('FCM menolak push notification.', [
                'notification_id' => $notification->id,
                'device_id' => $device->id,
                'status' => $response->status(),
                'error' => $response->json('error.message'),
            ]);
        }

        return $sent;
    }

    private function message(Notification $notification, PushDevice $device): array
    {
        $path = $notification->action_url ?: '/notifications';

        return [
            'token' => $device->token,
            'notification' => [
                'title' => $notification->title ?: 'Tracko',
                'body' => $notification->body ?: 'Ada aktivitas baru di Tracko.',
            ],
            'data' => [
                'notification_id' => (string) $notification->id,
                'path' => $path,
                'type' => (string) $notification->type,
            ],
            'android' => [
                'priority' => 'HIGH',
                'notification' => [
                    'channel_id' => 'tracko-notifications',
                    'sound' => 'default',
                    'visibility' => 'PRIVATE',
                ],
            ],
            'apns' => [
                'payload' => [
                    'aps' => ['sound' => 'default'],
                ],
            ],
        ];
    }

    private function accessToken(array $credentials, string $projectId): string
    {
        return Cache::remember(
            "firebase:access-token:{$projectId}",
            now()->addMinutes(50),
            function () use ($credentials): string {
                $clientEmail = $credentials['client_email'] ?? null;
                $privateKey = $credentials['private_key'] ?? null;
                $tokenUri = $credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token';

                if (! is_string($clientEmail) || ! is_string($privateKey)) {
                    throw new RuntimeException('Firebase service account tidak valid.');
                }

                $now = time();
                $header = $this->base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
                $claims = $this->base64Url(json_encode([
                    'iss' => $clientEmail,
                    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                    'aud' => $tokenUri,
                    'iat' => $now,
                    'exp' => $now + 3600,
                ], JSON_THROW_ON_ERROR));
                $unsigned = "{$header}.{$claims}";

                if (! openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
                    throw new RuntimeException('Gagal menandatangani token Firebase.');
                }

                $response = Http::asForm()->timeout(15)->post($tokenUri, [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $unsigned.'.'.$this->base64Url($signature),
                ])->throw();

                $token = $response->json('access_token');
                if (! is_string($token) || $token === '') {
                    throw new RuntimeException('Firebase tidak mengembalikan access token.');
                }

                return $token;
            },
        );
    }

    private function credentials(): ?array
    {
        $configuredPath = config('services.firebase.credentials');
        if (! is_string($configuredPath) || trim($configuredPath) === '') {
            return null;
        }

        $path = preg_match('/^(?:[A-Za-z]:[\\\\\/]|\/)/', $configuredPath)
            ? $configuredPath
            : base_path($configuredPath);

        if (! is_file($path) || ! is_readable($path)) {
            throw new RuntimeException("Firebase credentials tidak dapat dibaca: {$path}");
        }

        $decoded = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        return is_array($decoded) ? $decoded : null;
    }

    private function isInvalidToken(Response $response): bool
    {
        if (! in_array($response->status(), [400, 404], true)) {
            return false;
        }

        $payload = json_encode($response->json(), JSON_UNESCAPED_SLASHES);

        return is_string($payload)
            && (str_contains($payload, 'UNREGISTERED') || str_contains($payload, 'registration-token-not-registered'));
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
