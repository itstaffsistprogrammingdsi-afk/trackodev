// 📁 src/features/card/components/sections/LabelSection.tsx

import useLabels from "../../hooks/useLabels";

import { Card } from "../../types";
import { useAuth } from '../../../../context/AuthContext';
import { useLanguage } from "@/context/LanguageContext";
import TaxonomyPickerSection from "./TaxonomyPickerSection";

interface Props {
  detail: Card | null;

  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export default function LabelSection({
  detail,
  setDetail,
}: Props) {
  const { can } = useAuth();
  const { t } = useLanguage();
  const {
    labels,
    loading,
    createWith,
    attach,
    detach,
    remove,
    error,
  } = useLabels({
    detail,
    setDetail,
  });

  // ============================================
  // GUARD
  // ============================================

  if (!detail) return null;

  // ============================================
  // HELPERS
  // ============================================

  const isDuplicateName = (name: string) => {
    const normalized = name.trim().toLocaleLowerCase();

    if (normalized === "") return false;

    return labels.some(
      (label) => label.name.trim().toLocaleLowerCase() === normalized,
    );
  };

  // ============================================
  // UI
  // ============================================

  return (
    <TaxonomyPickerSection
      items={labels}
      attachedIds={detail.labels?.map((l) => l.id) ?? []}
      loading={loading}
      error={error}
      searchPlaceholder={t("Cari label...", "Search labels...")}
      createPlaceholder={t("Nama label baru...", "New label name...")}
      attachedTitle={t("Label terpasang", "Attached labels")}
      attachedEmptyText={t("Belum ada label terpasang pada card ini.", "No labels attached to this card yet.")}
      listTitle={t("Daftar label", "Label list")}
      duplicateHint={t("Label sudah ada. Pilih label tersebut dari daftar untuk memasangnya.", "This label already exists. Select it from the list to attach it.")}
      canCreate={can('label.create')}
      canAttach={can('label.attach')}
      canDetach={can('label.detach')}
      canDelete={can('label.delete')}
      defaultColor="#3b82f6"
      fallbackColor="#3b82f6"
      isDuplicateName={isDuplicateName}
      onAttach={attach}
      onDetach={detach}
      onCreate={createWith}
      onDelete={remove}
    />
  );
}
