<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;

use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DivisionController;
use App\Http\Controllers\Api\WorkspaceController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\CardController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\CardLabelController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CardBrandController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\FormFieldController;
use App\Http\Controllers\Api\FormSubmissionController;
use App\Http\Controllers\Api\PublicFormController;
use App\Http\Controllers\Api\AssignmentController;

// ============================================
// HEALTH CHECK
// ============================================

Route::get('/ping', function () {

    return response()->json([

        'message' => 'Backend OK',

        'time' => now(),
    ]);
});

// ============================================
// AUTH
// ============================================

Route::prefix('auth')->group(function () {

    Route::post(
        '/login',
        [AuthController::class, 'login']
    );

    Route::middleware('auth:sanctum')->group(function () {

        Route::post(
            '/logout',
            [AuthController::class, 'logout']
        );

        Route::get(
            '/me',
            [AuthController::class, 'me']
        );

        Route::put(
            '/profile',
            [AuthController::class, 'updateProfile']
        );

        Route::put(
            '/password',
            [AuthController::class, 'updatePassword']
        );
    });
});

// ============================================
// AUTHENTICATED ROUTES
// ============================================

Route::middleware([
    'auth:sanctum',
])->group(function () {

    // ========================================
    // USER MANAGEMENT
    // ========================================

    Route::apiResource(
        'users',
        UserController::class
    )->middleware([
        'index'   => 'permission:user.view',
        'store'   => 'permission:user.create',
        'show'    => 'permission:user.view',
        'update'  => 'permission:user.update',
        'destroy' => 'permission:user.delete',
    ]);

    Route::get(
        'users-stats',
        [UserController::class, 'stats']
    )->middleware('permission:user.view');

    // ========================================
    // DIVISIONS
    // ========================================

    Route::get(
        'divisions',
        [DivisionController::class, 'index']
    )->middleware('permission:division.view');

    Route::post(
        'divisions',
        [DivisionController::class, 'store']
    )->middleware('permission:division.create');

    Route::get(
        'divisions/{division}',
        [DivisionController::class, 'show']
    )->middleware('permission:division.view');

    Route::put(
        'divisions/{division}',
        [DivisionController::class, 'update']
    )->middleware('permission:division.update');

    Route::delete(
        'divisions/{division}',
        [DivisionController::class, 'destroy']
    )->middleware('permission:division.delete');

    Route::get(
        'divisions/{division}/members',
        [DivisionController::class, 'members']
    )->middleware('permission:division.view');

    Route::post(
        'divisions/{division}/members',
        [DivisionController::class, 'addMember']
    )->middleware('permission:division.update');

    Route::put(
        'divisions/{division}/members/{user}',
        [DivisionController::class, 'updateMember']
    )->middleware('permission:division.update');

    Route::delete(
        'divisions/{division}/members/{user}',
        [DivisionController::class, 'removeMember']
    )->middleware('permission:division.delete');

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
    )->middleware('permission:campaign.view');

    Route::post(
        'campaigns/{campaign}/members',
        [CampaignController::class, 'addMember']
    )->middleware('permission:campaign.update');

    Route::delete(
        'campaigns/{campaign}/members/{user}',
        [CampaignController::class, 'removeMember']
    )->middleware('permission:campaign.update');

    // ========================================
    // BOARDS
    // ========================================

    Route::get(
        'campaigns/{campaign}/boards',
        [BoardController::class, 'index']
    )->middleware('permission:campaign.view');

    Route::post(
        'campaigns/{campaign}/boards',
        [BoardController::class, 'store']
    )->middleware('permission:campaign.create');

    Route::put(
        'boards/{board}',
        [BoardController::class, 'update']
    )->middleware('permission:campaign.update');

    Route::patch(
        'boards/reorder',
        [BoardController::class, 'reorder']
    )->middleware('permission:campaign.update');

    Route::delete(
        'boards/{board}',
        [BoardController::class, 'destroy']
    )->middleware('permission:campaign.delete');

    // ========================================
    // CARDS
    // ========================================

    Route::get(
        'boards/{board}/cards',
        [CardController::class, 'index']
    )->middleware('permission:task.view');

    Route::post(
        'boards/{board}/cards',
        [CardController::class, 'store']
    )->middleware('permission:task.create');

    Route::get(
        'cards/{card}',
        [CardController::class, 'show']
    )->middleware('permission:task.view');

    Route::put(
        'cards/{card}',
        [CardController::class, 'update']
    )->middleware('permission:task.update');

    Route::patch(
        'cards/{card}/move',
        [CardController::class, 'move']
    )->middleware('permission:task.update');

    Route::patch(
        'cards/reorder',
        [CardController::class, 'reorder']
    )->middleware('permission:task.update');

    Route::delete(
        'cards/{card}',
        [CardController::class, 'destroy']
    )->middleware('permission:task.delete');

    // ========================================
    // CARD ASSIGNMENT
    // ========================================

    Route::post(
        'cards/{card}/assign',
        [CardController::class, 'assign']
    )->middleware('permission:task.assign');

    Route::delete(
        'cards/{card}/assign/{user}',
        [CardController::class, 'unassign']
    )->middleware('permission:task.assign');

    // ========================================
    // LABELS
    // ========================================

    Route::apiResource(
        'labels',
        LabelController::class
    );

    Route::post(
        'cards/{card}/labels',
        [CardLabelController::class, 'attach']
    )->middleware('permission:task.update');

    Route::delete(
        'cards/{card}/labels/{label}',
        [CardLabelController::class, 'detach']
    )->middleware('permission:task.update');

    Route::patch(
        'cards/{card}/labels',
        [CardLabelController::class, 'toggle']
    )->middleware('permission:task.update');

    // ========================================
    // BRANDS
    // ========================================

    Route::apiResource(
        'brands',
        BrandController::class
    );

    Route::post(
        'cards/{card}/brands/{brand}/attach',
        [CardBrandController::class, 'attach']
    )->middleware('permission:task.update');

    Route::delete(
        'cards/{card}/brands/{brand}/detach',
        [CardBrandController::class, 'detach']
    )->middleware('permission:task.update');

    // ========================================
    // ATTACHMENTS
    // ========================================

    Route::get(
        'cards/{card}/attachments',
        [CardController::class, 'attachments']
    )->middleware('permission:task.view');

    Route::post(
        'cards/{card}/attachments',
        [CardController::class, 'addAttachment']
    )->middleware('permission:task.update');

    Route::delete(
        'attachments/{attachment}',
        [CardController::class, 'removeAttachment']
    )->middleware('permission:task.update');

    Route::get(
        'attachments/{attachment}/download',
        [CardController::class, 'download']
    )->middleware('permission:task.view');

    // ========================================
    // COMMENTS
    // ========================================

    Route::get(
        'cards/{card}/comments',
        [CardController::class, 'comments']
    )->middleware('permission:task.view');

    Route::post(
        'cards/{card}/comments',
        [CardController::class, 'addComment']
    )->middleware('permission:task.update');

    Route::put(
        'comments/{comment}',
        [CardController::class, 'updateComment']
    )->middleware('permission:task.update');

    Route::delete(
        'comments/{comment}',
        [CardController::class, 'deleteComment']
    )->middleware('permission:task.update');

    // ========================================
    // TASKS
    // ========================================

    Route::get(
        'cards/{card}/tasks',
        [TaskController::class, 'index']
    )->middleware('permission:task.view');

    Route::post(
        'cards/{card}/tasks',
        [TaskController::class, 'store']
    )->middleware('permission:task.create');

    Route::put(
        'tasks/{task}',
        [TaskController::class, 'update']
    )->middleware('permission:task.update');

    Route::patch(
        'tasks/{task}/complete',
        [TaskController::class, 'complete']
    )->middleware('permission:task.update');

    Route::patch(
        'tasks/reorder',
        [TaskController::class, 'reorder']
    )->middleware('permission:task.update');

    Route::delete(
        'tasks/{task}',
        [TaskController::class, 'destroy']
    )->middleware('permission:task.delete');

    // ========================================
    // SUBTASKS
    // ========================================

    Route::get(
        'tasks/{task}/subtasks',
        [TaskController::class, 'subtasks']
    )->middleware('permission:task.view');

    Route::post(
        'tasks/{task}/subtasks',
        [TaskController::class, 'storeSubtask']
    )->middleware('permission:task.update');

    Route::put(
        'subtasks/{subtask}',
        [TaskController::class, 'updateSubtask']
    )->middleware('permission:task.update');

    Route::patch(
        'subtasks/{subtask}/complete',
        [TaskController::class, 'completeSubtask']
    )->middleware('permission:task.update');

    Route::delete(
        'subtasks/{subtask}',
        [TaskController::class, 'destroySubtask']
    )->middleware('permission:task.update');

    // ========================================
    // CHAT
    // ========================================

    Route::get(
        'chat/rooms',
        [ChatController::class, 'rooms']
    );

    Route::post(
        'chat/rooms/dm',
        [ChatController::class, 'createDm']
    );

    Route::get(
        'chat/rooms/{chatRoom}',
        [ChatController::class, 'show']
    );

    Route::get(
        'chat/rooms/{chatRoom}/messages',
        [ChatController::class, 'messages']
    );

    Route::post(
        'chat/rooms/{chatRoom}/messages',
        [ChatController::class, 'sendMessage']
    );

    Route::delete(
        'chat/messages/{message}',
        [ChatController::class, 'deleteMessage']
    );

    Route::post(
        'chat/rooms/{chatRoom}/read',
        [ChatController::class, 'markRead']
    );

    // ========================================
    // NOTIFICATIONS
    // ========================================

    Route::get(
        'notifications',
        [NotificationController::class, 'index']
    );

    Route::patch(
        'notifications/{notification}/read',
        [NotificationController::class, 'markRead']
    );

    Route::patch(
        'notifications/read-all',
        [NotificationController::class, 'markAllRead']
    );

    Route::delete(
        'notifications/{notification}',
        [NotificationController::class, 'destroy']
    );

    // ========================================
    // FORMS
    // ========================================

    Route::get(
        'forms',
        [FormController::class, 'index']
    );

    Route::post(
        'forms',
        [FormController::class, 'store']
    );

    Route::get(
        'forms/{form}',
        [FormController::class, 'show']
    );

    Route::put(
        'forms/{form}',
        [FormController::class, 'update']
    );

    Route::delete(
        'forms/{form}',
        [FormController::class, 'destroy']
    );

    // ========================================
    // FORM FIELDS
    // ========================================

    Route::post(
        'forms/{form}/fields',
        [FormFieldController::class, 'store']
    );

    Route::put(
        'form-fields/{field}',
        [FormFieldController::class, 'update']
    );

    Route::delete(
        'form-fields/{field}',
        [FormFieldController::class, 'destroy']
    );

    // ========================================
    // FORM SUBMISSIONS
    // ========================================

    Route::get(
        'forms/{form}/submissions',
        [FormSubmissionController::class, 'index']
    );

    Route::post(
        'forms/{form}/submissions',
        [FormSubmissionController::class, 'store']
    );

    Route::get(
        'form-submissions/{submission}',
        [FormSubmissionController::class, 'show']
    );

    Route::patch(
        'form-submissions/{submission}/forward',
        [FormSubmissionController::class, 'forwardToCard']
    );

    // ========================================
    // ASSIGNMENT
    // ========================================

    Route::post(
        'responses/{submission}/assign',
        [AssignmentController::class, 'assign']
    )->middleware('permission:task.assign');
});

// ============================================
// PUBLIC FORMS
// ============================================

Route::get(
    '/public/forms/{slug}',
    [PublicFormController::class, 'show']
);

Route::post(
    '/public/forms/{slug}/submit',
    [PublicFormController::class, 'submit']
);
