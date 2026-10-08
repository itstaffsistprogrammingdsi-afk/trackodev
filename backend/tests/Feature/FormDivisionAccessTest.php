<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\Form;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FormDivisionAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_manager_and_admin_see_all_forms_in_their_division(): void
    {
        $division = $this->createDivision('Divisi Form A');
        $manager = $this->userInDivision('Manager Form', User::ROLE_MANAGER, $division);
        $admin = $this->userInDivision('Admin Form', User::ROLE_ADMIN, $division);

        // Form dibuat dari Form Builder: tanpa workspace, mengikuti divisi pembuat.
        $managerForm = $this->createForm($manager, 'Form Buatan Manager');
        $adminForm = $this->createForm($admin, 'Form Buatan Admin');

        // Inilah kasus yang diperbaiki: manager melihat form buatan admin.
        Sanctum::actingAs($manager);
        $managerList = $this->getJson('/api/forms')->assertOk()->json();
        $managerIds = collect($managerList)->pluck('id');
        $this->assertContains($managerForm->id, $managerIds);
        $this->assertContains($adminForm->id, $managerIds);
        $this->getJson('/api/forms/'.$adminForm->id)->assertOk();

        // Admin sebaliknya juga melihat form buatan manager.
        Sanctum::actingAs($admin);
        $adminIds = collect($this->getJson('/api/forms')->assertOk()->json())->pluck('id');
        $this->assertContains($managerForm->id, $adminIds);
        $this->assertContains($adminForm->id, $adminIds);
    }

    public function test_manager_cannot_see_forms_outside_their_division(): void
    {
        $divisionA = $this->createDivision('Divisi Form A');
        $divisionB = $this->createDivision('Divisi Form B');

        $managerA = $this->userInDivision('Manager A', User::ROLE_MANAGER, $divisionA);
        $adminB = $this->userInDivision('Admin B', User::ROLE_ADMIN, $divisionB);

        $formDivB = $this->createForm($adminB, 'Form Divisi B');

        $workspaceB = Workspace::create([
            'division_id' => $divisionB->id,
            'name' => 'Workspace Divisi B',
        ]);
        $workspaceFormB = $this->createForm($adminB, 'Form Workspace B', $workspaceB);

        Sanctum::actingAs($managerA);
        $ids = collect($this->getJson('/api/forms')->assertOk()->json())->pluck('id');

        $this->assertNotContains($formDivB->id, $ids);
        $this->assertNotContains($workspaceFormB->id, $ids);
        $this->getJson('/api/forms/'.$formDivB->id)->assertForbidden();
        $this->getJson('/api/forms/'.$workspaceFormB->id)->assertForbidden();
    }

    public function test_manager_can_fully_manage_division_form_created_by_admin(): void
    {
        $division = $this->createDivision('Divisi Form Kelola');
        $manager = $this->userInDivision('Manager Kelola', User::ROLE_MANAGER, $division);
        $admin = $this->userInDivision('Admin Kelola', User::ROLE_ADMIN, $division);

        $form = $this->createForm($admin, 'Form Dikelola Bersama');

        Sanctum::actingAs($manager);

        $this->putJson('/api/forms/'.$form->id, [
            'description' => 'Diubah manager satu divisi.',
        ])->assertOk();

        $this->postJson('/api/forms/'.$form->id.'/fields', [
            'label' => 'Field Baru',
            'type' => 'text',
        ])->assertCreated();
    }

    public function test_super_admin_sees_all_forms(): void
    {
        $divisionA = $this->createDivision('Divisi SA A');
        $divisionB = $this->createDivision('Divisi SA B');
        $superAdmin = $this->userInDivision('Super Admin Form', User::ROLE_SUPER_ADMIN, $divisionA);
        $adminA = $this->userInDivision('Admin SA A', User::ROLE_ADMIN, $divisionA);
        $adminB = $this->userInDivision('Admin SA B', User::ROLE_ADMIN, $divisionB);

        $formA = $this->createForm($adminA, 'Form SA A');
        $formB = $this->createForm($adminB, 'Form SA B');
        $globalForm = $this->createForm($superAdmin, 'Form Global Tanpa Divisi');

        Sanctum::actingAs($superAdmin);
        $ids = collect($this->getJson('/api/forms')->assertOk()->json())->pluck('id');

        $this->assertContains($formA->id, $ids);
        $this->assertContains($formB->id, $ids);
        $this->assertContains($globalForm->id, $ids);
    }

    public function test_plain_user_without_form_permission_cannot_access_forms(): void
    {
        $division = $this->createDivision('Divisi User Biasa');
        $user = $this->userInDivision('User Biasa', User::ROLE_USER, $division);
        $admin = $this->userInDivision('Admin Divisi', User::ROLE_ADMIN, $division);

        $form = $this->createForm($admin, 'Form Divisi');

        Sanctum::actingAs($user);

        $this->getJson('/api/forms')->assertForbidden();
        $this->getJson('/api/forms/'.$form->id)->assertForbidden();
    }

    public function test_user_with_explicit_form_view_only_sees_own_forms(): void
    {
        $division = $this->createDivision('Divisi User Form');
        $user = $this->userInDivision('User Form', User::ROLE_USER, $division);
        $admin = $this->userInDivision('Admin Form User', User::ROLE_ADMIN, $division);

        $user->givePermissionTo(['form.view', 'form.create']);

        $ownForm = $this->createForm($user, 'Form Milik User');
        $adminForm = $this->createForm($admin, 'Form Admin Divisi');

        Sanctum::actingAs($user);
        $ids = collect($this->getJson('/api/forms')->assertOk()->json())->pluck('id');

        $this->assertContains($ownForm->id, $ids);
        $this->assertNotContains($adminForm->id, $ids);
        $this->getJson('/api/forms/'.$adminForm->id)->assertForbidden();
    }

    public function test_super_admin_form_without_division_is_hidden_from_managers(): void
    {
        $division = $this->createDivision('Divisi Form Global');
        $manager = $this->userInDivision('Manager Global', User::ROLE_MANAGER, $division);
        $superAdmin = User::factory()->create(['name' => 'Root Form']);
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);

        $globalForm = $this->createForm($superAdmin, 'Form UAT Global');

        Sanctum::actingAs($manager);
        $ids = collect($this->getJson('/api/forms')->assertOk()->json())->pluck('id');

        $this->assertNotContains($globalForm->id, $ids);
        $this->getJson('/api/forms/'.$globalForm->id)->assertForbidden();
    }

    private function userInDivision(string $name, string $role, Division $division): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole($role);
        $division->users()->attach($user->id, ['role' => 'member']);

        return $user;
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }

    private function createForm(User $creator, string $name, ?Workspace $workspace = null): Form
    {
        return Form::create([
            'workspace_id' => $workspace?->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'created_by' => $creator->id,
            'is_active' => true,
        ]);
    }
}
