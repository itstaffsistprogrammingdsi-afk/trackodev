<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalendarResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [

            /*
            |--------------------------------------------------------------------------
            | CARD
            |--------------------------------------------------------------------------
            */

            'id' => $this->id,

            'title' => $this->title,

            'status' => $this->status,

            'due_date' => $this->due_date
                ? $this->due_date
                    ->timezone(config('app.timezone'))
                    ->format('Y-m-d H:i')
                : null,

            'created_at' => $this->created_at
                ? $this->created_at
                    ->timezone(config('app.timezone'))
                    ->format('Y-m-d H:i')
                : null,

            /*
            |--------------------------------------------------------------------------
            | CAMPAIGN
            |--------------------------------------------------------------------------
            */
// 🔥 PASTIKAN BAGIAN INI ADA AGAR NAMA CAMPAIGN KELUAR KE FRONTEND
            'campaign' => $this->relationLoaded('campaign') && $this->campaign ? [
                'id' => $this->campaign->id,
                'name' => $this->campaign->name,
            ] : null,
            
            'campaign' => $this->whenLoaded('campaign', function () {

                if (!$this->campaign) {
                    return null;
                }

                return [
                    'id'   => $this->campaign->id,
                    'name' => $this->campaign->name,
                ];
            }),

            /*
            |--------------------------------------------------------------------------
            | BOARD
            |--------------------------------------------------------------------------
            */

            'board' => $this->whenLoaded('board', function () {

                if (!$this->board) {
                    return null;
                }

                return [
                    'id'   => $this->board->id,
                    'name' => $this->board->name,
                ];
            }),

            /*
            |--------------------------------------------------------------------------
            | ASSIGNEES
            |--------------------------------------------------------------------------
            */

            'assignees' => $this->whenLoaded(
                'assignees',
                function () {

                    return $this->assignees
                        ->map(function ($user) {

                            return [

                                'id'     => $user->id,

                                'name'   => $user->name,

                                'avatar' => $user->avatar,

                            ];

                        })
                        ->values();

                },
                []
            ),

        ];
    }
}