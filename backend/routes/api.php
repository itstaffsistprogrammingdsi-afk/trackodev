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
