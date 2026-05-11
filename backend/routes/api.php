<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\CardController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DivisionController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WorkspaceController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CardBrandController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\CardLabelController;
use Illuminate\Support\Facades\Route;


Route::get('/ping', function () {
    return response()->json([
        'message' => 'Backend OK',
        'time' => now()
    ]);
});


// Auth
Route::prefix('auth')->group(function () {
    Route::post('/login',   [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout',   [AuthController::class, 'logout']);
        Route::get('/me',        [AuthController::class, 'me']);
        Route::put('/profile',   [AuthController::class, 'updateProfile']);
        Route::put('/password',  [AuthController::class, 'updatePassword']);
    });
});

Route::middleware('auth:sanctum')->group(function () {

    // Users (Super Admin)
    Route::apiResource('users', UserController::class);

    // Divisions (Super Admin)
    Route::apiResource('divisions', DivisionController::class);
    Route::get('divisions/{division}/members',              [DivisionController::class, 'members']);
    Route::post('divisions/{division}/members',             [DivisionController::class, 'addMember']);
    Route::put('divisions/{division}/members/{user}',       [DivisionController::class, 'updateMember']);
    Route::delete('divisions/{division}/members/{user}',    [DivisionController::class, 'removeMember']);

    // Workspaces
    Route::get('divisions/{division}/workspaces',           [WorkspaceController::class, 'index']);
    Route::post('divisions/{division}/workspaces',          [WorkspaceController::class, 'store']);
    Route::get('workspaces/{workspace}',                    [WorkspaceController::class, 'show']);
    Route::put('workspaces/{workspace}',                    [WorkspaceController::class, 'update']);
    Route::delete('workspaces/{workspace}',                 [WorkspaceController::class, 'destroy']);

    // Campaigns
    Route::get('workspaces/{workspace}/campaigns',          [CampaignController::class, 'index']);
    Route::post('workspaces/{workspace}/campaigns',         [CampaignController::class, 'store']);
    Route::get('campaigns/{campaign}',                      [CampaignController::class, 'show']);
    Route::put('campaigns/{campaign}',                      [CampaignController::class, 'update']);
    Route::delete('campaigns/{campaign}',                   [CampaignController::class, 'destroy']);
    Route::get('campaigns/{campaign}/members',              [CampaignController::class, 'members']);
    Route::post('campaigns/{campaign}/members',             [CampaignController::class, 'addMember']);
    Route::delete('campaigns/{campaign}/members/{user}',    [CampaignController::class, 'removeMember']);

    // Boards
    Route::get('campaigns/{campaign}/boards',               [BoardController::class, 'index']);
    Route::post('campaigns/{campaign}/boards',              [BoardController::class, 'store']);
    Route::put('boards/{board}',                            [BoardController::class, 'update']);
    Route::patch('boards/reorder',                          [BoardController::class, 'reorder']);
    Route::delete('boards/{board}',                         [BoardController::class, 'destroy']);

    // Cards
    Route::get('boards/{board}/cards',                      [CardController::class, 'index']);
    Route::post('boards/{board}/cards',                     [CardController::class, 'store']);
    Route::get('cards/{card}',                              [CardController::class, 'show']);
    Route::put('cards/{card}',                              [CardController::class, 'update']);
    Route::patch('cards/{card}/move',                       [CardController::class, 'move']);
    Route::patch('cards/reorder',                           [CardController::class, 'reorder']);
    Route::delete('cards/{card}',                           [CardController::class, 'destroy']);

    // Card - Assignee
    Route::post('cards/{card}/assign',                      [CardController::class, 'assign']);
    Route::delete('cards/{card}/assign/{user}',             [CardController::class, 'unassign']);

    // Card - Labels
    // Labels CRUD
    Route::apiResource(
        'labels',
        LabelController::class
    );
    Route::post('cards/{card}/labels',                      [CardLabelController::class, 'attach']);
    Route::delete('cards/{card}/labels/{label}',            [CardLabelController::class, 'detach']);
    Route::patch('cards/{card}/labels',                     [CardLabelController::class, 'toggle']);

    // Card - Brands
    Route::apiResource('brands', BrandController::class);
    Route::post('cards/{card}/brands/{brand}/attach', [CardBrandController::class, 'attach']);
    Route::delete('cards/{card}/brands/{brand}/detach', [CardBrandController::class, 'detach']);

    // Card - Attachments
    Route::get('cards/{card}/attachments',                  [CardController::class, 'attachments']);
    Route::post('cards/{card}/attachments',                 [CardController::class, 'addAttachment']);
    Route::delete('attachments/{attachment}',               [CardController::class, 'removeAttachment']);

    // Card - Comments
    Route::get('cards/{card}/comments',                     [CardController::class, 'comments']);
    Route::post('cards/{card}/comments',                    [CardController::class, 'addComment']);
    Route::put('comments/{comment}',                        [CardController::class, 'updateComment']);
    Route::delete('comments/{comment}',                     [CardController::class, 'deleteComment']);

    // Tasks
    Route::get('cards/{card}/tasks',                        [TaskController::class, 'index']);
    Route::post('cards/{card}/tasks',                       [TaskController::class, 'store']);
    Route::put('tasks/{task}',                              [TaskController::class, 'update']);
    Route::patch('tasks/{task}/complete',                   [TaskController::class, 'complete']);
    Route::patch('tasks/reorder',                           [TaskController::class, 'reorder']);
    Route::delete('tasks/{task}',                           [TaskController::class, 'destroy']);

    // Subtasks
    Route::get('tasks/{task}/subtasks',                     [TaskController::class, 'subtasks']);
    Route::post('tasks/{task}/subtasks',                    [TaskController::class, 'storeSubtask']);
    Route::put('subtasks/{subtask}',                        [TaskController::class, 'updateSubtask']);
    Route::patch('subtasks/{subtask}/complete',             [TaskController::class, 'completeSubtask']);
    Route::delete('subtasks/{subtask}',                     [TaskController::class, 'destroySubtask']);

    // Chat
    Route::get('chat/rooms',                                [ChatController::class, 'rooms']);
    Route::post('chat/rooms/dm',                            [ChatController::class, 'createDm']);
    Route::get('chat/rooms/{chatRoom}',                     [ChatController::class, 'show']);
    Route::get('chat/rooms/{chatRoom}/messages',            [ChatController::class, 'messages']);
    Route::post('chat/rooms/{chatRoom}/messages',           [ChatController::class, 'sendMessage']);
    Route::delete('chat/messages/{message}',                [ChatController::class, 'deleteMessage']);
    Route::post('chat/rooms/{chatRoom}/read',               [ChatController::class, 'markRead']);

    // Notifications
    Route::get('notifications',                             [NotificationController::class, 'index']);
    Route::patch('notifications/{notification}/read',       [NotificationController::class, 'markRead']);
    Route::patch('notifications/read-all',                  [NotificationController::class, 'markAllRead']);
    Route::delete('notifications/{notification}',           [NotificationController::class, 'destroy']);
});
