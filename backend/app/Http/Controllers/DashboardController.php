<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $scope = $request->query('scope', 'global');
        $user = $request->user();
        $filter = $this->resolvePeriod($request);
        $taskStatus = $this->taskStatus($user, $scope, $filter);

        return response()->json([
            'filter' => $this->periodPayload($filter),
            'stats' => $this->stats($user, $scope, $filter),
            'task_status' => $taskStatus,
            'insights' => $this->systemInsights($user, $scope, $filter, $taskStatus),
        ]);
    }

    /**
     * Insight lintas modul yang dapat langsung ditindaklanjuti.
     * Semua agregasi mengikuti scope dan periode dashboard agar angka konsisten.
     */
    private function systemInsights($user, string $scope, array $filter, array $taskStatus): array
    {
        $isGlobal = $scope === 'global' && $user->isSuperAdmin();
        $insights = collect();

        $insights->push([
            'id' => 'overdue-work',
            'category' => 'Task & Calendar',
            'severity' => $taskStatus['overdue'] > 0 ? 'critical' : 'success',
            'title' => $taskStatus['overdue'] > 0
                ? 'Pekerjaan melewati tenggat'
                : 'Tidak ada card overdue',
            'message' => $taskStatus['overdue'] > 0
                ? $taskStatus['overdue'].' card perlu ditinjau dan dijadwalkan ulang.'
                : 'Seluruh card aktif masih berada dalam batas tenggat.',
            'metric' => $taskStatus['overdue'].' overdue',
            'action_label' => $user->can('calendar.view') ? 'Buka Calendar' : 'Buka Task Manager',
            'action_path' => $user->can('calendar.view') ? '/calendar' : '/divisions',
            'priority' => $taskStatus['overdue'] > 0 ? 100 : 40,
        ]);

        $insights->push([
            'id' => 'due-soon',
            'category' => 'Calendar',
            'severity' => $taskStatus['due_soon'] > 0 ? 'warning' : 'success',
            'title' => $taskStatus['due_soon'] > 0
                ? 'Tenggat 7 hari ke depan'
                : 'Tidak ada deadline dalam 7 hari',
            'message' => $taskStatus['due_soon'] > 0
                ? $taskStatus['due_soon'].' card perlu dipastikan memiliki PIC dan progres yang jelas.'
                : 'Belum ada card aktif yang jatuh tempo dalam tujuh hari ke depan.',
            'metric' => $taskStatus['due_soon'].' card',
            'action_label' => $user->can('calendar.view') ? 'Tinjau Calendar' : 'Tinjau Task',
            'action_path' => $user->can('calendar.view') ? '/calendar' : '/divisions',
            'priority' => $taskStatus['due_soon'] > 0 ? 90 : 38,
        ]);

        $insights->push([
            'id' => 'completion-rate',
            'category' => 'Task Management',
            'severity' => $taskStatus['completion_rate'] >= 75 ? 'success' : 'info',
            'title' => $taskStatus['completion_rate'] >= 75
                ? 'Completion rate sehat'
                : 'Completion rate dapat ditingkatkan',
            'message' => $taskStatus['completed'].' dari '.$taskStatus['total'].' card pada periode ini telah selesai.',
            'metric' => $taskStatus['completion_rate'].'%',
            'action_label' => 'Buka Task Manager',
            'action_path' => '/divisions',
            'priority' => $taskStatus['completion_rate'] < 50 ? 72 : 36,
        ]);

        $activeCards = $this->scopedCards($user, $isGlobal)
            ->where('status', '!=', 'completed');
        $this->applyPeriod($activeCards, $filter, 'cards.created_at');

        $unassignedCards = (clone $activeCards)
            ->whereDoesntHave('assignees')
            ->count();
        $insights->push([
            'id' => 'unassigned-work',
            'category' => 'Workload',
            'severity' => $unassignedCards > 0 ? 'critical' : 'success',
            'title' => $unassignedCards > 0 ? 'Pekerjaan belum memiliki PIC' : 'Seluruh card memiliki PIC',
            'message' => $unassignedCards > 0
                ? $unassignedCards.' card aktif belum memiliki assignee.'
                : 'Tidak ada card aktif tanpa penanggung jawab.',
            'metric' => $unassignedCards.' tanpa PIC',
            'action_label' => 'Atur Assignment',
            'action_path' => '/divisions',
            'priority' => $unassignedCards > 0 ? 96 : 34,
        ]);

        $atRiskCards = (clone $activeCards)
            ->whereBetween('due_date', [now(), now()->addDays(3)->endOfDay()])
            ->where(function ($query) {
                $query->where('status', 'todo')
                    ->orWhereDoesntHave('assignees');
            })
            ->count();
        $insights->push([
            'id' => 'delay-risk',
            'category' => 'Risk Forecast',
            'severity' => $atRiskCards > 0 ? 'critical' : 'success',
            'title' => $atRiskCards > 0 ? 'Card berisiko terlambat' : 'Risiko terlambat terkendali',
            'message' => $atRiskCards > 0
                ? $atRiskCards.' card jatuh tempo dalam 3 hari tetapi belum berjalan atau belum memiliki PIC.'
                : 'Tidak ada card yang terindikasi terlambat dalam tiga hari ke depan.',
            'metric' => $atRiskCards.' berisiko',
            'action_label' => $user->can('calendar.view') ? 'Buka Calendar' : 'Buka Task Manager',
            'action_path' => $user->can('calendar.view') ? '/calendar' : '/divisions',
            'priority' => $atRiskCards > 0 ? 95 : 32,
        ]);

        $staleCards = (clone $activeCards)
            ->where('updated_at', '<', now()->subDays(7))
            ->count();
        $insights->push([
            'id' => 'stale-work',
            'category' => 'Card Aging',
            'severity' => $staleCards > 0 ? 'warning' : 'success',
            'title' => $staleCards > 0 ? 'Pekerjaan tidak mengalami pembaruan' : 'Pembaruan card tetap aktif',
            'message' => $staleCards > 0
                ? $staleCards.' card aktif tidak berubah selama minimal 7 hari.'
                : 'Tidak ada card aktif yang stagnan selama tujuh hari atau lebih.',
            'metric' => $staleCards.' stagnan',
            'action_label' => 'Tinjau Card',
            'action_path' => '/divisions',
            'priority' => $staleCards > 0 ? 88 : 30,
        ]);

        $completedWithDeadline = $this->scopedCards($user, $isGlobal)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->whereNotNull('due_date');
        $this->applyPeriod($completedWithDeadline, $filter, 'cards.completed_at');
        $deliveryMetrics = (clone $completedWithDeadline)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN completed_at <= due_date THEN 1 ELSE 0 END) as on_time')
            ->first();
        $deadlineCompletionCount = (int) $deliveryMetrics->total;
        $onTimeCount = (int) $deliveryMetrics->on_time;
        $onTimeRate = $deadlineCompletionCount > 0
            ? round(($onTimeCount / $deadlineCompletionCount) * 100, 1)
            : null;

        $insights->push([
            'id' => 'on-time-delivery',
            'category' => 'Delivery Quality',
            'severity' => $onTimeRate === null
                ? 'info'
                : ($onTimeRate >= 80 ? 'success' : ($onTimeRate >= 60 ? 'warning' : 'critical')),
            'title' => $onTimeRate === null
                ? 'Ketepatan waktu belum dapat dinilai'
                : ($onTimeRate >= 80 ? 'Ketepatan waktu penyelesaian baik' : 'Ketepatan waktu perlu ditingkatkan'),
            'message' => $onTimeRate === null
                ? 'Belum ada card selesai yang memiliki due date pada periode ini.'
                : $onTimeCount.' dari '.$deadlineCompletionCount.' card selesai sebelum atau tepat pada due date.',
            'metric' => $onTimeRate === null ? 'Belum ada data' : $onTimeRate.'%',
            'action_label' => $user->can('report.view') ? 'Buka Report' : null,
            'action_path' => $user->can('report.view') ? '/reports' : null,
            'priority' => $onTimeRate !== null && $onTimeRate < 60 ? 86 : 45,
        ]);

        if ($filter['start'] && $filter['end']) {
            [$previousStart, $previousEnd] = match ($filter['period']) {
                'day' => [
                    $filter['start']->copy()->subDay()->startOfDay(),
                    $filter['start']->copy()->subDay()->endOfDay(),
                ],
                'week' => [
                    $filter['start']->copy()->subWeek()->startOfWeek()->startOfDay(),
                    $filter['start']->copy()->subWeek()->endOfWeek()->endOfDay(),
                ],
                'month' => [
                    $filter['start']->copy()->subMonthNoOverflow()->startOfMonth(),
                    $filter['start']->copy()->subMonthNoOverflow()->endOfMonth(),
                ],
                default => [
                    $filter['start']->copy()->subYear()->startOfYear(),
                    $filter['start']->copy()->subYear()->endOfYear(),
                ],
            };
            $completedScope = $this->scopedCards($user, $isGlobal)
                ->where('status', 'completed')
                ->whereNotNull('completed_at');
            $trendMetrics = (clone $completedScope)
                ->selectRaw(
                    'SUM(CASE WHEN completed_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as current_total',
                    [$filter['start'], $filter['end']]
                )
                ->selectRaw(
                    'SUM(CASE WHEN completed_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as previous_total',
                    [$previousStart, $previousEnd]
                )
                ->first();
            $currentCompleted = (int) $trendMetrics->current_total;
            $previousCompleted = (int) $trendMetrics->previous_total;
            $completionChange = $previousCompleted > 0
                ? round((($currentCompleted - $previousCompleted) / $previousCompleted) * 100, 1)
                : ($currentCompleted > 0 ? 100.0 : 0.0);

            $insights->push([
                'id' => 'completion-trend',
                'category' => 'Performance Trend',
                'severity' => $completionChange < 0 ? 'warning' : ($completionChange > 0 ? 'success' : 'info'),
                'title' => $completionChange > 0
                    ? 'Penyelesaian meningkat'
                    : ($completionChange < 0 ? 'Penyelesaian menurun' : 'Penyelesaian stabil'),
                'message' => $currentCompleted.' card selesai pada periode ini dibanding '.$previousCompleted.' pada periode sebelumnya.',
                'metric' => ($completionChange > 0 ? '+' : '').$completionChange.'%',
                'action_label' => $user->can('report.view') ? 'Analisis Report' : null,
                'action_path' => $user->can('report.view') ? '/reports' : null,
                'priority' => $completionChange < 0 ? 82 : 35,
            ]);
        } else {
            $insights->push([
                'id' => 'completion-trend',
                'category' => 'Performance Trend',
                'severity' => 'info',
                'title' => 'Tren memerlukan periode pembanding',
                'message' => 'Pilih periode hari, minggu, bulan, atau tahun untuk membandingkan penyelesaian.',
                'metric' => 'N/A',
                'action_label' => $user->can('report.view') ? 'Analisis Report' : null,
                'action_path' => $user->can('report.view') ? '/reports' : null,
                'priority' => 35,
            ]);
        }

        if ($isGlobal) {
            $workloadQuery = DB::table('card_user')
                ->join('cards', 'cards.id', '=', 'card_user.card_id')
                ->join('users', 'users.id', '=', 'card_user.user_id')
                ->where('cards.status', '!=', 'completed');
            $this->applyPeriod($workloadQuery, $filter, 'cards.created_at');
            $workloads = $workloadQuery
                ->select(['users.id', 'users.name'])
                ->selectRaw('COUNT(DISTINCT cards.id) as active_cards')
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('active_cards')
                ->get();

            if ($workloads->isNotEmpty()) {
                $highestWorkload = $workloads->first();
                $averageWorkload = round((float) $workloads->avg('active_cards'), 1);
                $isImbalanced = (int) $highestWorkload->active_cards >= 5
                    && (float) $highestWorkload->active_cards > $averageWorkload * 1.5;
                $insights->push([
                    'id' => 'workload-balance',
                    'category' => 'Team Workload',
                    'severity' => $isImbalanced ? 'warning' : 'success',
                    'title' => $isImbalanced ? 'Beban kerja belum merata' : 'Distribusi beban kerja terkendali',
                    'message' => $highestWorkload->name.' memiliki beban tertinggi: '
                        .$highestWorkload->active_cards.' card aktif; rata-rata tim '.$averageWorkload.'.',
                    'metric' => $highestWorkload->active_cards.' card',
                    'action_label' => $user->can('profile.view') ? 'Tinjau Tim' : 'Buka Task Manager',
                    'action_path' => $user->can('profile.view') ? '/profile' : '/divisions',
                    'priority' => $isImbalanced ? 84 : 30,
                ]);
            } else {
                $insights->push([
                    'id' => 'workload-balance',
                    'category' => 'Team Workload',
                    'severity' => 'info',
                    'title' => 'Belum ada beban aktif',
                    'message' => 'Belum ada card aktif yang ditugaskan kepada anggota pada periode ini.',
                    'metric' => '0 card',
                    'action_label' => $user->can('profile.view') ? 'Tinjau Tim' : 'Buka Task Manager',
                    'action_path' => $user->can('profile.view') ? '/profile' : '/divisions',
                    'priority' => 30,
                ]);
            }
        }

        $campaignQuery = Campaign::query();
        if (! $isGlobal) {
            $campaignQuery->where(function ($query) use ($user) {
                $query->where('created_by', $user->id)
                    ->orWhereHas('members', fn ($memberQuery) => $memberQuery->where('users.id', $user->id)
                    );
            });
        }
        $this->applyPeriod($campaignQuery, $filter, 'campaigns.created_at');
        $campaignDueSoon = (clone $campaignQuery)
            ->whereBetween('due_date', [now(), now()->addDays(14)->endOfDay()])
            ->count();

        $campaignsAtRisk = (clone $campaignQuery)
            ->whereBetween('due_date', [now(), now()->addDays(30)->endOfDay()])
            ->withCount([
                'cards as total_cards',
                'cards as completed_cards' => fn ($query) => $query->where('status', 'completed'),
            ])
            ->get()
            ->filter(fn (Campaign $campaign) => $campaign->total_cards > 0
                && ($campaign->completed_cards / $campaign->total_cards) < 0.5
            )
            ->count();

        $insights->push([
            'id' => 'campaign-deadline',
            'category' => 'Campaign',
            'severity' => $campaignDueSoon > 0 ? 'warning' : 'success',
            'title' => $campaignDueSoon > 0 ? 'Campaign mendekati deadline' : 'Deadline campaign terkendali',
            'message' => $campaignDueSoon > 0
                ? $campaignDueSoon.' campaign jatuh tempo dalam 14 hari.'
                : 'Tidak ada campaign yang jatuh tempo dalam 14 hari ke depan.',
            'metric' => $campaignDueSoon.' campaign',
            'action_label' => 'Tinjau Campaign',
            'action_path' => '/divisions',
            'priority' => $campaignDueSoon > 0 ? 80 : 28,
        ]);

        $insights->push([
            'id' => 'campaign-progress-risk',
            'category' => 'Campaign',
            'severity' => $campaignsAtRisk > 0 ? 'critical' : 'success',
            'title' => $campaignsAtRisk > 0 ? 'Progress campaign berisiko' : 'Progress campaign terkendali',
            'message' => $campaignsAtRisk > 0
                ? $campaignsAtRisk.' campaign jatuh tempo dalam 30 hari dengan progress di bawah 50%.'
                : 'Tidak ada campaign mendekati deadline dengan progress di bawah 50%.',
            'metric' => $campaignsAtRisk.' campaign',
            'action_label' => 'Tinjau Campaign',
            'action_path' => '/divisions',
            'priority' => $campaignsAtRisk > 0 ? 92 : 26,
        ]);

        if ($isGlobal || $user->can('form.view')) {
            $formQuery = Form::query();
            $submissionQuery = FormSubmission::query();
            if (! $isGlobal) {
                $formQuery->where('created_by', $user->id);
                $submissionQuery->whereHas(
                    'form',
                    fn ($query) => $query->where('created_by', $user->id)
                );
            }
            $this->applyPeriod($formQuery, $filter, 'forms.created_at');
            $this->applyPeriod($submissionQuery, $filter, 'form_submissions.created_at');
            $activeForms = (clone $formQuery)->where('is_active', true)->count();
            $submissionMetrics = (clone $submissionQuery)
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending")
                ->selectRaw("SUM(CASE WHEN status IN ('forwarded', 'completed', 'exported') THEN 1 ELSE 0 END) as processed")
                ->first();
            $pendingSubmissions = (int) $submissionMetrics->pending;
            $submissionCount = (int) $submissionMetrics->total;
            $processedSubmissions = (int) $submissionMetrics->processed;
            $formConversionRate = $submissionCount > 0
                ? round(($processedSubmissions / $submissionCount) * 100, 1)
                : 0;

            $insights->push([
                'id' => 'form-pending-responses',
                'category' => 'Forms',
                'severity' => $pendingSubmissions > 0 ? 'warning' : 'success',
                'title' => $pendingSubmissions > 0
                    ? 'Respons form menunggu tindak lanjut'
                    : 'Tidak ada respons tertunda',
                'message' => $pendingSubmissions > 0
                    ? $pendingSubmissions.' dari '.$submissionCount.' respons masih berstatus submitted.'
                    : 'Seluruh respons yang masuk sudah ditindaklanjuti.',
                'metric' => $pendingSubmissions.' tertunda',
                'action_label' => 'Buka Forms',
                'action_path' => '/forms',
                'priority' => $pendingSubmissions > 0 ? 75 : 25,
            ]);

            $insights->push([
                'id' => 'form-processing-rate',
                'category' => 'Forms',
                'severity' => $submissionCount === 0
                    ? 'info'
                    : ($formConversionRate >= 80 ? 'success' : ($formConversionRate >= 50 ? 'warning' : 'critical')),
                'title' => $submissionCount === 0
                    ? 'Processing rate belum dapat dinilai'
                    : ($formConversionRate >= 80 ? 'Processing rate Form baik' : 'Processing rate Form perlu ditingkatkan'),
                'message' => $submissionCount === 0
                    ? $activeForms.' form aktif dan belum memiliki respons pada periode ini.'
                    : $processedSubmissions.' dari '.$submissionCount.' respons telah diproses.',
                'metric' => $formConversionRate.'%',
                'action_label' => 'Buka Forms',
                'action_path' => '/forms',
                'priority' => $submissionCount > 0 && $formConversionRate < 50 ? 74 : 24,
            ]);
        }

        $resultFiles = CardAttachment::query()->whereNotNull('file_path');
        $briefFiles = CardBriefAttachment::query()->whereNotNull('file_path');
        if (! $isGlobal) {
            $resultFiles->where('uploaded_by', $user->id);
            $briefFiles->where('uploaded_by', $user->id);
        }
        $this->applyPeriod($resultFiles, $filter, 'card_attachments.created_at');
        $this->applyPeriod($briefFiles, $filter, 'card_brief_attachments.created_at');
        $resultFileMetrics = (clone $resultFiles)
            ->selectRaw('COUNT(*) as total, COALESCE(SUM(file_size), 0) as bytes')
            ->first();
        $briefFileMetrics = (clone $briefFiles)
            ->selectRaw('COUNT(*) as total, COALESCE(SUM(file_size), 0) as bytes')
            ->first();
        $fileCount = (int) $resultFileMetrics->total + (int) $briefFileMetrics->total;
        $storageBytes = (int) $resultFileMetrics->bytes + (int) $briefFileMetrics->bytes;

        $insights->push([
            'id' => 'storage-usage',
            'category' => 'Files & Report',
            'severity' => 'info',
            'title' => 'Pemakaian file pada periode aktif',
            'message' => $fileCount.' file tersimpan dan tersedia untuk kebutuhan laporan.',
            'metric' => $this->formatBytes($storageBytes),
            'action_label' => $user->can('report.view') ? 'Buka Report' : null,
            'action_path' => $user->can('report.view') ? '/reports' : null,
            'priority' => 20,
        ]);

        $qcQuery = CardAttachment::query()->whereNotNull('quantity');
        if (! $isGlobal) {
            $qcQuery->where('uploaded_by', $user->id);
        }
        $this->applyPeriod($qcQuery, $filter, 'card_attachments.created_at');
        $qcMetrics = (clone $qcQuery)
            ->selectRaw('SUM(CASE WHEN qc_at IS NULL THEN 1 ELSE 0 END) as pending')
            ->selectRaw('SUM(CASE WHEN qc_quantity IS NOT NULL AND qc_quantity != quantity THEN 1 ELSE 0 END) as mismatch')
            ->first();
        $pendingQc = (int) $qcMetrics->pending;
        $qcMismatch = (int) $qcMetrics->mismatch;
        $insights->push([
            'id' => 'qc-pending',
            'category' => 'Quality Control',
            'severity' => $pendingQc > 0 ? 'warning' : 'success',
            'title' => $pendingQc > 0 ? 'Attachment menunggu QC' : 'Antrean QC selesai',
            'message' => $pendingQc > 0
                ? $pendingQc.' attachment ber-quantity belum diperiksa.'
                : 'Tidak ada attachment ber-quantity yang menunggu pemeriksaan.',
            'metric' => $pendingQc.' item',
            'action_label' => $user->can('report.view') ? 'Tinjau Report' : 'Buka Task Manager',
            'action_path' => $user->can('report.view') ? '/reports' : '/divisions',
            'priority' => $pendingQc > 0 ? 78 : 22,
        ]);

        $insights->push([
            'id' => 'qc-quantity-mismatch',
            'category' => 'Quality Control',
            'severity' => $qcMismatch > 0 ? 'critical' : 'success',
            'title' => $qcMismatch > 0 ? 'Ditemukan selisih hasil QC' : 'Quantity sesuai hasil QC',
            'message' => $qcMismatch > 0
                ? $qcMismatch.' attachment memiliki quantity yang tidak sesuai hasil QC.'
                : 'Tidak ditemukan ketidaksesuaian quantity dengan hasil QC.',
            'metric' => $qcMismatch.' item',
            'action_label' => $user->can('report.view') ? 'Tinjau Report' : 'Buka Task Manager',
            'action_path' => $user->can('report.view') ? '/reports' : '/divisions',
            'priority' => $qcMismatch > 0 ? 94 : 21,
        ]);

        $activityQuery = ActivityLog::query()->whereNotNull('user_id');
        if (! $isGlobal) {
            $activityQuery->where('user_id', $user->id);
        }
        $this->applyPeriod($activityQuery, $filter, 'activity_logs.created_at');
        $activityMetrics = (clone $activityQuery)
            ->selectRaw('COUNT(*) as total, COUNT(DISTINCT user_id) as active_users')
            ->first();
        $activeUsers = (int) $activityMetrics->active_users;
        $activityCount = (int) $activityMetrics->total;

        $insights->push([
            'id' => 'collaboration',
            'category' => 'Collaboration',
            'severity' => $activityCount > 0 ? 'info' : 'warning',
            'title' => $activityCount > 0 ? 'Kolaborasi sistem aktif' : 'Belum ada aktivitas pada periode ini',
            'message' => $activityCount > 0
                ? $activeUsers.' pengguna menghasilkan '.$activityCount.' aktivitas.'
                : 'Periksa periode atau dorong tim memperbarui pekerjaan.',
            'metric' => $activeUsers.' pengguna aktif',
            'action_label' => $user->can('profile.view') ? 'Lihat Pengguna' : null,
            'action_path' => $user->can('profile.view') ? '/profile' : null,
            'priority' => $activityCount > 0 ? 15 : 70,
        ]);

        if ($isGlobal || $user->can('chat.view')) {
            $messageQuery = Message::query();
            if (! $isGlobal) {
                $messageQuery->where('user_id', $user->id);
            }
            $this->applyPeriod($messageQuery, $filter, 'messages.created_at');
            $messageMetrics = (clone $messageQuery)
                ->selectRaw('COUNT(*) as total, COUNT(DISTINCT chat_room_id) as active_rooms')
                ->first();
            $messageCount = (int) $messageMetrics->total;
            $activeRooms = (int) $messageMetrics->active_rooms;
            $insights->push([
                'id' => 'chat-engagement',
                'category' => 'Chat',
                'severity' => $messageCount > 0 ? 'info' : 'warning',
                'title' => $messageCount > 0 ? 'Komunikasi tim berlangsung aktif' : 'Tidak ada percakapan pada periode ini',
                'message' => $messageCount.' pesan tercatat pada '.$activeRooms.' ruang chat.',
                'metric' => $messageCount.' pesan',
                'action_label' => 'Buka Chats',
                'action_path' => '/chats',
                'priority' => $messageCount > 0 ? 12 : 50,
            ]);
        }

        return $insights
            ->sortByDesc('priority')
            ->values()
            ->map(fn (array $insight) => collect($insight)->except('priority')->all())
            ->all();
    }

    private function scopedCards($user, bool $isGlobal)
    {
        $query = Card::query();

        if (! $isGlobal) {
            $query->where(function ($cardQuery) use ($user) {
                $cardQuery->where('created_by', $user->id)
                    ->orWhereHas('assignees', fn ($assigneeQuery) => $assigneeQuery->where('users.id', $user->id)
                    );
            });
        }

        return $query;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        $units = ['KB', 'MB', 'GB', 'TB'];
        $value = $bytes / 1024;
        foreach ($units as $unit) {
            if ($value < 1024 || $unit === 'TB') {
                return round($value, 1).' '.$unit;
            }
            $value /= 1024;
        }

        return $bytes.' B';
    }

    /**
     * Top 3 penyelesai task untuk setiap divisi, khusus Super Admin.
     *
     * Penyelesai task mengikuti definisi ranking My Work: user yang melakukan
     * movement terakhir pada card yang saat ini sudah selesai.
     */
    public function divisionRankings(Request $request)
    {
        $superAdmin = $request->user();

        abort_unless(
            $superAdmin?->isSuperAdmin(),
            403,
            'Ranking per divisi hanya tersedia untuk Super Admin.'
        );

        $filter = $this->resolvePeriod($request);

        $rankingRows = ActivityLog::query()
            ->select([
                'divisions.id as division_id',
                'activity_logs.user_id',
                'users.name',
                'users.avatar',
            ])
            ->selectRaw('COUNT(*) as completed_tasks')
            ->join('users', 'users.id', '=', 'activity_logs.user_id')
            ->join('division_user', 'division_user.user_id', '=', 'users.id')
            ->join('divisions', 'divisions.id', '=', 'division_user.division_id')
            ->join('cards', 'cards.id', '=', 'activity_logs.entity_id')
            ->where('activity_logs.entity_type', 'card')
            ->where('activity_logs.action', 'moved')
            ->where('cards.status', 'completed')
            ->whereNotNull('cards.completed_at')
            ->when($filter['start'] && $filter['end'], function ($query) use ($filter) {
                $query->whereBetween('cards.completed_at', [$filter['start'], $filter['end']]);
            })
            ->whereDoesntHave('user.roles', function ($query) {
                $query->where('name', User::ROLE_SUPER_ADMIN);
            })
            ->whereNotExists(function ($query) {
                $query
                    ->selectRaw('1')
                    ->from('activity_logs as newer_movement')
                    ->whereColumn('newer_movement.entity_id', 'activity_logs.entity_id')
                    ->where('newer_movement.entity_type', 'card')
                    ->where('newer_movement.action', 'moved')
                    ->whereColumn('newer_movement.created_at', '>', 'activity_logs.created_at');
            })
            ->groupBy(
                'divisions.id',
                'activity_logs.user_id',
                'users.name',
                'users.avatar'
            )
            ->get()
            ->groupBy('division_id');

        $divisions = Division::query()
            ->select(['id', 'name', 'code'])
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(function (Division $division) use ($rankingRows) {
                $ranking = $rankingRows
                    ->get($division->id, collect())
                    ->sort(function ($left, $right) {
                        return ((int) $right->completed_tasks <=> (int) $left->completed_tasks)
                            ?: strcasecmp($left->name, $right->name);
                    })
                    ->take(3)
                    ->values()
                    ->map(fn ($item, $index) => [
                        'rank' => $index + 1,
                        'user' => [
                            'id' => $item->user_id,
                            'name' => $item->name,
                            'avatar' => $item->avatar,
                        ],
                        'completed_tasks' => (int) $item->completed_tasks,
                    ]);

                return [
                    'id' => $division->id,
                    'name' => $division->name,
                    'code' => $division->code,
                    'member_count' => $division->users_count,
                    'ranking' => $ranking,
                ];
            });

        return response()->json([
            'success' => true,
            'filter' => $this->periodPayload($filter),
            'summary' => [
                'divisions' => $divisions->count(),
                'active_divisions' => $divisions
                    ->filter(fn ($division) => $division['ranking']->isNotEmpty())
                    ->count(),
                'ranked_users' => $rankingRows->flatten(1)->count(),
                'completed_tasks' => (int) $rankingRows
                    ->flatten(1)
                    ->sum('completed_tasks'),
            ],
            'divisions' => $divisions,
        ]);
    }

    /**
     * STATISTIK (SAFE UNTUK SUPER ADMIN & USER)
     */
    private function stats($user, string $scope, array $filter): array
    {
        $isSuperAdmin = $user->isSuperAdmin();

        if ($scope === 'global' && $isSuperAdmin) {
            return [
                'users' => $this->countWithinPeriod(
                    User::query(), $filter, 'users.created_at'
                ),
                'divisions' => $this->countWithinPeriod(
                    Division::query(), $filter, 'divisions.created_at'
                ),
                'workspaces' => $this->countWithinPeriod(
                    Workspace::query(), $filter, 'workspaces.created_at'
                ),
                'campaigns' => $this->countWithinPeriod(
                    Campaign::query(), $filter, 'campaigns.created_at'
                ),
                'boards' => $this->countWithinPeriod(
                    Board::query(), $filter, 'boards.created_at'
                ),
                'cards' => $this->countWithinPeriod(
                    Card::query(), $filter, 'cards.created_at'
                ),
            ];
        }

        $campaignIds = $user->campaigns()->pluck('campaigns.id');

        return [
            'users' => $this->countWithinPeriod(
                User::query()->whereKey($user->id), $filter, 'users.created_at'
            ),
            'divisions' => $this->countWithinPeriod(
                $user->divisions()->getQuery(), $filter, 'divisions.created_at'
            ),
            'workspaces' => $this->countWithinPeriod(
                $user->workspaces()->getQuery(), $filter, 'workspaces.created_at'
            ),
            'campaigns' => $this->countWithinPeriod(
                $user->campaigns()->getQuery(), $filter, 'campaigns.created_at'
            ),
            'boards' => $this->countWithinPeriod(
                Board::query()->whereHas('campaign', fn ($query) => $query->whereIn('campaigns.id', $campaignIds)
                ),
                $filter,
                'boards.created_at'
            ),
            'cards' => $this->countWithinPeriod(
                Card::query()->whereHas('board.campaign', fn ($query) => $query->whereIn('campaigns.id', $campaignIds)
                ),
                $filter,
                'cards.created_at'
            ),
        ];
    }

    /**
     * Distribusi status task untuk visual operational health dashboard.
     * Overdue dipisahkan dari todo/in progress agar setiap card hanya masuk
     * ke satu kategori utama.
     */
    private function taskStatus($user, string $scope, array $filter): array
    {
        $query = Card::query();

        if ($scope !== 'global' || ! $user->isSuperAdmin()) {
            $query->where(function ($cardQuery) use ($user) {
                $cardQuery
                    ->where('created_by', $user->id)
                    ->orWhereHas('assignees', function ($assigneeQuery) use ($user) {
                        $assigneeQuery->where('users.id', $user->id);
                    });
            });
        }

        $this->applyPeriod($query, $filter, 'cards.created_at');

        $now = now();
        $dueSoonEnd = $now->copy()->addDays(7)->endOfDay();
        $metrics = $query
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed")
            ->selectRaw(
                "SUM(CASE WHEN status != 'completed' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) as overdue",
                [$now]
            )
            ->selectRaw(
                "SUM(CASE WHEN status = 'todo' AND (due_date IS NULL OR due_date >= ?) THEN 1 ELSE 0 END) as todo",
                [$now]
            )
            ->selectRaw(
                "SUM(CASE WHEN status = 'in_progress' AND (due_date IS NULL OR due_date >= ?) THEN 1 ELSE 0 END) as in_progress",
                [$now]
            )
            ->selectRaw(
                "SUM(CASE WHEN status != 'completed' AND due_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as due_soon",
                [$now, $dueSoonEnd]
            )
            ->first();

        $total = (int) $metrics->total;
        $completed = (int) $metrics->completed;
        $overdue = (int) $metrics->overdue;
        $todo = (int) $metrics->todo;
        $inProgress = (int) $metrics->in_progress;
        $dueSoon = (int) $metrics->due_soon;

        return [
            'total' => $total,
            'todo' => $todo,
            'in_progress' => $inProgress,
            'completed' => $completed,
            'overdue' => $overdue,
            'due_soon' => $dueSoon,
            'completion_rate' => $total > 0
                ? round(($completed / $total) * 100, 2)
                : 0,
        ];
    }

    /**
     * Satu resolver periode untuk semua widget dashboard.
     *
     * day/week memakai tanggal acuan, month memakai YYYY-MM, year memakai
     * tahun kalender, sedangkan all dapat dibatasi ke satu tahun tertentu.
     */
    private function resolvePeriod(Request $request): array
    {
        $maximumYear = now()->year + 1;
        $validated = $request->validate([
            'period' => ['nullable', 'in:day,week,month,year,all'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:'.$maximumYear],
            'all_year' => ['nullable', 'integer', 'min:2000', 'max:'.$maximumYear],
        ]);

        $period = $validated['period'] ?? 'month';
        $date = isset($validated['date'])
            ? Carbon::createFromFormat('Y-m-d', $validated['date'])->startOfDay()
            : now()->startOfDay();
        $month = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m', $validated['month'])->startOfMonth()
            : now()->startOfMonth();
        $year = (int) ($validated['year'] ?? now()->year);
        $allYear = isset($validated['all_year'])
            ? (int) $validated['all_year']
            : null;

        [$start, $end] = match ($period) {
            'day' => [
                $date->copy()->startOfDay(),
                $date->copy()->endOfDay(),
            ],
            'week' => [
                $date->copy()->startOfWeek()->startOfDay(),
                $date->copy()->endOfWeek()->endOfDay(),
            ],
            'month' => [
                $month->copy()->startOfMonth(),
                $month->copy()->endOfMonth(),
            ],
            'year' => [
                Carbon::create($year, 1, 1)->startOfYear(),
                Carbon::create($year, 1, 1)->endOfYear(),
            ],
            default => $allYear
                ? [
                    Carbon::create($allYear, 1, 1)->startOfYear(),
                    Carbon::create($allYear, 1, 1)->endOfYear(),
                ]
                : [null, null],
        };

        $label = match ($period) {
            'day' => $start->format('d M Y'),
            'week' => $start->format('d M').' - '.$end->format('d M Y'),
            'month' => $start->format('M Y'),
            'year' => (string) $year,
            default => $allYear ? 'Semua data tahun '.$allYear : 'Semua waktu',
        };

        return [
            'period' => $period,
            'date' => $date->format('Y-m-d'),
            'month' => $month->format('Y-m'),
            'year' => $year,
            'all_year' => $allYear,
            'start' => $start,
            'end' => $end,
            'label' => $label,
        ];
    }

    private function periodPayload(array $filter): array
    {
        return [
            'period' => $filter['period'],
            'date' => $filter['date'],
            'month' => $filter['month'],
            'year' => $filter['year'],
            'all_year' => $filter['all_year'],
            'start' => $filter['start']?->toIso8601String(),
            'end' => $filter['end']?->toIso8601String(),
            'label' => $filter['label'],
        ];
    }

    private function applyPeriod($query, array $filter, string $column): void
    {
        if ($filter['start'] && $filter['end']) {
            $query->whereBetween($column, [$filter['start'], $filter['end']]);
        }
    }

    private function countWithinPeriod($query, array $filter, string $column): int
    {
        $this->applyPeriod($query, $filter, $column);

        return $query->count();
    }

    public function activities(Request $request)
    {
        $scope = $request->query('scope', 'global');
        $range = $request->query('range', 'all');

        return response()->json([
            'activities' => $this->activityData($request->user(), $scope, $range),
        ]);
    }

    /**
     * AKTIVITAS TERBARU (PAGINATED)
     */
    private function activityData($user, string $scope, string $range)
    {
        $query = ActivityLog::with('user')->latest();

        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        // Filter rentang waktu
        switch ($range) {
            case 'today':
                $query->whereDate('created_at', now()->toDateString());
                break;
            case 'week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('created_at', now()->month);
                break;
            default:
                // all
                break;
        }

        $logs = $query->paginate(4);

        return [
            'data' => $logs->getCollection()->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user' => $log->user?->name ?? 'System',
                    'action' => $log->action,
                    'description' => $log->description,
                    'entity_type' => $log->entity_type,
                    'created_at' => $log->created_at?->toISOString(),
                ];
            })->values(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ];
    }

    /**
     * TREN AKTIVITAS (untuk chart)
     */
    private function trend($user, string $scope, string $range)
    {
        $query = ActivityLog::query();

        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        // Ambil data 7 hari terakhir
        $start = now()->subDays(6)->startOfDay();
        $end = now()->endOfDay();

        $query->whereBetween('created_at', [$start, $end]);

        $trend = $query->selectRaw('DATE(created_at) as date, count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Isi tanggal yang kosong dengan 0
        $dates = collect();
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $found = $trend->firstWhere('date', $date);
            $dates->push([
                'date' => $date,
                'total' => $found ? $found->total : 0,
            ]);
        }

        return $dates;
    }
}
