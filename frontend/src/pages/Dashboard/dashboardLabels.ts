import { translate } from "@/i18n/translate";

/**
 * Label periode berasal dari API dan masih berbahasa Indonesia. Hanya label
 * statis yang dikenal yang diterjemahkan; label tanggal dibiarkan apa adanya.
 */
export function translatePeriodLabel(label: string): string {
  if (label === "Periode aktif") {
    return translate("Periode aktif", "Active period");
  }

  if (label === "Semua waktu") {
    return translate("Semua waktu", "All time");
  }

  const allYear = /^Semua data tahun (\d{4})$/.exec(label);

  if (allYear) {
    return translate("Semua data tahun {year}", "All data for {year}", {
      year: allYear[1],
    });
  }

  return label;
}

/** Nama divisi tetap apa adanya; hanya kata penghubungnya yang diterjemahkan. */
export function translateScopeLabel(label: string): string {
  if (label === "seluruh divisi") {
    return translate("seluruh divisi", "all divisions");
  }

  if (label === "tidak ada divisi terhubung") {
    return translate("tidak ada divisi terhubung", "no connected divisions");
  }

  if (label === "divisi yang terhubung") {
    return translate("divisi yang terhubung", "connected divisions");
  }

  if (label.startsWith("divisi ")) {
    return translate("divisi {names}", "the {names} division", {
      names: label.slice("divisi ".length),
    });
  }

  return label;
}
