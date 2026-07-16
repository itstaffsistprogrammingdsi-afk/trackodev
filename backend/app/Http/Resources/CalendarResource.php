<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 🚨 CATATAN: File CalendarResource.php tidak ikut ter-upload, jadi ini adalah
 * REKONSTRUKSI berdasarkan:
 * - Relasi yang di-eager load di CalendarController::getBaseCardQuery()
 *   ('board', 'board.campaign', 'assignees', 'creator')
 * - Bentuk data yang diharapkan frontend (interface Task di types.ts)
 *
 * Semua bagian LAIN dari alur (Card::creator(), eager loading di controller,
 * rendering di CalendarView.tsx) sudah dicek dan sudah BENAR. Resource inilah
 * satu-satunya lapisan yang tidak bisa saya lihat isi aslinya, jadi ini
 * kandidat paling mungkin untuk bug "creator selalu tidak diketahui" --
 * biasanya karena key 'creator' tidak pernah dimasukkan ke array, atau
 * salah akses (mis. $this->created_by alih-alih $this->creator).
 *
 * Silakan bandingkan dengan file asli Anda, atau kirim isinya supaya saya
 * bisa kasih patch yang presisi alih-alih rewrite penuh seperti ini.
 */
class CalendarResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'title'      => $this->title,
            'status'     => $this->status,
            'due_date'   => $this->due_date?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),

            'board' => $this->whenLoaded('board', function () {
                return $this->board ? [
                    'id'   => $this->board->id,
                    'name' => $this->board->name,
                ] : null;
            }),

            'campaign' => $this->whenLoaded('board', function () {
                return $this->board?->campaign ? [
                    'id'   => $this->board->campaign->id,
                    'name' => $this->board->campaign->name,
                ] : null;
            }),

            'assignees' => $this->whenLoaded('assignees', function () {
                return $this->assignees->map(fn ($user) => [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'avatar' => $user->avatar,
                ])->values();
            }),

            // 👤 INI BAGIAN INTINYA: pastikan key 'creator' ini benar-benar
            // ada dan mengambil dari relasi $this->creator (bukan dari kolom
            // mentah 'created_by', yang cuma berisi UUID, bukan objek User).
            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id'     => $this->creator->id,
                    'name'   => $this->creator->name,
                    'avatar' => $this->creator->avatar,
                ] : null;
            }),
        ];
    }
}
