<?php

namespace App\Services;

use App\Events\ApplicationDataChanged;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use UnexpectedValueException;

class HrisSyncService
{
    /**
     * Import active HRIS employees into Tracko.
     *
     * Only the remote id, name, email, and update timestamp are persisted.
     * A local password is assigned only when an account is first created.
     */
    public function sync(): array
    {
        $this->ensureConfigured();

        $employees = $this->fetchEmployees();
        $stats = [
            'received' => count($employees),
            'created' => 0,
            'updated' => 0,
            'unchanged' => 0,
            'skipped' => 0,
            'failed' => 0,
        ];

        foreach ($employees as $employee) {
            if (! is_array($employee) || ! $this->isImportable($employee)) {
                $stats['skipped']++;

                continue;
            }

            try {
                $result = $this->syncEmployee($employee);
                $stats[$result]++;
            } catch (Throwable $exception) {
                $stats['failed']++;

                Log::error('HRIS employee sync failed.', [
                    'hris_id' => $employee['id'] ?? null,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        if ($stats['created'] + $stats['updated'] > 0) {
            ApplicationDataChanged::dispatch(new User, 'synced');
        }

        return $stats;
    }

    private function fetchEmployees(): array
    {
        $response = $this->httpClient()
            ->get((string) config('services.hris.employees_url'))
            ->throw();

        $payload = $response->json();

        if (
            ! is_array($payload)
            || ($payload['success'] ?? false) !== true
            || ! is_array($payload['data'] ?? null)
        ) {
            throw new UnexpectedValueException('Format respons API HRIS tidak sesuai.');
        }

        return $payload['data'];
    }

    private function httpClient(): PendingRequest
    {
        return Http::acceptJson()
            ->withToken((string) config('services.hris.api_token'))
            ->timeout((int) config('services.hris.timeout', 30))
            ->retry(3, 500);
    }

    private function isImportable(array $employee): bool
    {
        if (
            array_key_exists('is_active', $employee)
            && ! filter_var($employee['is_active'], FILTER_VALIDATE_BOOLEAN)
        ) {
            return false;
        }

        $hrisId = $employee['id'] ?? null;
        $name = trim((string) ($employee['name'] ?? ''));
        $email = Str::lower(trim((string) ($employee['email'] ?? '')));

        return (is_int($hrisId) || ctype_digit((string) $hrisId))
            && (int) $hrisId > 0
            && $name !== ''
            && Str::length($name) <= 255
            && Str::length($email) <= 255
            && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function syncEmployee(array $employee): string
    {
        $hrisId = (int) $employee['id'];
        $name = Str::squish((string) $employee['name']);
        $email = Str::lower(trim((string) $employee['email']));
        $hrisUpdatedAt = $this->parseTimestamp($employee['updated_at'] ?? null);

        return DB::transaction(function () use ($hrisId, $name, $email, $hrisUpdatedAt): string {
            $user = User::query()
                ->where('hris_id', $hrisId)
                ->lockForUpdate()
                ->first();

            if (! $user) {
                $user = User::query()
                    ->whereRaw('LOWER(email) = ?', [$email])
                    ->lockForUpdate()
                    ->first();
            }

            if (! $user) {
                $user = User::query()->createQuietly([
                    'hris_id' => $hrisId,
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make((string) config('services.hris.default_password')),
                    'hris_updated_at' => $hrisUpdatedAt,
                ]);

                // Role berasal dari default sistem Tracko, bukan dari payload HRIS.
                // Penetapan hanya dilakukan saat akun lokal pertama kali dibuat.
                $user->assignRole(User::ROLE_USER);

                return 'created';
            }

            if ($user->hris_id !== null && (int) $user->hris_id !== $hrisId) {
                throw new RuntimeException('Email sudah terhubung ke HRIS ID yang berbeda.');
            }

            $user->forceFill([
                'hris_id' => $hrisId,
                'name' => $name,
                'email' => $email,
                'hris_updated_at' => $hrisUpdatedAt,
            ]);

            $changed = $user->isDirty();

            if ($changed) {
                $user->saveQuietly();
            }

            return $changed ? 'updated' : 'unchanged';
        });
    }

    private function parseTimestamp(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }

    private function ensureConfigured(): void
    {
        if (blank(config('services.hris.employees_url'))) {
            throw new RuntimeException('HRIS_EMPLOYEES_URL belum dikonfigurasi.');
        }

        if (blank(config('services.hris.api_token'))) {
            throw new RuntimeException('HRIS_API_TOKEN belum dikonfigurasi.');
        }

        if (Str::length((string) config('services.hris.default_password')) < 8) {
            throw new RuntimeException('HRIS_DEFAULT_PASSWORD wajib berisi minimal 8 karakter.');
        }
    }
}
