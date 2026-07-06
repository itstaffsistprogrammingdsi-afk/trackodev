<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\TaskResource;

class CardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'board_id'     => $this->board_id,
            'campaign_id'  => $this->campaign_id,
            'title'        => $this->title,
            'description'  => $this->description,
            'priority'     => $this->priority,
            'status'       => $this->status,
            'due_date'     => $this->due_date?->toDateTimeString(),
            'order'        => $this->order,
            'completed_at' => $this->completed_at?->toDateTimeString(),
            'is_completed' => $this->completed_at !== null,
            'created_at'   => $this->created_at?->toDateTimeString(),

            /*
            |------------------------------------------------
            | CAMPAIGN CONTEXT - Ambil dari card atau board
            |------------------------------------------------
            */
            'campaign' => $this->getCampaignData(),

            /*
            |------------------------------------------------
            | BOARD - Tetap seperti semula
            |------------------------------------------------
            */
            'board' => $this->relationLoaded('board') ? $this->board : null,

            /*
            |------------------------------------------------
            | BRANDS
            |------------------------------------------------
            */
            'brands' => $this->whenLoaded('brands', function () {
                return $this->brands->map(fn($brand) => [
                    'id'    => $brand->id,
                    'name'  => $brand->name,
                    'color' => $brand->color,
                ])->values();
            }),

            /*
            |------------------------------------------------
            | LABELS
            |------------------------------------------------
            */
            'labels' => $this->whenLoaded('labels', function () {
                return $this->labels->map(fn($l) => [
                    'id'    => $l->id,
                    'name'  => $l->name,
                    'color' => $l->color,
                ])->values();
            }),

            /*
            |------------------------------------------------
            | CREATOR & ASSIGNEES
            |------------------------------------------------
            */
            'created_by' => $this->relationLoaded('creator') && $this->creator
                ? new UserResource($this->creator)
                : null,

            'assignees' => $this->relationLoaded('assignees')
                ? UserResource::collection($this->assignees)
                : [],

            /*
            |------------------------------------------------
            | ATTACHMENTS (Terintegrasi Fitur QC)
            |------------------------------------------------
            */
            'attachments' => $this->relationLoaded('attachments')
                ? $this->attachments->map(fn($att) => [
                    'id'                 => $att->id,
                    'file_name'          => $att->file_name,
                    'file_url'           => $att->file_url,
                    'link_url'           => $att->link_url,
                    'file_type'          => $att->file_type,
                    'attachment_type'    => $att->attachment_type,
                    'quantity'           => $att->quantity,
                    'result_description' => $att->result_description,
                    
                    'qc_quantity'        => $att->qc_quantity,
                    'qc_note'            => $att->qc_note,
                    'qc_by'              => $att->qc_by,
                    'qc_user'            => $att->relationLoaded('qcBy') && $att->qcBy 
                                            ? [
                                                'id'   => $att->qcBy->id,
                                                'name' => $att->qcBy->name
                                              ] 
                                            : null,
                    'qc_at'              => $att->qc_at ? $att->qc_at->toDateTimeString() : null,
                    
                    'uploader'           => $att->relationLoaded('uploader') && $att->uploader 
                                            ? [
                                                'id'   => $att->uploader->id,
                                                'name' => $att->uploader->name
                                              ] 
                                            : null,
                ])
                : [],

            /*
            |------------------------------------------------
            | TASKS & BRIEF ATTACHMENTS
            |------------------------------------------------
            */
            'tasks' => $this->relationLoaded('tasks')
                ? TaskResource::collection($this->tasks)
                : [],

            'brief_attachments' => $this->whenLoaded('briefAttachments', fn() => $this->briefAttachments),
        ];
    }

    /**
     * Ambil campaign dari card atau board
     * 
     * Karena campaign_id di card sering null, kita fallback ke board
     */
    protected function getCampaignData()
    {
        // 1. Coba dari card langsung
        if ($this->relationLoaded('campaign') && $this->campaign) {
            return [
                'id'   => $this->campaign->id,
                'name' => $this->campaign->name,
            ];
        }

        // 2. Coba dari board
        if ($this->relationLoaded('board') && $this->board) {
            // Cek apakah relasi campaign di board sudah di-load
            if ($this->board->relationLoaded('campaign') && $this->board->campaign) {
                return [
                    'id'   => $this->board->campaign->id,
                    'name' => $this->board->campaign->name,
                ];
            }
        }

        return null;
    }
}