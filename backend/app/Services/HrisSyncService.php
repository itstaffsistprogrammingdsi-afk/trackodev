<?php

namespace App\Services;

use App\Models\User;
use App\Models\HrisUser;

class HrisSyncService
{
    public function syncToPM(HrisUser $hris)
    {
        $pm = User::where(
            'hris_id',
            $hris->id
        )->first();

        // =====================================
        // CREATE USER
        // =====================================

        if (!$pm) {

            $user = User::create([

                'hris_id' => $hris->id,

                'name' => $hris->name,

                'email' => $hris->email,

                'password' => $hris->password,

                'avatar' => $hris->avatar,

                'role' => 'user',

                'hris_updated_at' => $hris->updated_at,
            ]);

            // =====================================
            // SPATIE ROLE SAFE
            // =====================================

            // ADDED
            // supaya tidak bikin sync gagal
            try {

                if (method_exists($user, 'assignRole')) {

                    $user->assignRole('user');

                }

            } catch (\Exception $e) {

                // skip kalau role belum siap
                logger()->warning($e->getMessage());

            }

            return $user;
        }

        // =====================================
        // SKIP JIKA TIDAK BERUBAH
        // =====================================

        if (
            $pm->hris_updated_at ==
            $hris->updated_at
        ) {
            return $pm;
        }

        // =====================================
        // UPDATE USER
        // =====================================

        $pm->updateQuietly([

            'name' => $hris->name,

            'email' => $hris->email,

            'password' => $hris->password,

            'avatar' => $hris->avatar,

            'hris_updated_at' => $hris->updated_at,
        ]);

        // =====================================
        // SYNC ROLE SAFE
        // =====================================

        // ADDED
        try {

            if (
                method_exists($pm, 'assignRole') &&
                !$pm->hasAnyRole([
                    'super_admin',
                    'admin',
                    'user'
                ])
            ) {

                $pm->assignRole(
                    $pm->role ?? 'user'
                );
            }

        } catch (\Exception $e) {

            logger()->warning($e->getMessage());

        }

        return $pm;
    }
}