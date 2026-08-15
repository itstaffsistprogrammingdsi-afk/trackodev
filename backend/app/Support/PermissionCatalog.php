<?php

namespace App\Support;

final class PermissionCatalog
{
    public static function modules(): array
    {
        return [
            'user' => self::module('Manajemen User', 'Kelola akun, role, impersonasi, dan akses tambahan.', [
                'user.view' => 'Lihat daftar dan detail user',
                'user.create' => 'Buat user',
                'user.update' => 'Ubah profil dan role user',
                'user.delete' => 'Hapus user',
                'user.bypass' => 'Login sebagai user',
                'user.mention' => 'Cari user untuk mention dan assignment',
                'user.stats.view' => 'Lihat statistik user',
                'user.permissions.view' => 'Lihat akses tambahan user',
                'user.permissions.update' => 'Ubah akses tambahan user',
            ]),
            'division' => self::module('Division', 'Kelola division dan keanggotaannya.', [
                'division.view' => 'Lihat division',
                'division.create' => 'Buat division',
                'division.update' => 'Ubah division',
                'division.delete' => 'Hapus division',
                'division.member.view' => 'Lihat anggota division',
                'division.member.add' => 'Tambah anggota division',
                'division.member.update' => 'Ubah role anggota division',
                'division.member.remove' => 'Keluarkan anggota division',
            ]),
            'workspace' => self::module('Workspace', 'Kelola workspace di dalam division.', [
                'workspace.view' => 'Lihat workspace',
                'workspace.create' => 'Buat workspace',
                'workspace.update' => 'Ubah workspace',
                'workspace.delete' => 'Hapus workspace',
            ]),
            'campaign' => self::module('Campaign', 'Kelola campaign, anggota, dan analitik.', [
                'campaign.view' => 'Lihat campaign',
                'campaign.create' => 'Buat campaign',
                'campaign.update' => 'Ubah campaign',
                'campaign.delete' => 'Hapus campaign',
                'campaign.member.view' => 'Lihat anggota campaign',
                'campaign.member.add' => 'Tambah anggota campaign',
                'campaign.member.remove' => 'Keluarkan anggota campaign',
                'campaign.analytics.view' => 'Lihat statistik, gantt, dan health',
                'campaign.stats.view' => 'Lihat statistik campaign',
                'campaign.progress.view' => 'Lihat progress board campaign',
                'campaign.gantt.view' => 'Lihat gantt campaign',
                'campaign.overdue.view' => 'Lihat task overdue campaign',
                'campaign.health.view' => 'Lihat health campaign',
            ]),
            'board' => self::module('Board', 'Kelola kolom workflow campaign.', [
                'board.view' => 'Lihat board',
                'board.create' => 'Buat board',
                'board.update' => 'Ubah board',
                'board.reorder' => 'Ubah urutan board',
                'board.delete' => 'Hapus board',
            ]),
            'card' => self::module('Card Pekerjaan', 'Kelola card utama dan penugasannya.', [
                'card.view' => 'Lihat card',
                'card.create' => 'Buat card',
                'card.update' => 'Ubah card',
                'card.move' => 'Pindahkan card antar-board',
                'card.reorder' => 'Ubah urutan card',
                'card.delete' => 'Hapus card',
                'card.assign' => 'Assign user ke card',
                'card.unassign' => 'Lepas assignee card',
                'card.activity.view' => 'Lihat riwayat aktivitas card',
            ]),
            'task' => self::module('Task Legacy', 'Permission kompatibilitas untuk akses task/card lama.', [
                'task.view' => 'Lihat task/card',
                'task.create' => 'Buat task/card',
                'task.update' => 'Ubah task/card',
                'task.delete' => 'Hapus task/card',
                'task.assign' => 'Assign task/card',
            ]),
            'label' => self::module('Label', 'Kelola master label dan pemasangannya pada card.', [
                'label.view' => 'Lihat label',
                'label.create' => 'Buat label',
                'label.update' => 'Ubah label',
                'label.delete' => 'Hapus label',
                'label.attach' => 'Pasang label ke card',
                'label.detach' => 'Lepas label dari card',
                'label.toggle' => 'Toggle label pada card',
            ]),
            'brand' => self::module('Brand', 'Kelola master brand dan pemasangannya pada card.', [
                'brand.view' => 'Lihat brand',
                'brand.create' => 'Buat brand',
                'brand.update' => 'Ubah brand',
                'brand.delete' => 'Hapus brand',
                'brand.attach' => 'Pasang brand ke card',
                'brand.detach' => 'Lepas brand dari card',
            ]),
            'attachment' => self::module('Hasil & Attachment', 'Kelola file/link hasil pekerjaan pada card.', [
                'attachment.view' => 'Lihat attachment hasil',
                'attachment.upload' => 'Upload attachment hasil',
                'attachment.delete' => 'Hapus attachment hasil',
                'attachment.download' => 'Download attachment hasil',
            ]),
            'brief_attachment' => self::module('Brief Attachment', 'Kelola file brief pada card.', [
                'brief_attachment.view' => 'Lihat attachment brief',
                'brief_attachment.upload' => 'Upload attachment brief',
                'brief_attachment.delete' => 'Hapus attachment brief',
                'brief_attachment.download' => 'Download attachment brief',
            ]),
            'comment' => self::module('Komentar Card', 'Kelola diskusi pada card.', [
                'comment.view' => 'Lihat komentar',
                'comment.create' => 'Tambah komentar',
                'comment.update' => 'Ubah komentar',
                'comment.delete' => 'Hapus komentar',
            ]),
            'checklist' => self::module('Checklist', 'Kelola task checklist di dalam card.', [
                'checklist.view' => 'Lihat checklist',
                'checklist.create' => 'Buat checklist',
                'checklist.update' => 'Ubah checklist',
                'checklist.complete' => 'Tandai checklist selesai',
                'checklist.reorder' => 'Ubah urutan checklist',
                'checklist.delete' => 'Hapus checklist',
            ]),
            'subtask' => self::module('Subtask', 'Kelola subtask dari checklist.', [
                'subtask.view' => 'Lihat subtask',
                'subtask.create' => 'Buat subtask',
                'subtask.update' => 'Ubah subtask',
                'subtask.complete' => 'Tandai subtask selesai',
                'subtask.delete' => 'Hapus subtask',
            ]),
            'result_template' => self::module('Template Deskripsi Hasil', 'Kelola template deskripsi attachment hasil.', [
                'result_template.view' => 'Lihat template deskripsi',
                'result_template.create' => 'Buat template deskripsi',
            ]),
            'form' => self::module('Form', 'Kelola form, field, respons, dan assignment respons.', [
                'form.view' => 'Lihat form',
                'form.create' => 'Buat form',
                'form.update' => 'Ubah form',
                'form.delete' => 'Hapus form',
                'form.field.create' => 'Tambah field form',
                'form.field.update' => 'Ubah field form',
                'form.field.delete' => 'Hapus field form',
                'form.responses.view' => 'Lihat respons form',
                'form.responses.export' => 'Export respons form',
                'form.submission.create' => 'Kirim respons melalui area internal',
                'form.submission.forward' => 'Teruskan respons menjadi card',
                'form.submission.assign' => 'Assign respons form',
            ]),
            'dashboard' => self::module('Dashboard', 'Akses ringkasan dashboard manajemen.', [
                'dashboard.view' => 'Lihat dashboard',
                'dashboard.system_insights.view' => 'Lihat System Insights sesuai divisi yang diizinkan',
                'dashboard.activities.view' => 'Lihat aktivitas dashboard',
                'dashboard.division_ranking.view' => 'Lihat Top 3 user per divisi',
            ]),
            'account' => self::module('Akun Saya', 'Kelola profil, password, dan avatar akun sendiri.', [
                'account.view' => 'Lihat pengaturan akun sendiri',
                'account.update' => 'Ubah profil akun sendiri',
                'account.password.update' => 'Ubah password akun sendiri',
                'account.avatar.update' => 'Ubah avatar akun sendiri',
            ]),
            'my_work' => self::module('My Work', 'Akses produktivitas, aktivitas, ranking, attachment, dan export pribadi.', [
                'my_work.view' => 'Buka halaman My Work',
                'my_work.todo.view' => 'Lihat daily todo sendiri',
                'my_work.activities.view' => 'Lihat aktivitas kerja sendiri',
                'my_work.ranking.view' => 'Lihat ranking penyelesaian task',
                'my_work.attachments.view' => 'Lihat attachment kerja sendiri',
                'my_work.export' => 'Export laporan kerja sendiri',
            ]),
            'calendar' => self::module('Calendar', 'Akses kalender pekerjaan dan detail per tanggal.', [
                'calendar.view' => 'Lihat kalender pekerjaan',
                'calendar.detail.view' => 'Lihat detail pekerjaan per tanggal',
            ]),
            'chat' => self::module('Chat', 'Kelola room, pesan, dan status baca chat.', [
                'chat.view' => 'Buka dan lihat daftar room chat',
                'chat.room.create' => 'Buat direct message',
                'chat.message.view' => 'Lihat pesan chat',
                'chat.message.create' => 'Kirim pesan chat',
                'chat.message.delete' => 'Hapus pesan chat',
                'chat.read' => 'Tandai chat sudah dibaca',
            ]),
            'notification' => self::module('Notifikasi', 'Kelola inbox dan status baca notifikasi sendiri.', [
                'notification.view' => 'Lihat notifikasi',
                'notification.read' => 'Tandai satu notifikasi sudah dibaca',
                'notification.read_all' => 'Tandai semua notifikasi sudah dibaca',
                'notification.delete' => 'Hapus notifikasi',
            ]),
            'report' => self::module('Report & QC', 'Akses laporan, preview, export, dan verifikasi QC.', [
                'report.view' => 'Lihat report',
                'report.preview' => 'Preview report PDF',
                'report.preview.pdf' => 'Preview report PDF secara spesifik',
                'report.export' => 'Export report PDF/Excel',
                'report.export.pdf' => 'Export report PDF',
                'report.export.excel' => 'Export report Excel',
                'report.qc' => 'Submit verifikasi QC',
                'report.activity.view' => 'Lihat activity log user',
            ]),
            'profile' => self::module('Profile', 'Akses halaman profil user.', [
                'profile.view' => 'Lihat profil',
            ]),
        ];
    }

    public static function names(): array
    {
        return collect(self::modules())
            ->flatMap(fn (array $module) => array_keys($module['permissions']))
            ->values()
            ->all();
    }

    public static function metadataFor(iterable $permissions): array
    {
        $allowed = collect($permissions)->flip();

        return collect(self::modules())
            ->map(function (array $module, string $key) use ($allowed) {
                $items = collect($module['permissions'])
                    ->filter(fn (string $label, string $name) => $allowed->has($name))
                    ->map(fn (string $label, string $name) => [
                        'name' => $name,
                        'label' => $label,
                    ])->values();

                return [
                    'key' => $key,
                    'label' => $module['label'],
                    'description' => $module['description'],
                    'permissions' => $items->all(),
                ];
            })
            ->filter(fn (array $module) => $module['permissions'] !== [])
            ->values()
            ->all();
    }

    public static function dependenciesFor(string $permission): array
    {
        [$module, $action] = array_pad(explode('.', $permission, 2), 2, null);
        $dependencies = [];

        if ($action !== 'view') {
            $dependencies[] = $module.'.view';
        }

        if (str_starts_with($permission, 'user.permissions.')) {
            $dependencies[] = 'user.view';
            if ($permission === 'user.permissions.update') {
                $dependencies[] = 'user.permissions.view';
            }
        }

        if (in_array($permission, [
            'form.responses.export',
            'form.submission.forward',
            'form.submission.assign',
        ], true)) {
            $dependencies[] = 'form.responses.view';
        }

        $parentViews = match ($module) {
            'division' => ['division.view'],
            'campaign' => ['campaign.view'],
            'board' => ['campaign.view', 'board.view'],
            'card' => ['campaign.view', 'board.view', 'card.view'],
            'attachment', 'brief_attachment', 'comment', 'checklist', 'result_template' => ['card.view'],
            'subtask' => ['card.view', 'checklist.view'],
            'form' => ['form.view'],
            'report' => ['report.view'],
            default => [],
        };

        return array_values(array_unique(array_merge($dependencies, $parentViews)));
    }

    public static function adminPermissions(): array
    {
        return array_values(array_diff(self::names(), [
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            'user.stats.view',
            'user.permissions.view',
            'user.permissions.update',
            'division.create',
            'division.update',
            'division.delete',
            'division.member.add',
            'division.member.update',
            'division.member.remove',
            'profile.view',
            'dashboard.division_ranking.view',
        ]));
    }

    public static function userPermissions(): array
    {
        return [
            'user.mention',
            'division.view',
            'division.member.view',
            'workspace.view',
            'campaign.view', 'campaign.create', 'campaign.update', 'campaign.delete',
            'campaign.member.view', 'campaign.member.add', 'campaign.member.remove',
            'campaign.stats.view', 'campaign.progress.view',
            'campaign.overdue.view', 'campaign.health.view',
            'board.view', 'board.create', 'board.update', 'board.reorder', 'board.delete',
            'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
            'card.view', 'card.create', 'card.update', 'card.move', 'card.reorder',
            'card.delete', 'card.assign', 'card.unassign', 'card.activity.view',
            'label.view', 'label.attach', 'label.detach', 'label.toggle',
            'brand.view', 'brand.attach', 'brand.detach',
            'attachment.view', 'attachment.upload', 'attachment.delete', 'attachment.download',
            'brief_attachment.view', 'brief_attachment.upload',
            'brief_attachment.delete', 'brief_attachment.download',
            'comment.view', 'comment.create', 'comment.update', 'comment.delete',
            'checklist.view', 'checklist.create', 'checklist.update',
            'checklist.complete', 'checklist.reorder', 'checklist.delete',
            'subtask.view', 'subtask.create', 'subtask.update', 'subtask.complete', 'subtask.delete',
            'result_template.view', 'result_template.create',
            'account.view', 'account.update', 'account.password.update', 'account.avatar.update',
            'my_work.view', 'my_work.todo.view', 'my_work.activities.view',
            'my_work.attachments.view', 'my_work.export',
            'calendar.view', 'calendar.detail.view',
            'chat.view', 'chat.room.create', 'chat.message.view',
            'chat.message.create', 'chat.message.delete', 'chat.read',
            'notification.view', 'notification.read', 'notification.read_all',
            'notification.delete',
        ];
    }

    private static function module(string $label, string $description, array $permissions): array
    {
        return compact('label', 'description', 'permissions');
    }
}
