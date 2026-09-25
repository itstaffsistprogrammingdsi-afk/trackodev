<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

class UserSearch
{
    /**
     * Terapkan pencarian nama/email yang ramah pengguna:
     *
     *  - Dipecah per kata; SETIAP kata wajib cocok (AND).
     *  - Urutan kata bebas ("putri ayu" menemukan "Ayu Putri").
     *  - Spasi berlebih diabaikan; pencarian tidak boleh gagal hanya karena
     *    spasi ganda / leading-trailing.
     *  - Case-insensitive lewat LOWER() di kedua sisi, tidak digantungkan pada
     *    collation server.
     *
     * Nama kolom berasal dari kode (bukan input pengguna), jadi aman dipakai
     * di whereRaw.
     */
    public static function apply(
        Builder $query,
        ?string $search,
        string $nameColumn = 'name',
        string $emailColumn = 'email'
    ): Builder {
        $tokens = preg_split('/\s+/', trim((string) $search), -1, PREG_SPLIT_NO_EMPTY);

        if (! is_array($tokens) || $tokens === []) {
            return $query;
        }

        foreach ($tokens as $token) {
            $like = '%'.mb_strtolower($token).'%';

            $query->where(function (Builder $clause) use ($like, $nameColumn, $emailColumn) {
                $clause
                    ->whereRaw("LOWER({$nameColumn}) LIKE ?", [$like])
                    ->orWhereRaw("LOWER({$emailColumn}) LIKE ?", [$like]);
            });
        }

        return $query;
    }
}
