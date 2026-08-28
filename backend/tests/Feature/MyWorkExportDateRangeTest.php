<?php

namespace Tests\Feature;

use App\Exports\MyWorkLogExport;
use App\Exports\MyWorkSummarySheet;
use App\Http\Controllers\Api\MyActivityController;
use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Workspace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use ReflectionMethod;
use Tests\TestCase;

class MyWorkExportDateRangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_export_resolves_selected_date_range(): void
    {
        $request = Request::create('/api/my-activities/export', 'GET', [
            'type' => 'monthly',
            'start_date' => '2026-07-05',
            'end_date' => '2026-07-20',
        ]);

        $method = new ReflectionMethod(
            MyActivityController::class,
            'resolveExportPeriod'
        );

        [$start, $end, $label] = $method->invoke(
            app(MyActivityController::class),
            'monthly',
            $request
        );

        $this->assertSame('2026-07-05 00:00:00', $start->format('Y-m-d H:i:s'));
        $this->assertSame('2026-07-20 23:59:59', $end->format('Y-m-d H:i:s'));
        $this->assertStringContainsString('05', $label);
        $this->assertStringContainsString('20', $label);
    }

    public function test_export_omits_activity_log_and_storage_from_excel_and_pdf(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'test',
            'action' => 'updated',
            'description' => 'Should not be exported',
        ]);

        $request = Request::create('/api/my-activities/export', 'GET', [
            'type' => 'daily',
            'date' => now()->format('Y-m-d'),
        ]);
        $method = new ReflectionMethod(
            MyActivityController::class,
            'gatherExportData'
        );
        $data = $method->invoke(
            app(MyActivityController::class),
            'daily',
            $request
        );

        $this->assertArrayNotHasKey('activities', $data);
        $this->assertArrayNotHasKey('total_activities', $data['summary']);
        $this->assertArrayNotHasKey('total_storage_used_mb', $data['summary']);

        $excel = new MyWorkLogExport(
            $data['summary'],
            $data['completedTasks'],
            $data['attachments']
        );
        $this->assertSame(['Ringkasan', 'Task Selesai', 'Attachment'], array_keys($excel->sheets()));

        $summaryRows = (new MyWorkSummarySheet($data['summary']))->array();
        $summaryLabels = array_column($summaryRows, 0);
        $this->assertNotContains('Total Aktivitas (Activity Log)', $summaryLabels);
        $this->assertNotContains('Total Penyimpanan Terpakai (MB)', $summaryLabels);
        $this->assertContains('Total Tasks', $summaryLabels);
        $this->assertContains('Completion Rate', $summaryLabels);

        $pdfHtml = view('exports.my-work-log', [
            'summary' => $data['summary'],
            'completedTasks' => $data['completedTasks'],
            'attachments' => $data['attachments'],
        ])->render();
        $this->assertStringNotContainsString('Log Aktivitas', $pdfHtml);
        $this->assertStringNotContainsString('Storage Terpakai', $pdfHtml);
        $this->assertStringContainsString('Completion Rate', $pdfHtml);
    }

    public function test_excel_and_pdf_exports_are_downloadable(): void
    {
        $user = $this->actingAsWithPermission('my_work.export');

        foreach (['xlsx', 'pdf'] as $format) {
            $response = $this
                ->withHeader('X-Export-Password', 'SecureExport!2026')
                ->get(
                '/api/my-activities/export?type=daily&date='.
                now()->format('Y-m-d').'&format='.$format
            );

            $response->assertOk();
            $response->assertHeader(
                'X-Export-Encryption',
                $format === 'pdf' ? 'PDF-AES-256' : 'OOXML-Agile-AES-256'
            );
            $response->assertHeader(
                'Content-Type',
                $format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            $this->assertStringContainsString(
                'laporan-kerja-individu-daily-',
                (string) $response->headers->get('content-disposition')
            );
            $this->assertStringContainsString(
                '.'.$format,
                (string) $response->headers->get('content-disposition')
            );
        }

        $this->assertSame(
            2,
            ActivityLog::where('user_id', $user->id)
                ->where('action', 'report_downloaded')
                ->count()
        );
    }


    public function test_export_password_is_optional_but_must_be_strong_when_provided(): void
    {
        $this->actingAsWithPermission('my_work.export');

        $this->getJson('/api/my-activities/export?type=daily&format=pdf')
            ->assertOk()
            ->assertHeader('X-Export-Encryption', 'NONE');

        $this
            ->withHeader('X-Export-Password', 'too-short')
            ->getJson('/api/my-activities/export?type=daily&format=pdf')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('export_password');
    }
    public function test_monthly_export_rejects_reversed_date_range(): void
    {
        $this->actingAsWithPermission('my_work.export');

        $this->getJson(
            '/api/my-activities/export?type=monthly'
            .'&start_date=2026-07-20&end_date=2026-07-05&format=xlsx'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    public function test_monthly_export_requires_both_range_dates(): void
    {
        $this->actingAsWithPermission('my_work.export');

        $this->getJson(
            '/api/my-activities/export?type=monthly'
            .'&start_date=2026-07-05&format=xlsx'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    public function test_card_movement_feed_only_returns_moved_card_activities(): void
    {
        $user = $this->actingAsWithPermission('my_work.activities.view');

        $movement = ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'card',
            'action' => 'moved',
            'description' => "Memindahkan card 'Campaign A' ke board 'Done'",
            'meta' => [
                'card_title' => 'Campaign A',
                'from_board_name' => 'In Progress',
                'to_board_name' => 'Done',
            ],
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'card',
            'action' => 'updated',
            'description' => 'Mengubah judul card',
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'board',
            'action' => 'moved',
            'description' => 'Memindahkan board',
        ]);

        $this->getJson('/api/my-activities?range=all&activity_type=card_movement')
            ->assertOk()
            ->assertJsonPath('summary.total_activities', 1)
            ->assertJsonPath('activities.0.id', $movement->id)
            ->assertJsonPath('activities.0.meta.from_board_name', 'In Progress')
            ->assertJsonCount(1, 'activities');
    }

    public function test_task_summary_uses_the_same_selected_range_as_activity_feed(): void
    {
        $user = $this->actingAsWithPermission('my_work.activities.view');

        $division = Division::create([
            'name' => 'Digital',
            'slug' => 'digital-summary-test',
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Marketing',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'July Campaign',
            'type' => 'personal',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'To Do',
            'type' => 'todo',
        ]);

        $todo = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Today Todo',
            'status' => 'todo',
        ]);
        $todo->forceFill(['created_at' => now()->startOfDay()->addHour()])->save();

        $completed = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Today Completed',
            'status' => 'completed',
            'completed_at' => now(),
        ]);
        $completed->forceFill(['created_at' => now()->startOfDay()->addHours(2)])->save();

        $ongoing = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Older Ongoing Task',
            'status' => 'in_progress',
        ]);
        $ongoing->forceFill(['created_at' => now()->subMonths(2)])->save();

        $olderMovement = ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'card',
            'entity_id' => $ongoing->id,
            'action' => 'moved',
            'description' => "Memindahkan card 'Older Ongoing Task' ke board 'By Request'",
            'meta' => [
                'card_title' => 'Older Ongoing Task',
                'from_board_name' => 'Inbox',
                'to_board_name' => 'By Request',
            ],
        ]);
        $olderMovement->forceFill(['created_at' => now()->subMonths(3)])->save();

        $ongoingMovement = ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'card',
            'entity_id' => $ongoing->id,
            'action' => 'moved',
            'description' => "Memindahkan card 'Older Ongoing Task' ke board 'To Do'",
            'meta' => [
                'card_title' => 'Older Ongoing Task',
                'from_board_name' => 'By Request',
                'to_board_name' => 'To Do',
            ],
        ]);
        $ongoingMovement->forceFill(['created_at' => now()->subMonths(2)])->save();

        $outsideRange = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Old Completed',
            'status' => 'completed',
            'completed_at' => now()->subMonths(2),
        ]);
        $outsideRange->forceFill(['created_at' => now()->subMonths(2)])->save();

        $this->getJson('/api/my-activities?range=today&activity_type=card_movement')
            ->assertOk()
            ->assertJsonPath('summary.tasks.total', 3)
            ->assertJsonPath('summary.tasks.completed', 1)
            ->assertJsonPath('summary.tasks.completion_rate', 33.33)
            ->assertJsonPath('activities.0.id', $ongoingMovement->id)
            ->assertJsonPath('activities.0.is_ongoing', true)
            ->assertJsonCount(1, 'activities');

        $this->getJson('/api/my-activities?range=week&activity_type=card_movement')
            ->assertOk()
            ->assertJsonPath('summary.tasks.total', 3)
            ->assertJsonPath('summary.tasks.completed', 1)
            ->assertJsonPath('activities.0.id', $ongoingMovement->id)
            ->assertJsonPath('activities.0.is_ongoing', true)
            ->assertJsonCount(1, 'activities');

        $this->getJson('/api/my-activities?range=all&activity_type=card_movement')
            ->assertOk()
            ->assertJsonPath('summary.tasks.total', 4)
            ->assertJsonPath('summary.tasks.completed', 2);
    }

    public function test_monthly_attachment_filter_rejects_reversed_date_range(): void
    {
        $this->actingAsWithPermission('my_work.attachments.view');

        $this->getJson(
            '/api/my-activities/attachments?type=monthly'
            .'&start_date=2026-07-20&end_date=2026-07-05'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    public function test_monthly_attachment_filter_requires_both_range_dates(): void
    {
        $this->actingAsWithPermission('my_work.attachments.view');

        $this->getJson(
            '/api/my-activities/attachments?type=monthly'
            .'&start_date=2026-07-05'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }
    private function actingAsWithPermission(string $permission): User
    {
        Permission::firstOrCreate([
            'name' => $permission,
            'guard_name' => 'web',
        ]);

        $user = User::factory()->create();
        $user->givePermissionTo($permission);
        Sanctum::actingAs($user);

        return $user;
    }
}
