<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CardBrandController;
use App\Http\Controllers\Api\CardController;
use App\Http\Controllers\Api\CardLabelController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DailyTodoController;
use App\Http\Controllers\Api\DivisionController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\FormFieldController;
use App\Http\Controllers\Api\FormSubmissionController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\McpIntegrationController;
use App\Http\Controllers\Api\MyActivityController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PublicFormController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ResultDescriptionTemplateController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
// use App\Mail\CardAssignedMail;
// use App\Models\Card;
// use App\Models\User;
use App\Http\Controllers\Api\WorkspaceController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// ============================================
// PUBLIC FORMS
// ============================================

Route::get(
    '/public/forms',
    [PublicFormController::class, 'index'] // Buat method 'index' di controller untuk return form yang aktif
)->middleware('throttle:60,1');

Route::get(
    '/public/forms/{slug}',
    [PublicFormController::class, 'show']
)->middleware('throttle:60,1');

Route::post(
    '/public/forms/{slug}/submit',
    [PublicFormController::class, 'submit']
)->middleware('throttle:10,1');

// ============================================
// HEALTH CHECK
// ============================================

Route::get('/ping', function () {

    return response()->json([

        'message' => 'Backend OK',

        'time' => now(),
    ]);
});

Broadcast::routes([
    'middleware' => ['auth:sanctum'],
]);

// ============================================
// USER-OWNED EXTERNAL IDENTITIES
// ============================================

Route::prefix('integrations')->middleware('auth:sanctum')->group(function () {
    Route::get('/identities', [McpIntegrationController::class, 'identities'])
        ->middleware('throttle:60,1');
    Route::post('/link-codes', [McpIntegrationController::class, 'createLinkCode'])
        ->middleware('throttle:10,1');
    Route::delete('/identities/{identity}', [McpIntegrationController::class, 'unlinkIdentity'])
        ->middleware('throttle:10,1');
});

// ============================================
// MCP AGENT API
// ============================================

Route::prefix('mcp/v1')
    ->middleware(['mcp.auth', 'throttle:mcp', 'mcp.audit'])
    ->group(function () {
        Route::post('/identities/link', [McpIntegrationController::class, 'consumeLinkCode'])
            ->middleware(['mcp.ability:identity:link', 'throttle:20,1', 'mcp.idempotency'])
            ->name('mcp.identities.link');

        Route::middleware('mcp.actor')->group(function () {
            Route::get('/context', [McpIntegrationController::class, 'context'])
                ->middleware('mcp.ability:data:read')
                ->name('mcp.context');
            Route::get('/projects', [McpIntegrationController::class, 'projects'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.view|card.view|task.view'])
                ->name('mcp.projects');
            Route::get('/cards/search', [McpIntegrationController::class, 'searchCards'])
                ->middleware(['mcp.ability:data:read', 'permission:card.view|task.view'])
                ->name('mcp.cards.search');
            Route::get('/assignment-candidates', [McpIntegrationController::class, 'assignmentCandidates'])
                ->middleware(['mcp.ability:data:read', 'permission:user.mention|card.assign|task.assign'])
                ->name('mcp.assignment-candidates');

            // Directory and administration reads. Controllers still enforce
            // their own actor/resource policy; these routes only add the MCP
            // credential ability and audit boundary.
            Route::get('/users/mentionable', [UserController::class, 'mentionable'])
                ->middleware(['mcp.ability:data:read', 'permission:user.mention|user.view'])
                ->name('mcp.users.mentionable');
            Route::get('/users/assignment-candidates', [UserController::class, 'assignmentCandidates'])
                ->middleware(['mcp.ability:data:read', 'permission:user.mention|card.assign|form.submission.assign'])
                ->name('mcp.users.assignment-candidates');
            Route::get('/users-stats', [UserController::class, 'stats'])
                ->middleware(['mcp.ability:data:read', 'permission:user.stats.view|user.view'])
                ->name('mcp.users.stats');
            Route::get('/users', [UserController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:user.view'])
                ->name('mcp.users.index');
            Route::get('/users/{user}/details', [UserController::class, 'details'])
                ->middleware(['mcp.ability:data:read', 'permission:user.view'])
                ->name('mcp.users.details');
            Route::get('/users/{user}/permissions', [UserController::class, 'permissions'])
                ->middleware(['mcp.ability:data:read', 'permission:user.permissions.view|user.update'])
                ->name('mcp.users.permissions');
            Route::get('/users/{user}', [UserController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:user.view'])
                ->name('mcp.users.show');
            Route::get('/cards/{card}', [McpIntegrationController::class, 'showCard'])
                ->middleware(['mcp.ability:data:read', 'permission:card.view|task.view'])
                ->name('mcp.cards.show');

            // ============================================================
            // READ SURFACE
            // MCP memakai controller dan policy yang sama dengan aplikasi
            // web. Ini sengaja bukan proxy generik agar setiap kemampuan
            // tetap terdaftar, diaudit, dan dibatasi permission-nya.
            // ============================================================
            Route::get('/divisions', [DivisionController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:division.view'])
                ->name('mcp.divisions.index');
            Route::get('/my-divisions', [DivisionController::class, 'myDivisions'])
                ->middleware('mcp.ability:data:read')
                ->name('mcp.divisions.mine');
            Route::get('/divisions/{division}', [DivisionController::class, 'show'])
                ->middleware('mcp.ability:data:read')
                ->name('mcp.divisions.show');
            Route::get('/divisions/{division}/members', [DivisionController::class, 'members'])
                ->middleware(['mcp.ability:data:read', 'permission:division.member.view|division.view'])
                ->name('mcp.divisions.members');
            Route::get('/divisions/{division}/activities', [ActivityLogController::class, 'divisionActivities'])
                ->middleware('mcp.ability:data:read')
                ->name('mcp.divisions.activities');

            Route::get('/divisions/{division}/workspaces', [WorkspaceController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:workspace.view'])
                ->name('mcp.workspaces.index');
            Route::get('/workspaces/{workspace}', [WorkspaceController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:workspace.view'])
                ->name('mcp.workspaces.show');

            Route::get('/workspaces/{workspace}/campaigns', [CampaignController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.view'])
                ->name('mcp.campaigns.index');
            Route::get('/campaigns/{campaign}', [CampaignController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.view'])
                ->name('mcp.campaigns.show');
            Route::get('/campaigns/{campaign}/members', [CampaignController::class, 'members'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.member.view|campaign.view'])
                ->name('mcp.campaigns.members');
            Route::get('/campaigns/{campaign}/gantt', [CampaignController::class, 'gantt'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.gantt.view|campaign.analytics.view'])
                ->name('mcp.campaigns.gantt');
            Route::get('/campaigns/{campaign}/board-progress', [CampaignController::class, 'boardProgress'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.progress.view|campaign.analytics.view'])
                ->name('mcp.campaigns.progress');
            Route::get('/campaigns/{campaign}/stats', [CampaignController::class, 'stats'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.stats.view|campaign.analytics.view'])
                ->name('mcp.campaigns.stats');
            Route::get('/campaigns/{campaign}/overdue-tasks', [CampaignController::class, 'overdueTasks'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.overdue.view|campaign.analytics.view'])
                ->name('mcp.campaigns.overdue');
            Route::get('/campaigns/{campaign}/health', [CampaignController::class, 'health'])
                ->middleware(['mcp.ability:data:read', 'permission:campaign.health.view|campaign.analytics.view'])
                ->name('mcp.campaigns.health');

            Route::get('/campaigns/{campaign}/boards', [BoardController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:board.view|campaign.view'])
                ->name('mcp.boards.index');
            Route::get('/boards/{board}/cards', [CardController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:card.view|task.view'])
                ->name('mcp.boards.cards');
            Route::get('/cards/{card}/comments', [CardController::class, 'comments'])
                ->middleware(['mcp.ability:data:read', 'permission:comment.view|task.view'])
                ->name('mcp.comments.index');
            Route::get('/cards/{card}/tasks', [TaskController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:checklist.view|task.view'])
                ->name('mcp.tasks.index');
            Route::get('/tasks/{task}/subtasks', [TaskController::class, 'subtasks'])
                ->middleware(['mcp.ability:data:read', 'permission:subtask.view|task.view'])
                ->name('mcp.subtasks.index');
            Route::get('/cards/{card}/activities', [ActivityLogController::class, 'cardActivities'])
                ->middleware(['mcp.ability:data:read', 'permission:card.activity.view|task.view'])
                ->name('mcp.cards.activities');
            Route::get('/cards/{card}/attachments', [CardController::class, 'attachments'])
                ->middleware(['mcp.ability:data:read', 'permission:attachment.view|task.view'])
                ->name('mcp.cards.attachments');
            Route::get('/cards/{card}/brief-attachments', [CardController::class, 'briefAttachments'])
                ->middleware(['mcp.ability:data:read', 'permission:brief_attachment.view|task.view'])
                ->name('mcp.cards.brief-attachments');
            Route::get('/attachments/{attachment}/download', [CardController::class, 'download'])
                ->middleware(['mcp.ability:data:read', 'permission:attachment.download|task.view'])
                ->name('mcp.attachments.download');
            Route::get('/brief-attachments/{attachment}/download', [CardController::class, 'downloadBriefAttachment'])
                ->middleware(['mcp.ability:data:read', 'permission:brief_attachment.download|task.view'])
                ->name('mcp.brief-attachments.download');

            Route::get('/labels/{label}', [LabelController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:label.view'])
                ->name('mcp.labels.show');
            Route::get('/brands/{brand}', [BrandController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:brand.view'])
                ->name('mcp.brands.show');
            Route::get('/result-description-templates', [ResultDescriptionTemplateController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:result_template.view|task.view'])
                ->name('mcp.result-templates.index');

            Route::get('/labels', [LabelController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:label.view'])
                ->name('mcp.labels.index');
            Route::get('/brands', [BrandController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:brand.view'])
                ->name('mcp.brands.index');
            Route::get('/calendar', [CalendarController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:calendar.view'])
                ->name('mcp.calendar.index');
            Route::get('/calendar/create-options', [CalendarController::class, 'createOptions'])
                ->middleware(['mcp.ability:data:read', 'permission:card.create'])
                ->name('mcp.calendar.create-options');
            Route::get('/calendar/{date}', [CalendarController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:calendar.detail.view|calendar.view'])
                ->name('mcp.calendar.show');
            Route::get('/dashboard', [DashboardController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:dashboard.view'])
                ->name('mcp.dashboard.index');
            Route::get('/dashboard/division-rankings', [DashboardController::class, 'divisionRankings'])
                ->middleware(['mcp.ability:data:read', 'permission:dashboard.division_ranking.view'])
                ->name('mcp.dashboard.division-rankings');
            Route::get('/dashboard/activities', [DashboardController::class, 'activities'])
                ->middleware(['mcp.ability:data:read', 'permission:dashboard.activities.view'])
                ->name('mcp.dashboard.activities');
            Route::get('/notifications', [NotificationController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:notification.view'])
                ->name('mcp.notifications.index');
            Route::get('/chat/rooms', [ChatController::class, 'rooms'])
                ->middleware(['mcp.ability:data:read', 'permission:chat.view'])
                ->name('mcp.chat.rooms');
            Route::get('/chat/rooms/{chatRoom}', [ChatController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:chat.view'])
                ->name('mcp.chat.room');
            Route::get('/chat/rooms/{chatRoom}/messages', [ChatController::class, 'messages'])
                ->middleware(['mcp.ability:data:read', 'permission:chat.message.view'])
                ->name('mcp.chat.messages');
            Route::get('/forms', [FormController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:form.view'])
                ->name('mcp.forms.index');
            Route::get('/forms/{form}', [FormController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:form.view'])
                ->name('mcp.forms.show');
            Route::get('/forms/{form}/submissions', [FormSubmissionController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:form.responses.view'])
                ->name('mcp.form-submissions.index');
            Route::get('/form-submissions/{submission}', [FormSubmissionController::class, 'show'])
                ->middleware(['mcp.ability:data:read', 'permission:form.responses.view'])
                ->name('mcp.form-submissions.show');
            Route::get('/daily-todo', [DailyTodoController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:my_work.todo.view'])
                ->name('mcp.my-work.todo');
            Route::get('/my-activities', [MyActivityController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:my_work.activities.view'])
                ->name('mcp.my-work.activities');
            Route::get('/my-activities/completion-ranking', [MyActivityController::class, 'completionRanking'])
                ->middleware(['mcp.ability:data:read', 'permission:my_work.ranking.view'])
                ->name('mcp.my-work.ranking');
            Route::get('/my-activities/attachments', [MyActivityController::class, 'attachments'])
                ->middleware(['mcp.ability:data:read', 'permission:my_work.attachments.view'])
                ->name('mcp.my-work.attachments');
            Route::get('/reports/filters', [ReportController::class, 'getFilterOptions'])
                ->middleware(['mcp.ability:data:read', 'permission:report.view'])
                ->name('mcp.reports.filters');
            Route::get('/reports/users', [ReportController::class, 'index'])
                ->middleware(['mcp.ability:data:read', 'permission:report.view'])
                ->name('mcp.reports.users');
            Route::get('/reports/users/{user}/cards', [ReportController::class, 'showUserCards'])
                ->middleware(['mcp.ability:data:read', 'permission:report.view'])
                ->name('mcp.reports.user-cards');
            Route::get('/reports/users/{user}/activity-logs', [ReportController::class, 'getUserActivityLogs'])
                ->middleware(['mcp.ability:data:read', 'permission:report.activity.view'])
                ->name('mcp.reports.user-activity');
            Route::get('/reports/export/excel', [ReportController::class, 'exportExcel'])
                ->middleware(['mcp.ability:data:read', 'permission:report.export.excel|report.export'])
                ->name('mcp.reports.export.excel');
            Route::get('/reports/export/pdf', [ReportController::class, 'exportPdf'])
                ->middleware(['mcp.ability:data:read', 'permission:report.export.pdf|report.export'])
                ->name('mcp.reports.export.pdf');
            Route::get('/reports/preview/pdf', [ReportController::class, 'previewPdf'])
                ->middleware(['mcp.ability:data:read', 'permission:report.preview.pdf|report.preview'])
                ->name('mcp.reports.preview.pdf');
            Route::get('/my-activities/export', [MyActivityController::class, 'export'])
                ->middleware(['mcp.ability:data:read', 'permission:my_work.export'])
                ->name('mcp.my-work.export');

            Route::middleware(['mcp.ability:data:write', 'mcp.idempotency'])->group(function () {
                // Divisi, workspace, campaign, dan board
                Route::post('/divisions', [DivisionController::class, 'store'])
                    ->middleware('permission:division.create')->name('mcp.divisions.store');
                Route::put('/divisions/{division}', [DivisionController::class, 'update'])
                    ->middleware('permission:division.update')->name('mcp.divisions.update');
                Route::delete('/divisions/{division}', [DivisionController::class, 'destroy'])
                    ->middleware('permission:division.delete')->name('mcp.divisions.destroy');
                Route::post('/divisions/{division}/members', [DivisionController::class, 'addMember'])
                    ->middleware('permission:division.member.add|division.update')->name('mcp.divisions.members.store');
                Route::put('/divisions/{division}/members/{user}', [DivisionController::class, 'updateMember'])
                    ->middleware('permission:division.member.update|division.update')->name('mcp.divisions.members.update');
                Route::delete('/divisions/{division}/members/{user}', [DivisionController::class, 'removeMember'])
                    ->middleware('permission:division.member.remove|division.delete')->name('mcp.divisions.members.destroy');

                Route::post('/divisions/{division}/workspaces', [WorkspaceController::class, 'store'])
                    ->middleware('permission:workspace.create')->name('mcp.workspaces.store');
                Route::put('/workspaces/{workspace}', [WorkspaceController::class, 'update'])
                    ->middleware('permission:workspace.update')->name('mcp.workspaces.update');
                Route::delete('/workspaces/{workspace}', [WorkspaceController::class, 'destroy'])
                    ->middleware('permission:workspace.delete')->name('mcp.workspaces.destroy');

                Route::post('/workspaces/{workspace}/campaigns', [CampaignController::class, 'store'])
                    ->middleware('permission:campaign.create')->name('mcp.campaigns.store');
                Route::put('/campaigns/{campaign}', [CampaignController::class, 'update'])
                    ->middleware('permission:campaign.update')->name('mcp.campaigns.update');
                Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy'])
                    ->middleware('permission:campaign.delete')->name('mcp.campaigns.destroy');
                Route::post('/campaigns/{campaign}/members', [CampaignController::class, 'addMember'])
                    ->middleware('permission:campaign.member.add|campaign.update')->name('mcp.campaigns.members.store');
                Route::delete('/campaigns/{campaign}/members/{user}', [CampaignController::class, 'removeMember'])
                    ->middleware('permission:campaign.member.remove|campaign.update')->name('mcp.campaigns.members.destroy');

                Route::post('/campaigns/{campaign}/boards', [BoardController::class, 'store'])
                    ->middleware('permission:board.create|campaign.create')->name('mcp.boards.store');
                Route::put('/boards/{board}', [BoardController::class, 'update'])
                    ->middleware('permission:board.update|campaign.update')->name('mcp.boards.update');
                Route::patch('/boards/reorder', [BoardController::class, 'reorder'])
                    ->middleware('permission:board.reorder|campaign.update')->name('mcp.boards.reorder');
                Route::delete('/boards/{board}', [BoardController::class, 'destroy'])
                    ->middleware('permission:board.delete|campaign.delete')->name('mcp.boards.destroy');

                // Kartu dan detail pekerjaan
                Route::post('/boards/{board}/cards', [CardController::class, 'store'])
                    ->middleware('permission:card.create|task.create')
                    ->name('mcp.cards.store');
                Route::put('/cards/{card}', [CardController::class, 'update'])
                    ->middleware('permission:card.update|task.update')
                    ->name('mcp.cards.update');
                Route::patch('/cards/{card}/move', [CardController::class, 'move'])
                    ->middleware('permission:card.move|task.update')
                    ->name('mcp.cards.move');
                Route::patch('/cards/reorder', [CardController::class, 'reorder'])
                    ->middleware('permission:card.reorder|task.update')
                    ->name('mcp.cards.reorder');
                Route::delete('/cards/{card}', [CardController::class, 'destroy'])
                    ->middleware('permission:card.delete|task.delete')
                    ->name('mcp.cards.destroy');
                Route::post('/cards/{card}/comments', [CardController::class, 'addComment'])
                    ->middleware('permission:comment.create|task.update')
                    ->name('mcp.comments.store');
                Route::put('/comments/{comment}', [CardController::class, 'updateComment'])
                    ->middleware('permission:comment.update|task.update')
                    ->name('mcp.comments.update');
                Route::delete('/comments/{comment}', [CardController::class, 'deleteComment'])
                    ->middleware('permission:comment.delete|task.update')
                    ->name('mcp.comments.destroy');
                Route::post('/cards/{card}/assign', [CardController::class, 'assign'])
                    ->middleware('permission:card.assign|task.assign')
                    ->name('mcp.cards.assign');
                Route::delete('/cards/{card}/assign/{user}', [CardController::class, 'unassign'])
                    ->middleware('permission:card.unassign|task.assign')
                    ->name('mcp.cards.unassign');
                Route::post('/cards/{card}/attachments', [CardController::class, 'addAttachment'])
                    ->middleware('permission:attachment.upload|task.update')
                    ->name('mcp.cards.attachments.store');
                Route::post('/cards/{card}/brief-attachments', [CardController::class, 'addBriefAttachment'])
                    ->middleware('permission:brief_attachment.upload|task.update')
                    ->name('mcp.cards.brief-attachments.store');
                Route::delete('/attachments/{attachment}', [CardController::class, 'removeAttachment'])
                    ->middleware('permission:attachment.delete|task.update')
                    ->name('mcp.attachments.destroy');
                Route::post('/attachments/{attachment}/archive', [CardController::class, 'archiveAttachment'])
                    ->middleware('permission:attachment.delete|task.update')
                    ->name('mcp.attachments.archive');
                Route::post('/attachments/{attachment}/restore', [CardController::class, 'restoreAttachment'])
                    ->middleware('permission:attachment.delete|task.update')
                    ->name('mcp.attachments.restore');
                Route::delete('/brief-attachments/{attachment}', [CardController::class, 'removeBriefAttachment'])
                    ->middleware('permission:brief_attachment.delete|task.update')
                    ->name('mcp.brief-attachments.destroy');
                Route::post('/cards/{card}/tasks', [TaskController::class, 'store'])
                    ->middleware('permission:checklist.create|task.create')
                    ->name('mcp.tasks.store');
                Route::put('/tasks/{task}/status', [McpIntegrationController::class, 'setTaskStatus'])
                    ->middleware('permission:checklist.complete|task.update')
                    ->name('mcp.tasks.status');
                Route::put('/tasks/{task}', [TaskController::class, 'update'])
                    ->middleware('permission:checklist.update|task.update')->name('mcp.tasks.update');
                Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])
                    ->middleware('permission:checklist.delete|task.delete')->name('mcp.tasks.destroy');
                Route::patch('/tasks/reorder', [TaskController::class, 'reorder'])
                    ->middleware('permission:checklist.reorder|task.update')->name('mcp.tasks.reorder');
                Route::post('/tasks/{task}/subtasks', [TaskController::class, 'storeSubtask'])
                    ->middleware('permission:subtask.create|task.update')->name('mcp.subtasks.store');
                Route::put('/subtasks/{subtask}', [TaskController::class, 'updateSubtask'])
                    ->middleware('permission:subtask.update|task.update')->name('mcp.subtasks.update');
                Route::patch('/subtasks/{subtask}/complete', [TaskController::class, 'completeSubtask'])
                    ->middleware('permission:subtask.complete|task.update')->name('mcp.subtasks.complete');
                Route::delete('/subtasks/{subtask}', [TaskController::class, 'destroySubtask'])
                    ->middleware('permission:subtask.delete|task.update')->name('mcp.subtasks.destroy');

                // Label dan brand kartu
                Route::post('/labels', [LabelController::class, 'store'])
                    ->middleware('permission:label.create')->name('mcp.labels.store');
                Route::put('/labels/{label}', [LabelController::class, 'update'])
                    ->middleware('permission:label.update')->name('mcp.labels.update');
                Route::delete('/labels/{label}', [LabelController::class, 'destroy'])
                    ->middleware('permission:label.delete')->name('mcp.labels.destroy');
                Route::post('/cards/{card}/labels', [CardLabelController::class, 'attach'])
                    ->middleware('permission:label.attach')->name('mcp.cards.labels.attach');
                Route::delete('/cards/{card}/labels/{label}', [CardLabelController::class, 'detach'])
                    ->middleware('permission:label.detach')->name('mcp.cards.labels.detach');
                Route::patch('/cards/{card}/labels', [CardLabelController::class, 'toggle'])
                    ->middleware('permission:label.toggle')->name('mcp.cards.labels.toggle');
                Route::post('/brands', [BrandController::class, 'store'])
                    ->middleware('permission:brand.create')->name('mcp.brands.store');
                Route::put('/brands/{brand}', [BrandController::class, 'update'])
                    ->middleware('permission:brand.update')->name('mcp.brands.update');
                Route::delete('/brands/{brand}', [BrandController::class, 'destroy'])
                    ->middleware('permission:brand.delete')->name('mcp.brands.destroy');
                Route::post('/cards/{card}/brands/{brand}/attach', [CardBrandController::class, 'attach'])
                    ->middleware('permission:brand.attach')->name('mcp.cards.brands.attach');
                Route::delete('/cards/{card}/brands/{brand}/detach', [CardBrandController::class, 'detach'])
                    ->middleware('permission:brand.detach')->name('mcp.cards.brands.detach');

                // Chat, notifikasi, form, dan QC laporan
                Route::post('/chat/rooms/dm', [ChatController::class, 'createDm'])
                    ->middleware('permission:chat.room.create')->name('mcp.chat.dm.store');
                Route::post('/chat/rooms/{chatRoom}/messages', [ChatController::class, 'sendMessage'])
                    ->middleware('permission:chat.message.create')->name('mcp.chat.messages.store');
                Route::post('/chat/rooms/{chatRoom}/read', [ChatController::class, 'markRead'])
                    ->middleware('permission:chat.read')->name('mcp.chat.read');
                Route::delete('/chat/messages/{message}', [ChatController::class, 'deleteMessage'])
                    ->middleware('permission:chat.message.delete')->name('mcp.chat.messages.destroy');
                Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead'])
                    ->middleware('permission:notification.read_all')->name('mcp.notifications.read-all');
                Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead'])
                    ->middleware('permission:notification.read')->name('mcp.notifications.read');
                Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])
                    ->middleware('permission:notification.delete')->name('mcp.notifications.destroy');
                Route::post('/forms', [FormController::class, 'store'])
                    ->middleware('permission:form.create')->name('mcp.forms.store');
                Route::put('/forms/{form}', [FormController::class, 'update'])
                    ->middleware('permission:form.update')->name('mcp.forms.update');
                Route::delete('/forms/{form}', [FormController::class, 'destroy'])
                    ->middleware('permission:form.delete')->name('mcp.forms.destroy');
                Route::post('/forms/{form}/fields', [FormFieldController::class, 'store'])
                    ->middleware('permission:form.field.create|form.update|form.create')->name('mcp.form-fields.store');
                Route::put('/form-fields/{field}', [FormFieldController::class, 'update'])
                    ->middleware('permission:form.field.update|form.update')->name('mcp.form-fields.update');
                Route::delete('/form-fields/{field}', [FormFieldController::class, 'destroy'])
                    ->middleware('permission:form.field.delete|form.update|form.create')->name('mcp.form-fields.destroy');
                Route::post('/forms/{form}/submissions', [FormSubmissionController::class, 'store'])
                    ->middleware('permission:form.submission.create|form.view')->name('mcp.form-submissions.store');
                Route::patch('/form-submissions/{submission}/forward', [FormSubmissionController::class, 'forwardToCard'])
                    ->middleware('permission:form.submission.forward|form.submission.assign')->name('mcp.form-submissions.forward');
                Route::post('/form-submissions/{submission}/assign', [AssignmentController::class, 'assign'])
                    ->middleware('permission:form.submission.assign')->name('mcp.form-submissions.assign');
                Route::post('/result-description-templates', [ResultDescriptionTemplateController::class, 'store'])
                    ->middleware('role_or_permission:admin|super_admin|result_template.create|task.update')
                    ->name('mcp.result-templates.store');
                Route::post('/reports/attachments/{attachment}/qc', [ReportController::class, 'submitAttachmentQc'])
                    ->middleware('permission:report.qc')->name('mcp.reports.attachments.qc');

                // User-management controllers apply an additional
                // super-admin and target-account check.
                Route::post('/users', [UserController::class, 'store'])
                    ->middleware('permission:user.create')->name('mcp.users.store');
                Route::put('/users/{user}', [UserController::class, 'update'])
                    ->middleware('permission:user.update')->name('mcp.users.update');
                Route::delete('/users/{user}', [UserController::class, 'destroy'])
                    ->middleware('permission:user.delete')->name('mcp.users.destroy');
                Route::put('/users/{user}/permissions', [UserController::class, 'updatePermissions'])
                    ->middleware('permission:user.permissions.update|user.update')->name('mcp.users.permissions.update');
                Route::put('/users/{user}/password', [UserController::class, 'resetPassword'])
                    ->middleware('permission:user.update')->name('mcp.users.password.update');
            });
        });
    });

// ============================================
// AUTH
// ============================================

Route::prefix('auth')->group(function () {

    Route::post(
        '/login',
        [AuthController::class, 'login']
    )->middleware('throttle:10,1');

    Route::post(
        '/forgot-password',
        [AuthController::class, 'forgotPassword']
    )->middleware('throttle:5,1');

    Route::post(
        '/reset-password',
        [AuthController::class, 'resetPassword']
    )->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {

        Route::post(
            '/logout',
            [AuthController::class, 'logout']
        );

        Route::get(
            '/me',
            [AuthController::class, 'me']
        );

        Route::put('/profile', [AuthController::class, 'updateProfile'])
            ->middleware('permission:account.update');

        Route::put('/password', [AuthController::class, 'updatePassword'])
            ->middleware('permission:account.password.update');

        Route::post('/avatar', [AuthController::class, 'updateAvatar'])
            ->middleware('permission:account.avatar.update');
    });
});

// ============================================
// AUTHENTICATED ROUTES
// ============================================

Route::middleware([
    'auth:sanctum',
])->group(function () {

    // ========================================
    // SEARCH / MENTION
    // ========================================

    Route::middleware('auth:sanctum')
        ->get(
            '/users/mentionable',
            [UserController::class, 'mentionable']
        )->middleware('permission:user.mention|user.view');

    Route::get(
        '/users/assignment-candidates',
        [UserController::class, 'assignmentCandidates']
    )->middleware('permission:user.mention|card.assign|form.submission.assign');

    // ========================================
    // USER MANAGEMENT
    // ========================================

    Route::get('users/{user}/permissions', [UserController::class, 'permissions'])
        ->middleware('permission:user.permissions.view|user.update');
    Route::get('users/{user}/details', [UserController::class, 'details']);
    Route::put('users/{user}/permissions', [UserController::class, 'updatePermissions'])
        ->middleware('permission:user.permissions.update|user.update');
    Route::put('users/{user}/password', [UserController::class, 'resetPassword']);

    Route::apiResource(
        'users',
        UserController::class
    );
    // ->middleware([
    //     'index'   => 'permission:user.view',
    //     'store'   => 'permission:user.create',
    //     'show'    => 'permission:user.view',
    //     'update'  => 'permission:user.update',
    //     'destroy' => 'permission:user.delete',
    // ])

    Route::get(
        'users-stats',
        [UserController::class, 'stats']
    )->middleware('permission:user.stats.view|user.view');

    // ========================================
    // DIVISIONS
    // ========================================

    Route::get(
        'divisions',
        [DivisionController::class, 'index']
    )->middleware('permission:division.view');

    // Division milik user yang login (member biasa maupun admin division).
    // Sengaja TANPA middleware permission:division.view — endpoint ini cuma
    // mengembalikan division milik user sendiri, dipakai sidebar untuk
    // auto-discover division/workspace tanpa perlu permission khusus.
    Route::get(
        'my-divisions',
        [DivisionController::class, 'myDivisions']
    );

    Route::post(
        'divisions',
        [DivisionController::class, 'store']
    )->middleware('permission:division.create');

    // Otorisasi buka SATU division dicek di dalam controller
    // (DivisionController::authorizeDivisionAccess) supaya member biasa
    // tetap bisa buka division-nya sendiri walau tidak punya permission
    // 'division.view' (permission itu tetap dipakai di index() di atas,
    // yang menampilkan SEMUA division).
    Route::get(
        'divisions/{division}',
        [DivisionController::class, 'show']
    );

    // Audit feed division: controller menerapkan akses division/workspace
    // yang sama seperti halaman detail division.
    Route::get(
        'divisions/{division}/activities',
        [ActivityLogController::class, 'divisionActivities']
    );

    Route::put(
        'divisions/{division}',
        [DivisionController::class, 'update']
    )->middleware('permission:division.update');

    Route::delete(
        'divisions/{division}',
        [DivisionController::class, 'destroy']
    )->middleware('permission:division.delete');

    // Sama seperti show() di atas — member biasa boleh lihat daftar
    // member division-nya sendiri, otorisasi dicek di controller.
    Route::get(
        'divisions/{division}/members',
        [DivisionController::class, 'members']
    )->middleware('permission:division.member.view|division.view');

    Route::post(
        'divisions/{division}/members',
        [DivisionController::class, 'addMember']
    )->middleware('permission:division.member.add|division.update');

    Route::put(
        'divisions/{division}/members/{user}',
        [DivisionController::class, 'updateMember']
    )->middleware('permission:division.member.update|division.update');

    Route::delete(
        'divisions/{division}/members/{user}',
        [DivisionController::class, 'removeMember']
    )->middleware('permission:division.member.remove|division.delete');

    // ========================================
    // WORKSPACES
    // ========================================

    Route::get(
        'divisions/{division}/workspaces',
        [WorkspaceController::class, 'index']
    )->middleware('permission:workspace.view');

    Route::post(
        'divisions/{division}/workspaces',
        [WorkspaceController::class, 'store']
    )->middleware('permission:workspace.create');

    Route::get(
        'workspaces/{workspace}',
        [WorkspaceController::class, 'show']
    )->middleware('permission:workspace.view');

    Route::put(
        'workspaces/{workspace}',
        [WorkspaceController::class, 'update']
    )->middleware('permission:workspace.update');

    Route::delete(
        'workspaces/{workspace}',
        [WorkspaceController::class, 'destroy']
    )->middleware('permission:workspace.delete');

    // ========================================
    // CAMPAIGNS
    // ========================================

    Route::get(
        'workspaces/{workspace}/campaigns',
        [CampaignController::class, 'index']
    )->middleware('permission:campaign.view');

    Route::post(
        'workspaces/{workspace}/campaigns',
        [CampaignController::class, 'store']
    )->middleware('permission:campaign.create');

    Route::get(
        'campaigns/{campaign}',
        [CampaignController::class, 'show']
    )->middleware('permission:campaign.view');

    Route::put(
        'campaigns/{campaign}',
        [CampaignController::class, 'update']
    )->middleware('permission:campaign.update');

    Route::delete(
        'campaigns/{campaign}',
        [CampaignController::class, 'destroy']
    )->middleware('permission:campaign.delete');

    Route::get(
        'campaigns/{campaign}/members',
        [CampaignController::class, 'members']
    )->middleware('permission:campaign.member.view|campaign.view');

    Route::post(
        'campaigns/{campaign}/members',
        [CampaignController::class, 'addMember']
    )->middleware('permission:campaign.member.add|campaign.update');

    Route::delete(
        'campaigns/{campaign}/members/{user}',
        [CampaignController::class, 'removeMember']
    )->middleware('permission:campaign.member.remove|campaign.update');

    Route::get(
        'campaigns/{campaign}/gantt',
        [CampaignController::class, 'gantt']
    )->middleware('permission:campaign.gantt.view|campaign.analytics.view');

    Route::get(
        'campaigns/{campaign}/board-progress',
        [CampaignController::class, 'boardProgress']
    )->middleware('permission:campaign.progress.view|campaign.analytics.view');

    Route::get(
        '/campaigns/{campaign}/stats',
        [CampaignController::class, 'stats']
    )->middleware('permission:campaign.stats.view|campaign.analytics.view');

    Route::get(
        '/campaigns/{campaign}/overdue-tasks',
        [CampaignController::class, 'overdueTasks']
    )->middleware('permission:campaign.overdue.view|campaign.analytics.view');

    Route::get(
        '/campaigns/{campaign}/health',
        [CampaignController::class, 'health']
    )->middleware('permission:campaign.health.view|campaign.analytics.view');

    // ========================================
    // BOARDS
    // ========================================

    Route::get(
        'campaigns/{campaign}/boards',
        [BoardController::class, 'index']
    )->middleware('permission:board.view|campaign.view');

    Route::post(
        'campaigns/{campaign}/boards',
        [BoardController::class, 'store']
    )->middleware('permission:board.create|campaign.create');

    Route::put(
        'boards/{board}',
        [BoardController::class, 'update']
    )->middleware('permission:board.update|campaign.update');

    Route::patch(
        'boards/reorder',
        [BoardController::class, 'reorder']
    )->middleware('permission:board.reorder|campaign.update');

    Route::delete(
        'boards/{board}',
        [BoardController::class, 'destroy']
    )->middleware('permission:board.delete|campaign.delete');

    // ========================================
    // CARDS
    // ========================================

    Route::get(
        'boards/{board}/cards',
        [CardController::class, 'index']
    )->middleware('permission:card.view|task.view');

    Route::post(
        'boards/{board}/cards',
        [CardController::class, 'store']
    )->middleware('permission:card.create|task.create');

    Route::get(
        'cards/{card}',
        [CardController::class, 'show']
    )->middleware('permission:card.view|task.view');

    Route::get(
        'cards/{card}/member-candidates',
        [CardController::class, 'memberCandidates']
    )->middleware('permission:card.view|task.view');

    Route::put(
        'cards/{card}',
        [CardController::class, 'update']
    )->middleware('permission:card.update|task.update');

    Route::patch(
        'cards/{card}/move',
        [CardController::class, 'move']
    )->middleware('permission:card.move|task.update');

    Route::patch(
        'cards/reorder',
        [CardController::class, 'reorder']
    )->middleware('permission:card.reorder|task.update');

    Route::delete(
        'cards/{card}',
        [CardController::class, 'destroy']
    )->middleware('permission:card.delete|task.delete');

    Route::get('/daily-todo', [DailyTodoController::class, 'index'])
        ->middleware('permission:my_work.todo.view');
    Route::get(
        '/my-activities',
        [MyActivityController::class, 'index']
    )->middleware('permission:my_work.activities.view');

    Route::get(
        '/my-activities/completion-ranking',
        [MyActivityController::class, 'completionRanking']
    )->middleware('permission:my_work.ranking.view');

    Route::get('/my-activities/attachments', [MyActivityController::class, 'attachments'])
        ->middleware('permission:my_work.attachments.view');

    // ========================================
    // ACTIVITY LOGS
    // ========================================

    Route::get(
        'cards/{card}/activities',
        [ActivityLogController::class, 'cardActivities']
    )->middleware('permission:card.activity.view|task.view');

    // ========================================
    // CARD ASSIGNMENT
    // ========================================

    Route::post(
        'cards/{card}/assign',
        [CardController::class, 'assign']
    )->middleware('permission:card.assign|task.assign');

    Route::delete(
        'cards/{card}/assign/{user}',
        [CardController::class, 'unassign']
    )->middleware('permission:card.unassign|task.assign');

    // ========================================
    // LABELS
    // ========================================

    Route::get('labels', [LabelController::class, 'index'])
        ->middleware('permission:label.view');
    Route::get('labels/{label}', [LabelController::class, 'show'])
        ->middleware('permission:label.view');
    Route::post('labels', [LabelController::class, 'store'])
        ->middleware('permission:label.create');
    Route::put('labels/{label}', [LabelController::class, 'update'])
        ->middleware('permission:label.update');
    Route::delete('labels/{label}', [LabelController::class, 'destroy'])
        ->middleware('permission:label.delete');

    Route::post(
        'cards/{card}/labels',
        [CardLabelController::class, 'attach']
    )->middleware('permission:label.attach');

    Route::delete(
        'cards/{card}/labels/{label}',
        [CardLabelController::class, 'detach']
    )->middleware('permission:label.detach');

    Route::patch(
        'cards/{card}/labels',
        [CardLabelController::class, 'toggle']
    )->middleware('permission:label.toggle');

    // ========================================
    // BRANDS
    // ========================================

    Route::get('brands', [BrandController::class, 'index'])
        ->middleware('permission:brand.view');
    Route::post('brands', [BrandController::class, 'store'])
        ->middleware('permission:brand.create');
    Route::get('brands/{brand}', [BrandController::class, 'show'])
        ->middleware('permission:brand.view');
    Route::put('brands/{brand}', [BrandController::class, 'update'])
        ->middleware('permission:brand.update');
    Route::delete('brands/{brand}', [BrandController::class, 'destroy'])
        ->middleware('permission:brand.delete');

    Route::post(
        'cards/{card}/brands/{brand}/attach',
        [CardBrandController::class, 'attach']
    )->middleware('permission:brand.attach');

    Route::delete(
        'cards/{card}/brands/{brand}/detach',
        [CardBrandController::class, 'detach']
    )->middleware('permission:brand.detach');

    // ========================================
    // ATTACHMENTS
    // ========================================

    Route::get(
        'result-description-templates',
        [ResultDescriptionTemplateController::class, 'index']
    )->middleware('permission:result_template.view|task.view');

    Route::post(
        'result-description-templates',
        [ResultDescriptionTemplateController::class, 'store']
    )->middleware('role_or_permission:admin|super_admin|result_template.create|task.update');

    Route::get(
        'cards/{card}/attachments',
        [CardController::class, 'attachments']
    )->middleware('permission:attachment.view|task.view');

    Route::post(
        'cards/{card}/attachments',
        [CardController::class, 'addAttachment']
    )->middleware('permission:attachment.upload|task.update');

    Route::delete(
        'attachments/{attachment}',
        [CardController::class, 'removeAttachment']
    )->middleware('permission:attachment.delete|task.update');

    Route::post(
        'attachments/{attachment}/archive',
        [CardController::class, 'archiveAttachment']
    )->middleware('permission:attachment.delete|task.update');

    Route::post(
        'attachments/{attachment}/restore',
        [CardController::class, 'restoreAttachment']
    )->middleware('permission:attachment.delete|task.update');

    Route::get(
        'attachments/{attachment}/download',
        [CardController::class, 'download']
    )->middleware('permission:attachment.download|task.view');

    // ========================================
    // BRIEF ATTACHMENTS
    // ========================================

    Route::get(
        'cards/{card}/brief-attachments',
        [CardController::class, 'briefAttachments']
    )->middleware('permission:brief_attachment.view|task.view');

    Route::post(
        'cards/{card}/brief-attachments',
        [CardController::class, 'addBriefAttachment']
    )->middleware('permission:brief_attachment.upload|task.update');

    Route::delete(
        'brief-attachments/{attachment}',
        [CardController::class, 'removeBriefAttachment']
    )->middleware('permission:brief_attachment.delete|task.update');

    Route::get(
        'brief-attachments/{attachment}/download',
        [CardController::class, 'downloadBriefAttachment']
    )->middleware('permission:brief_attachment.download|task.view');

    // ========================================
    // COMMENTS
    // ========================================

    Route::get(
        'cards/{card}/comments',
        [CardController::class, 'comments']
    )->middleware('permission:comment.view|task.view');

    Route::post(
        'cards/{card}/comments',
        [CardController::class, 'addComment']
    )->middleware('permission:comment.create|task.update');

    Route::put(
        'comments/{comment}',
        [CardController::class, 'updateComment']
    )->middleware('permission:comment.update|task.update');

    Route::delete(
        'comments/{comment}',
        [CardController::class, 'deleteComment']
    )->middleware('permission:comment.delete|task.update');

    // ========================================
    // TASKS
    // ========================================

    Route::get(
        'cards/{card}/tasks',
        [TaskController::class, 'index']
    )->middleware('permission:checklist.view|task.view');

    Route::post(
        'cards/{card}/tasks',
        [TaskController::class, 'store']
    )->middleware('permission:checklist.create|task.create');

    Route::put(
        'tasks/{task}',
        [TaskController::class, 'update']
    )->middleware('permission:checklist.update|task.update');

    Route::patch(
        'tasks/{task}/complete',
        [TaskController::class, 'complete']
    )->middleware('permission:checklist.complete|task.update');

    Route::patch(
        'tasks/reorder',
        [TaskController::class, 'reorder']
    )->middleware('permission:checklist.reorder|task.update');

    Route::delete(
        'tasks/{task}',
        [TaskController::class, 'destroy']
    )->middleware('permission:checklist.delete|task.delete');

    // ========================================
    // SUBTASKS
    // ========================================

    Route::get(
        'tasks/{task}/subtasks',
        [TaskController::class, 'subtasks']
    )->middleware('permission:subtask.view|task.view');

    Route::post(
        'tasks/{task}/subtasks',
        [TaskController::class, 'storeSubtask']
    )->middleware('permission:subtask.create|task.update');

    Route::put(
        'subtasks/{subtask}',
        [TaskController::class, 'updateSubtask']
    )->middleware('permission:subtask.update|task.update');

    Route::patch(
        'subtasks/{subtask}/complete',
        [TaskController::class, 'completeSubtask']
    )->middleware('permission:subtask.complete|task.update');

    Route::delete(
        'subtasks/{subtask}',
        [TaskController::class, 'destroySubtask']
    )->middleware('permission:subtask.delete|task.update');

    // ========================================
    // CHAT
    // ========================================

    Route::get(
        'chat/rooms',
        [ChatController::class, 'rooms']
    )->middleware('permission:chat.view');

    Route::post(
        'chat/rooms/dm',
        [ChatController::class, 'createDm']
    )->middleware('permission:chat.room.create');

    Route::get(
        'chat/rooms/{chatRoom}',
        [ChatController::class, 'show']
    )->middleware('permission:chat.view');

    Route::get(
        'chat/rooms/{chatRoom}/messages',
        [ChatController::class, 'messages']
    )->middleware('permission:chat.message.view');

    Route::post(
        'chat/rooms/{chatRoom}/messages',
        [ChatController::class, 'sendMessage']
    )->middleware('permission:chat.message.create');

    Route::delete(
        'chat/messages/{message}',
        [ChatController::class, 'deleteMessage']
    )->middleware('permission:chat.message.delete');

    Route::post(
        'chat/rooms/{chatRoom}/read',
        [ChatController::class, 'markRead']
    )->middleware('permission:chat.read');

    Route::get('/calendar', [CalendarController::class, 'index'])
        ->middleware('permission:calendar.view');

    Route::get('/calendar/create-options', [CalendarController::class, 'createOptions'])
        ->middleware('permission:card.create');

    Route::get('/calendar/{date}', [CalendarController::class, 'show'])
        ->middleware('permission:calendar.detail.view|calendar.view');

    // ========================================
    // NOTIFICATIONS
    // ========================================

    Route::get(
        'notifications',
        [NotificationController::class, 'index']
    )->middleware('permission:notification.view');

    Route::patch(
        'notifications/read-all',
        [NotificationController::class, 'markAllRead']
    )->middleware('permission:notification.read_all');

    Route::patch(
        'notifications/{notification}/read',
        [NotificationController::class, 'markRead']
    )->middleware('permission:notification.read');

    Route::delete(
        'notifications/{notification}',
        [NotificationController::class, 'destroy']
    )->middleware('permission:notification.delete');

    // ========================================
    // FORMS
    // ========================================

    Route::get(
        'forms',
        [FormController::class, 'index']
    )->middleware('permission:form.view');

    Route::post(
        'forms',
        [FormController::class, 'store']
    )->middleware('permission:form.create');

    Route::get(
        'forms/{form}',
        [FormController::class, 'show']
    )->middleware('permission:form.view');

    Route::put(
        'forms/{form}',
        [FormController::class, 'update']
    )->middleware('permission:form.update');

    Route::delete(
        'forms/{form}',
        [FormController::class, 'destroy']
    )->middleware('permission:form.delete');

    // ========================================
    // FORM FIELDS
    // ========================================

    Route::post(
        'forms/{form}/fields',
        [FormFieldController::class, 'store']
    )->middleware('permission:form.field.create|form.update|form.create');

    Route::put(
        'form-fields/{field}',
        [FormFieldController::class, 'update']
    )->middleware('permission:form.field.update|form.update');

    Route::delete(
        'form-fields/{field}',
        [FormFieldController::class, 'destroy']
    )->middleware('permission:form.field.delete|form.update|form.create');

    // ========================================
    // FORM SUBMISSIONS
    // ========================================

    Route::get(
        'forms/{form}/submissions',
        [FormSubmissionController::class, 'index']
    )->middleware('permission:form.responses.view');

    Route::post(
        'forms/{form}/submissions',
        [FormSubmissionController::class, 'store']
    )->middleware('permission:form.submission.create|form.view');

    Route::get(
        'form-submissions/{submission}',
        [FormSubmissionController::class, 'show']
    )->middleware('permission:form.responses.view');

    Route::patch(
        'form-submissions/{submission}/forward',
        [FormSubmissionController::class, 'forwardToCard']
    )->middleware('permission:form.submission.forward|form.submission.assign');

    // ========================================
    // ASSIGNMENT
    // ========================================

    Route::post(
        'form-submissions/{submission}/assign',
        [AssignmentController::class, 'assign']
    )->middleware('permission:form.submission.assign');

    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('permission:dashboard.view');
    Route::get('/dashboard/division-rankings', [DashboardController::class, 'divisionRankings'])
        ->middleware('permission:dashboard.division_ranking.view');

    Route::get('/dashboard/activities', [DashboardController::class, 'activities'])
        ->middleware('permission:dashboard.activities.view');
    Route::get('/my-activities/export', [MyActivityController::class, 'export'])
        ->middleware('permission:my_work.export');

    // ========================================
    // REPORTS & QC MANAGEMENT
    // ========================================
    Route::prefix('reports')->group(function () {
        Route::get('/filters-options', [ReportController::class, 'getFilterOptions'])
            ->middleware('permission:report.view');
        Route::get('/users', [ReportController::class, 'index'])
            ->middleware('permission:report.view');
        Route::get('/users/{user}/cards', [ReportController::class, 'showUserCards'])
            ->middleware('permission:report.view');
        Route::post('/attachments/{attachment}/qc', [ReportController::class, 'submitAttachmentQc'])
            ->middleware('permission:report.qc');
        Route::get('/export/excel', [ReportController::class, 'exportExcel'])
            ->middleware('permission:report.export.excel|report.export');
        Route::get('/export/pdf', [ReportController::class, 'exportPdf'])
            ->middleware('permission:report.export.pdf|report.export');
        Route::get('/preview/pdf', [ReportController::class, 'previewPdf'])
            ->middleware('permission:report.preview.pdf|report.preview');
        Route::get('/users/{user}/activity-logs', [ReportController::class, 'getUserActivityLogs'])
            ->middleware('permission:report.activity.view');
    });

    Route::post(
        '/auth/bypass/{user}',
        [AuthController::class, 'bypass']
    )->middleware('permission:user.bypass');
}); // Ini adalah kurung penutup dari block besar Route::middleware(['auth:sanctum'])->group(function () ...
