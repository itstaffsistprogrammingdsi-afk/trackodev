<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\MyActivityController;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
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

    public function test_monthly_export_only_collects_activities_inside_selected_range(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $inside = ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'test',
            'action' => 'updated',
            'description' => 'Inside selected range',
        ]);
        $inside->forceFill(['created_at' => '2026-07-10 12:00:00'])->save();

        $outside = ActivityLog::create([
            'user_id' => $user->id,
            'entity_type' => 'test',
            'action' => 'updated',
            'description' => 'Outside selected range',
        ]);
        $outside->forceFill(['created_at' => '2026-07-25 12:00:00'])->save();

        $request = Request::create('/api/my-activities/export', 'GET', [
            'type' => 'monthly',
            'start_date' => '2026-07-05',
            'end_date' => '2026-07-20',
        ]);
        $method = new ReflectionMethod(
            MyActivityController::class,
            'gatherExportData'
        );
        $data = $method->invoke(
            app(MyActivityController::class),
            'monthly',
            $request
        );

        $this->assertSame([$inside->id], $data['activities']->pluck('id')->all());
        $this->assertSame(1, $data['summary']['total_activities']);
    }

    public function test_monthly_export_rejects_reversed_date_range(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson(
            '/api/my-activities/export?type=monthly'
            .'&start_date=2026-07-20&end_date=2026-07-05&format=xlsx'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    public function test_monthly_export_requires_both_range_dates(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson(
            '/api/my-activities/export?type=monthly'
            .'&start_date=2026-07-05&format=xlsx'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }
}
