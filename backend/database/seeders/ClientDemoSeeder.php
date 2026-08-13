<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardComment;
use App\Models\Division;
use App\Models\Label;
use App\Models\Notification;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ClientDemoSeeder extends Seeder
{
    private const TAG = '[DEMO CLIENT]';

    private const PASSWORD = 'DemoTracko123!';

    public function run(): void
    {
        $this->call([RoleSeeder::class, PermissionSeeder::class]);

        DB::transaction(function (): void {
            $this->clearPreviousDemoData();

            $users = $this->createUsers();
            $labels = $this->createLabels();

            foreach ($this->divisionBlueprints() as $divisionIndex => $blueprint) {
                $division = Division::create([
                    'name' => $blueprint['name'],
                    'code' => $blueprint['code'],
                    'slug' => $blueprint['slug'],
                    'description' => $blueprint['description'],
                ]);

                $divisionUsers = collect($blueprint['users'])
                    ->map(fn (string $email) => $users[$email]);
                $admin = $users[$blueprint['admin']];

                foreach ($divisionUsers as $divisionUser) {
                    $division->users()->attach($divisionUser->id, [
                        'role' => $divisionUser->is($admin) ? 'admin' : 'member',
                    ]);
                }

                foreach ($blueprint['workspaces'] as $workspaceIndex => $workspaceBlueprint) {
                    $workspace = Workspace::create([
                        'division_id' => $division->id,
                        'name' => $workspaceBlueprint['name'],
                        'description' => $workspaceBlueprint['description'],
                    ]);
                    $workspace->members()->sync($divisionUsers->pluck('id')->all());

                    foreach ($workspaceBlueprint['campaigns'] as $campaignIndex => $campaignName) {
                        $campaign = Campaign::create([
                            'workspace_id' => $workspace->id,
                            'created_by' => $admin->id,
                            'name' => $campaignName,
                            'description' => $this->campaignDescription($campaignName),
                            'type' => 'group',
                            'due_date' => now()->addDays(30 + ($campaignIndex * 25)),
                        ]);
                        $campaign->members()->sync($divisionUsers->pluck('id')->all());

                        $brands = $this->createBrands($campaign, $divisionIndex, $campaignIndex);
                        $this->createCampaignBoards(
                            $campaign,
                            $divisionUsers->values()->all(),
                            $labels,
                            $brands,
                            $divisionIndex,
                            $campaignIndex,
                        );
                    }
                }
            }

            $this->createNotifications($users);
        });

        $this->command?->newLine();
        $this->command?->info('Dataset demo client berhasil dibuat.');
        $this->command?->table(
            ['Akun', 'Email', 'Password'],
            [
                ['Super Admin', 'demo.superadmin@tracko.test', self::PASSWORD],
                ['Admin Digital Marketing', 'demo.admin.dm@tracko.test', self::PASSWORD],
                ['Admin Creative Design', 'demo.admin.creative@tracko.test', self::PASSWORD],
                ['Admin Client Service', 'demo.admin.client@tracko.test', self::PASSWORD],
                ['User Demo', 'demo.ayu@tracko.test', self::PASSWORD],
            ],
        );
    }

    private function clearPreviousDemoData(): void
    {
        ActivityLog::where('description', 'like', self::TAG.'%')->delete();
        Notification::where('title', 'like', self::TAG.'%')->delete();
        Division::where('slug', 'like', 'demo-%')->delete();
        Label::where('slug', 'like', 'demo-%')->delete();
    }

    /** @return array<string, User> */
    private function createUsers(): array
    {
        $definitions = [
            ['name' => 'Demo Super Admin', 'email' => 'demo.superadmin@tracko.test', 'role' => 'super_admin', 'phone' => '081200000001'],
            ['name' => 'Raka Pratama', 'email' => 'demo.admin.dm@tracko.test', 'role' => 'admin', 'phone' => '081200000002'],
            ['name' => 'Nadia Putri', 'email' => 'demo.admin.creative@tracko.test', 'role' => 'admin', 'phone' => '081200000003'],
            ['name' => 'Dimas Saputra', 'email' => 'demo.admin.client@tracko.test', 'role' => 'admin', 'phone' => '081200000004'],
            ['name' => 'Ayu Lestari', 'email' => 'demo.ayu@tracko.test', 'role' => 'user', 'phone' => '081200000005'],
            ['name' => 'Bima Wijaya', 'email' => 'demo.bima@tracko.test', 'role' => 'user', 'phone' => '081200000006'],
            ['name' => 'Citra Ramadhani', 'email' => 'demo.citra@tracko.test', 'role' => 'user', 'phone' => '081200000007'],
            ['name' => 'Fajar Nugroho', 'email' => 'demo.fajar@tracko.test', 'role' => 'user', 'phone' => '081200000008'],
            ['name' => 'Gita Maharani', 'email' => 'demo.gita@tracko.test', 'role' => 'user', 'phone' => '081200000009'],
            ['name' => 'Hendra Kurniawan', 'email' => 'demo.hendra@tracko.test', 'role' => 'user', 'phone' => '081200000010'],
        ];

        $users = [];

        foreach ($definitions as $definition) {
            $user = User::updateOrCreate(
                ['email' => $definition['email']],
                [
                    'name' => $definition['name'],
                    'phone' => $definition['phone'],
                    'password' => Hash::make(self::PASSWORD),
                    'email_verified_at' => now(),
                ],
            );
            $user->syncRoles([$definition['role']]);
            $users[$definition['email']] = $user;
        }

        return $users;
    }

    /** @return array<string, Label> */
    private function createLabels(): array
    {
        $definitions = [
            'client-priority' => ['Prioritas Client', '#ef4444'],
            'social-media' => ['Social Media', '#3b82f6'],
            'design' => ['Design', '#8b5cf6'],
            'internal' => ['Internal', '#64748b'],
            'approval' => ['Butuh Approval', '#f59e0b'],
        ];
        $labels = [];

        foreach ($definitions as $key => [$name, $color]) {
            $labels[$key] = Label::create([
                'name' => $name,
                'slug' => 'demo-'.$key,
                'color' => $color,
            ]);
        }

        return $labels;
    }

    private function createBrands(Campaign $campaign, int $divisionIndex, int $campaignIndex): array
    {
        $brandSets = [
            [['Nusantara Foods', '#ef4444'], ['Kopi Pagi', '#92400e']],
            [['Astra Living', '#2563eb'], ['Mora Beauty', '#db2777']],
            [['TechNova', '#7c3aed'], ['GreenLife', '#059669']],
        ];
        $set = $brandSets[$divisionIndex % count($brandSets)];

        return collect($set)->map(fn (array $brand, int $index) => Brand::create([
            'campaign_id' => $campaign->id,
            'name' => $brand[0].($campaignIndex > 0 ? ' '.($campaignIndex + 1) : ''),
            'color' => $brand[1],
        ]))->all();
    }

    private function createCampaignBoards(
        Campaign $campaign,
        array $users,
        array $labels,
        array $brands,
        int $divisionIndex,
        int $campaignIndex,
    ): void {
        $boards = [
            ['Backlog', 'backlog', '#64748b'],
            ['To Do', 'todo', '#3b82f6'],
            ['In Progress', 'in_progress', '#f59e0b'],
            ['Review / QC', 'review', '#8b5cf6'],
            ['Done', 'done', '#10b981'],
        ];

        foreach ($boards as $boardIndex => [$name, $type, $color]) {
            $board = Board::create([
                'campaign_id' => $campaign->id,
                'name' => $name,
                'type' => $type,
                'color' => $color,
                'order' => $boardIndex + 1,
            ]);

            foreach ($this->cardBlueprints($boardIndex, $divisionIndex, $campaignIndex) as $cardIndex => $blueprint) {
                $creator = $users[($cardIndex + $boardIndex) % count($users)];
                $card = Card::create([
                    'board_id' => $board->id,
                    'brand_id' => $brands[$cardIndex % count($brands)]->id,
                    'created_by' => $creator->id,
                    'title' => $blueprint['title'],
                    'description' => $blueprint['description'],
                    'priority' => $blueprint['priority'],
                    'status' => $blueprint['status'],
                    'due_date' => $blueprint['due_date'],
                    'completed_at' => $blueprint['completed_at'],
                    'order' => $cardIndex + 1,
                ]);
                $card->forceFill([
                    'created_at' => now()->subDays(18 - ($boardIndex * 3) - $cardIndex),
                    'updated_at' => now()->subHours(($boardIndex + 1) * 3),
                ])->save();

                $assignees = collect(range(0, $cardIndex === 0 ? 1 : 0))
                    ->map(fn (int $offset) => $users[
                        ($cardIndex + $boardIndex + $offset) % count($users)
                    ]->id)
                    ->all();
                $card->assignees()->sync($assignees);
                $card->labels()->sync([
                    $labels[$cardIndex === 0 ? 'client-priority' : 'internal']->id,
                    $labels[$divisionIndex === 1 ? 'design' : 'social-media']->id,
                ]);
                $card->brands()->sync([$brands[$cardIndex % count($brands)]->id]);

                $this->createChecklist($card, $boardIndex);
                $this->createCommentsAndActivity($card, $creator, $users, $name);

                if (in_array($boardIndex, [2, 3, 4], true)) {
                    $this->createAttachment($card, $creator, $boardIndex, $cardIndex, $users);
                }
            }
        }
    }

    private function createChecklist(Card $card, int $boardIndex): void
    {
        $items = ['Brief sudah dikonfirmasi', 'Materi utama sudah dikerjakan', 'Final check sebelum delivery'];

        foreach ($items as $index => $title) {
            Task::create([
                'card_id' => $card->id,
                'title' => $title,
                'is_completed' => $boardIndex >= ($index + 2),
                'order' => $index + 1,
            ]);
        }
    }

    private function createCommentsAndActivity(Card $card, User $creator, array $users, string $boardName): void
    {
        CardComment::create([
            'card_id' => $card->id,
            'user_id' => $creator->id,
            'content' => 'Brief sudah dicek. Mohon update progres melalui card ini agar mudah dipantau.',
        ]);
        CardComment::create([
            'card_id' => $card->id,
            'user_id' => $users[1 % count($users)]->id,
            'content' => 'Siap, progres dan hasil revisi akan diperbarui sebelum deadline.',
        ]);

        foreach (['created' => 'membuat card', 'moved' => 'memindahkan card ke '.$boardName] as $action => $description) {
            ActivityLog::create([
                'user_id' => $creator->id,
                'entity_type' => 'card',
                'entity_id' => $card->id,
                'action' => $action,
                'description' => self::TAG.' '.$creator->name.' '.$description.' "'.$card->title.'"',
                'meta' => ['card_id' => $card->id, 'board' => $boardName],
            ]);
        }
    }

    private function createAttachment(Card $card, User $uploader, int $boardIndex, int $cardIndex, array $users): void
    {
        $isQcComplete = $boardIndex === 4 || ($boardIndex === 3 && $cardIndex === 1);

        CardAttachment::create([
            'card_id' => $card->id,
            'uploaded_by' => $uploader->id,
            'attachment_type' => 'link',
            'file_name' => 'Preview hasil - '.$card->title,
            'link_url' => 'https://example.com/demo/'.urlencode($card->id),
            'quantity' => 3 + $cardIndex,
            'result_description' => 'Materi demo siap diperiksa oleh tim Quality Control.',
            'qc_quantity' => $isQcComplete ? 3 + $cardIndex : null,
            'qc_note' => $isQcComplete ? 'Sesuai brief dan siap digunakan.' : null,
            'qc_by' => $isQcComplete ? $users[0]->id : null,
            'qc_at' => $isQcComplete ? now()->subDay() : null,
        ]);
    }

    private function createNotifications(array $users): void
    {
        foreach (array_values($users) as $index => $user) {
            Notification::withoutEvents(function () use ($user, $index): void {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'demo_update',
                    'title' => self::TAG.' Update pekerjaan hari ini',
                    'body' => $index % 2 === 0
                        ? 'Ada card yang mendekati deadline dan perlu ditinjau.'
                        : 'Attachment terbaru sudah tersedia untuk proses QC.',
                    'data' => ['source' => 'client-demo'],
                    'is_read' => $index % 3 === 0,
                ]);
            });
        }
    }

    private function cardBlueprints(int $boardIndex, int $divisionIndex, int $campaignIndex): array
    {
        $topics = [
            ['Riset kompetitor dan tren industri', 'Susun daftar kebutuhan konten bulan depan'],
            ['Finalisasi content plan mingguan', 'Persiapan materi presentasi client'],
            ['Produksi video campaign utama', 'Desain key visual dan turunannya'],
            ['Review hasil produksi tahap pertama', 'QC materi sebelum publikasi'],
            ['Publikasi konten campaign', 'Serah terima laporan performa'],
        ];
        $suffix = ' #'.($divisionIndex + 1).($campaignIndex + 1);
        $status = $boardIndex === 4 ? 'completed' : ($boardIndex >= 2 ? 'in_progress' : 'todo');
        $dueDates = [now()->addDays(28), now()->subDays(4), now()->subDay(), now()->addDays(2), now()->subDays(2)];

        return collect($topics[$boardIndex])->map(function (string $title, int $index) use ($suffix, $status, $dueDates, $boardIndex) {
            return [
                'title' => $title.$suffix,
                'description' => 'Data demo untuk menunjukkan alur kerja nyata, kolaborasi, deadline, dan pelaporan kepada client.',
                'priority' => $index === 0 && in_array($boardIndex, [1, 2], true) ? 'urgent' : ($boardIndex === 3 ? 'high' : 'medium'),
                'status' => $status,
                'due_date' => $dueDates[$boardIndex]->copy()->addDays($index),
                'completed_at' => $boardIndex === 4 ? now()->subDays($index + 1) : null,
            ];
        })->all();
    }

    private function campaignDescription(string $name): string
    {
        return 'Campaign demo "'.$name.'" untuk menampilkan perencanaan, eksekusi, review, QC, dan penyelesaian pekerjaan secara end-to-end.';
    }

    private function divisionBlueprints(): array
    {
        return [
            [
                'name' => 'Digital Marketing Demo', 'code' => 'DM-DEMO', 'slug' => 'demo-digital-marketing',
                'description' => 'Tim yang menangani strategi digital, social media, dan performance campaign.',
                'admin' => 'demo.admin.dm@tracko.test',
                'users' => ['demo.admin.dm@tracko.test', 'demo.ayu@tracko.test', 'demo.bima@tracko.test'],
                'workspaces' => [[
                    'name' => 'Marketing Campaign Hub',
                    'description' => 'Workspace terpusat untuk aktivitas marketing lintas channel.',
                    'campaigns' => ['Campaign Ramadan 2027', 'Product Launch Q3'],
                ]],
            ],
            [
                'name' => 'Creative Design Demo', 'code' => 'DKV-DEMO', 'slug' => 'demo-creative-design',
                'description' => 'Tim kreatif untuk desain visual, video, branding, dan quality control.',
                'admin' => 'demo.admin.creative@tracko.test',
                'users' => ['demo.admin.creative@tracko.test', 'demo.citra@tracko.test', 'demo.fajar@tracko.test'],
                'workspaces' => [[
                    'name' => 'Creative Production Studio',
                    'description' => 'Workspace produksi visual dan approval materi kreatif.',
                    'campaigns' => ['Brand Refresh 2026', 'Always On Social Content'],
                ]],
            ],
            [
                'name' => 'Client Service Demo', 'code' => 'CS-DEMO', 'slug' => 'demo-client-service',
                'description' => 'Tim pengelola komunikasi, permintaan, dan deliverable client.',
                'admin' => 'demo.admin.client@tracko.test',
                'users' => ['demo.admin.client@tracko.test', 'demo.gita@tracko.test', 'demo.hendra@tracko.test'],
                'workspaces' => [[
                    'name' => 'Client Delivery Center',
                    'description' => 'Workspace pemantauan request dan penyelesaian deliverable client.',
                    'campaigns' => ['Client Onboarding Enterprise', 'Monthly Retainer Delivery'],
                ]],
            ],
        ];
    }
}
