/**
 * Audit sisa teks Indonesia yang belum dibungkus helper terjemahan.
 * Jalankan: node scripts/i18n-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve("src");

const STOPWORDS = [
  "ada", "adalah", "akan", "akses", "aktif", "aktivitas", "anggota", "antre",
  "aplikasi", "arsip", "atau", "atas", "awal", "bagi", "bahasa", "bahwa",
  "baik", "banyak", "baru", "batas", "batal", "bawah", "belum", "belakang",
  "benar", "berhasil", "beri", "berikut", "bidang", "bisa", "board", "buat",
  "bulan", "buka", "cari", "catatan", "coba", "contoh", "dalam", "dan",
  "dapat", "dari", "data", "dengan", "detail", "di", "dibuat", "digunakan",
  "dipilih", "diri", "divisi", "download", "dukung", "edit", "ekspor",
  "email", "atau", "gagal", "gambar", "global", "gunakan", "hak", "halaman",
  "hari", "hapus", "hasil", "hitung", "hubungi", "hanya", "identitas", "ikuti",
  "import", "impor", "info", "informasi", "ingin", "ini", "integrasi", "isi",
  "itu", " jadi", "jumlah", "kali", "kalender", "kamu", "kartu", "kata",
  "kategori", "kembali", "keterangan", "kirim", "kode", "kolaborator",
  "komentar", "konfirmasi", "kontrol", "kosong", "kustom", "label", "lalu",
  "lampiran", "langkah", "laporan", "lebih", "lewat", "lihat", "lintas",
  "login", "logo", "lokasi", "lupa", "masa", "masih", "masuk", "mata",
  "mati", "member", "memilih", "memuat", "menampilkan", "mendatang",
  "mengatur", "menggunakan", "menit", "menu", "mereka", "miliki", "minggu",
  "model", "mudah", "nama", "naik", "nonaktif", "notifikasi", "opsional",
  "orang", "pada", "pagination", "pakai", "paling", "papan", "password",
  "pasti", "pengaturan", "pengguna", "penilaian", "penting", "peran",
  "perbarui", "periode", "periksa", "pilih", "pilihan", "pin", "poin",
  "prioritas", "profil", "proses", "progres", "public", "publik", "punya",
  "rapat", "referensi", "rekap", "reminder", "riwayat", "role", "ruang",
  "salin", "sama", "sandi", "satu", "sedang", "selesai", "seluruh", "semua",
  "sendiri", "sekarang", "sekitar", "selalu", "selama", "selasa", "senin",
  "seperti", "seret", "sesi", "setelah", "setiap", "simpan", "sisa", "soal",
  "suatu", "sudah", "suka", "sumber", "tahun", "tambah", "tanpa", "tanggal",
  "target", "tanya", "tapi", "tautan", "teks", "telah", "tempat", "temukan",
  "tenggat", "tentang", "tepat", "terakhir", "terbuka", "terima", "terlambat",
  "terus", "tetap", "tim", "timeline", "tinggi", "tidak", "toast", "tombol",
  "tugas", "tujuan", "tutup", "ubah", "uang", "undang", "unggah", "untuk",
  "urutkan", "user", "utama", "yang", "anda", "wajib", "waktu", "website",
  "workspace", "ya", "yakin", "campaign", "selesai", "belum", "baru",
];

const WORD_RE = new RegExp(`\\b(${STOPWORDS.join("|")})\\b`, "i");

// Kata yang hampir pasti bahasa Indonesia, dipakai untuk string literal agar
// nilai enum/kelas CSS berbahasa Inggris tidak ikut dilaporkan.
const STRONG_WORDS = [
  "yang", "dan", "atau", "untuk", "dengan", "tidak", "belum", "sudah",
  "akan", "dari", "ini", "itu", "pada", "bisa", "harus", "semua", "buat",
  "tambah", "hapus", "simpan", "batal", "kembali", "cari", "pilih", "nama",
  "anggota", "divisi", "kartu", "daftar", "halaman", "pengaturan", "pengguna",
  "peran", "akses", "laporan", "kalender", "notifikasi", "aktivitas",
  "komentar", "lampiran", "deskripsi", "judul", "waktu", "tanggal", "menit",
  "minggu", "bulan", "tahun", "besok", "kemarin", "sekarang", "terlambat",
  "memuat", "gagal", "berhasil", "ubah", "tutup", "buka", "lihat", "unduh",
  "unggah", "ekspor", "impor", "opsional", "wajib", "yakin", "konfirmasi",
  "lanjutkan", "sandi", "akun", "profil", "tim", "tugas", "papan", "penting",
  "catatan", "sedang", "selesai", "milik", "setiap", "seluruh", "beberapa",
  "sebuah", "tanpa", "sesuai", "melalui", "terhadap", "apakah", "bagaimana",
];

const STRONG_RE = new RegExp(`\\b(${STRONG_WORDS.join("|")})\\b`, "i");
const CLASS_RE =
  /(^|\s)(bg|text|border|ring|from|to|via|hover|focus|active|grid|flex|items|justify|gap|px|py|p|m|w|h|rounded|shadow|font|leading|tracking|z|absolute|relative|overflow|space|divide|opacity|transition|duration|ease|scale|translate|rotate|inset|top|left|right|bottom|max|min|aspect|object|backdrop|blur|sr-only|dark):?(-|\s|$)/;

const UI_CALLS = /^(toast\.(error|success|info|warning|loading)|toast|confirm|alert|notify)$/;
const SKIP_ATTRS = new Set([
  "className", "id", "key", "to", "path", "href", "src", "type", "name",
  "value", "variant", "size", "role", "htmlFor", "target", "rel", "method",
  "action", "accept", "autoComplete", "inputMode", "pattern", "tabIndex",
  "stroke", "fill", "d", "viewBox", "xmlns", "width", "height", "color",
]);
const TRANSLATE_CALLS = new Set(["t", "translate", "tn"]);

const findings = [];
const localeFindings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) audit(full);
  }
}

function lineOf(sourceFile, node) {
  const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  return pos.line + 1;
}

function audit(file) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const relative = path.relative(ROOT, file).replaceAll("\\", "/");

  if (text.includes('"id-ID"') || text.includes("'id-ID'")) {
    localeFindings.push(relative);
  }

  const reportedNodes = new Set();

  function report(kind, node, value) {
    reportedNodes.add(node);
    findings.push({
      file: relative,
      line: lineOf(sourceFile, node),
      kind,
      text: value.replace(/\s+/g, " ").trim().slice(0, 120),
    });
  }

  function inTranslateCall(node) {
    let current = node.parent;

    while (current) {
      if (ts.isCallExpression(current)) {
        const callee = current.expression.getText(sourceFile);
        if (TRANSLATE_CALLS.has(callee)) return true;
      }
      current = current.parent;
    }

    return false;
  }

  function inConsole(node) {
    let current = node.parent;

    while (current) {
      if (ts.isCallExpression(current)) {
        if (current.expression.getText(sourceFile).startsWith("console.")) {
          return true;
        }
      }
      current = current.parent;
    }

    return false;
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, " ").trim();
      if (value && /[A-Za-z]/.test(value) && WORD_RE.test(value)) {
        report("jsx", node, value);
      }
    }

    if (ts.isJsxAttribute(node) && !SKIP_ATTRS.has(node.name.getText(sourceFile))) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        const value = node.initializer.text;
        if (WORD_RE.test(value)) report("attr", node, `${node.name.getText(sourceFile)}=${value}`);
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sourceFile);
      if (UI_CALLS.test(callee)) {
        for (const arg of node.arguments) {
          if (ts.isStringLiteral(arg) && WORD_RE.test(arg.text)) {
            report("call", arg, `${callee}(${arg.text})`);
          }
        }
      }
    }

    if (
      ts.isStringLiteral(node) &&
      !reportedNodes.has(node) &&
      !inTranslateCall(node) &&
      !inConsole(node) &&
      !ts.isImportDeclaration(node.parent) &&
      !ts.isExportDeclaration(node.parent) &&
      !(node.parent && ts.isPropertyAssignment(node.parent) && node.parent.name === node) &&
      STRONG_RE.test(node.text) &&
      !CLASS_RE.test(node.text) &&
      !/^(https?:|\/|\.\/|@\/)/.test(node.text) &&
      /[A-Za-z]/.test(node.text) &&
      (node.text.trim().includes(" ") || node.text.trim().length > 3)
    ) {
      report("literal", node, node.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

walk(ROOT);

const UI_ONLY = process.argv.includes("--ui");
const visibleFindings = UI_ONLY
  ? findings.filter((item) => item.kind !== "literal")
  : findings;

const byFile = new Map();
for (const item of visibleFindings) {
  const list = byFile.get(item.file) ?? [];
  list.push(item);
  byFile.set(item.file, list);
}

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
const SUMMARY = process.argv.includes("--summary");

console.log(
  `Sisa string Indonesia: ${visibleFindings.length} di ${byFile.size} file${UI_ONLY ? " (JSX/atribut/pesan)" : ""}\n`,
);
for (const [file, items] of sorted) {
  console.log(`${file} (${items.length})`);
  if (SUMMARY) continue;
  for (const item of items.slice(0, 12)) {
    console.log(`  ${item.line}: [${item.kind}] ${item.text}`);
  }
  if (items.length > 12) console.log(`  … ${items.length - 12} lainnya`);
}
console.log(`\nLocale "id-ID" hardcoded: ${localeFindings.length} file`);
for (const file of localeFindings) console.log(`  ${file}`);
