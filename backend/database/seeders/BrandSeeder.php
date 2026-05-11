<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Campaign;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BrandSeeder extends Seeder
{
    public function run(): void
    {
        $campaign = Campaign::first();

        if (!$campaign) {
            throw new \Exception("No campaign found. Seed campaigns first.");
        }

        Brand::create([
            'id' => Str::uuid(),
            'campaign_id' => $campaign->id,
            'name' => 'Urgent',
            'color' => '#ff0000',
        ]);

        Brand::create([
            'id' => Str::uuid(),
            'campaign_id' => $campaign->id,
            'name' => 'Low',
            'color' => '#00ff00',
        ]);
    }
}