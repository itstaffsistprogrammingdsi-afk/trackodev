<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProjectManagementSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();

        if ($users->isEmpty()) {
            $this->command->error('User tidak ditemukan.');
            return;
        }

        for ($d = 1; $d <= 5; $d++) {

            $division = Division::create([
                'id' => Str::uuid(),
                'name' => "Division {$d}",
                'slug' => Str::slug("Division {$d}"),
                'description' => fake()->sentence(),
            ]);

            for ($w = 1; $w <= 3; $w++) {

                $workspace = Workspace::create([
                    'id' => Str::uuid(),
                    'division_id' => $division->id,
                    'name' => "Workspace {$d}-{$w}",
                    'description' => fake()->sentence(),
                ]);

                for ($c = 1; $c <= 3; $c++) {

                    $campaign = Campaign::create([
                        'id' => Str::uuid(),
                        'workspace_id' => $workspace->id,
                        'created_by' => $users->random()->id,
                        'name' => "Campaign {$d}-{$w}-{$c}",
                        'description' => fake()->paragraph(),
                        'type' => fake()->randomElement([
                            'personal',
                            'group'
                        ]),
                        'due_date' => now()->addDays(rand(7, 90)),
                    ]);

                    $boards = [
                        'Backlog',
                        'Todo',
                        'In Progress',
                        'Review',
                        'Done'
                    ];

                    foreach ($boards as $index => $boardName) {

                        $board = Board::create([
                            'id' => Str::uuid(),
                            'campaign_id' => $campaign->id,
                            'name' => $boardName,
                            'color' => fake()->randomElement([
                                '#6366f1',
                                '#22c55e',
                                '#f59e0b',
                                '#ef4444',
                                '#06b6d4',
                            ]),
                            'order' => $index,
                            'type' => strtolower(str_replace(' ', '_', $boardName)),
                        ]);

                        for ($cardNumber = 1; $cardNumber <= 20; $cardNumber++) {

                            $card = Card::create([
                                'id' => Str::uuid(),
                                'board_id' => $board->id,
                                'created_by' => $users->random()->id,
                                'title' => fake()->sentence(4),
                                'description' => fake()->paragraph(),
                                'priority' => fake()->randomElement([
                                    'low',
                                    'medium',
                                    'high',
                                    'urgent'
                                ]),
                                'due_date' => now()->addDays(rand(1, 60)),
                                'order' => $cardNumber,
                            ]);

                            for ($taskNumber = 1; $taskNumber <= 5; $taskNumber++) {

                                Task::create([
                                    'id' => Str::uuid(),
                                    'card_id' => $card->id,
                                    'title' => fake()->sentence(3),
                                    'is_completed' => fake()->boolean(35),
                                    'order' => $taskNumber,
                                ]);
                            }
                        }
                    }
                }
            }
        }

        $this->command->info('ProjectManagementSeeder selesai.');
    }
}