<?php

use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Permintaan produk: nama role ditukar.
     *
     *  - `manager` kini peran penuh (termasuk report) — dulu bernama `admin`.
     *  - `admin`  kini peran tanpa report        — dulu bernama `manager`.
     *
     * Karena `model_has_roles` menyimpan role_id, user existing otomatis
     * berpindah nama TANPA berubah hak aksesnya. Hanya `roles.name` yang
     * ditukar, plus sinkronisasi permission memakai katalog terbaru supaya
     * benar walau seeder tidak dijalankan.
     *
     * CATATAN: `division_user.role` (admin/member) adalah konsep berbeda dan
     * SENGAJA tidak disentuh.
     */
    public function up(): void
    {
        $this->swapRoleNames('admin', 'manager');
        $this->syncRolePermissions();
    }

    public function down(): void
    {
        // Kebalikan dari up(): tukar nama kembali. Jalankan bersama revert kode
        // agar definisi permission di katalog ikut kembali.
        $this->swapRoleNames('admin', 'manager');
        $this->syncRolePermissions();
    }

    private function swapRoleNames(string $a, string $b): void
    {
        $roleA = DB::table('roles')->where('name', $a)->where('guard_name', 'web')->first();
        $roleB = DB::table('roles')->where('name', $b)->where('guard_name', 'web')->first();

        if (! $roleA && ! $roleB) {
            // Fresh install sebelum seeder: tidak ada yang perlu ditukar.
            return;
        }

        if ($roleA && ! $roleB) {
            DB::table('roles')->where('id', $roleA->id)->update(['name' => $b]);

            return;
        }

        if (! $roleA && $roleB) {
            DB::table('roles')->where('id', $roleB->id)->update(['name' => $a]);

            return;
        }

        // Keduanya ada: tukar lewat nama sementara agar tidak bentrok unique.
        $temporary = '__swap_'.$a.'_'.substr(md5((string) microtime(true)), 0, 8);

        DB::table('roles')->where('id', $roleA->id)->update(['name' => $temporary]);
        DB::table('roles')->where('id', $roleB->id)->update(['name' => $a]);
        DB::table('roles')->where('name', $temporary)->update(['name' => $b]);
    }

    private function syncRolePermissions(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        foreach (PermissionCatalog::names() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        // Pastikan KEDUA role ada, termasuk saat migrasi ini jalan di data
        // lama yang belum pernah punya role `manager`.
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

        $admin->syncPermissions(PermissionCatalog::adminPermissions());
        $manager->syncPermissions(PermissionCatalog::managerPermissions());

        $registrar->forgetCachedPermissions();
    }
};
