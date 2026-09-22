import { Card } from "../../types";
import { useCardBrand } from "../../hooks/useCardBrand";
import { useAuth } from '../../../../context/AuthContext';
import TaxonomyPickerSection from "./TaxonomyPickerSection";

interface Props {
  card: Card;
  isOpen: boolean;
  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export default function BrandSection({
  card,
  isOpen,
  setDetail,
}: Props) {
  const { can } = useAuth();
  const {
    brands,
    attachBrand,
    detachBrand,
    createAndAttach,
    removeBrand,
    loading,
    error,
  } = useCardBrand(card, isOpen, setDetail);

  // ============================================
  // GUARD
  // ============================================

  if (!isOpen) return null;

  // ============================================
  // HELPERS
  // ============================================

  const campaignId = card.campaign_id
    ?? card.campaign?.id
    ?? card.board?.campaign_id;

  const isDuplicateName = (name: string) => {
    const normalized = name.trim().toLocaleLowerCase();

    if (normalized === "") return false;

    return brands.some(
      (brand) =>
        brand.campaign_id === campaignId
        && brand.name.trim().toLocaleLowerCase() === normalized,
    );
  };

  // ============================================
  // UI
  // ============================================

  return (
    <TaxonomyPickerSection
      items={brands}
      attachedIds={card.brands?.map((b) => b.id) ?? []}
      loading={loading}
      error={error}
      searchPlaceholder="Cari brand..."
      createPlaceholder="Nama brand baru..."
      attachedTitle="Brand terpasang"
      attachedEmptyText="Belum ada brand terpasang pada card ini."
      listTitle="Daftar brand"
      duplicateHint="Brand sudah ada pada campaign ini. Pilih brand tersebut dari daftar untuk memasangnya."
      canCreate={can('brand.create')}
      canAttach={can('brand.attach')}
      canDetach={can('brand.detach')}
      canDelete={can('brand.delete')}
      defaultColor="#ff0000"
      fallbackColor="#6b7280"
      isDuplicateName={isDuplicateName}
      onAttach={attachBrand}
      onDetach={detachBrand}
      onCreate={createAndAttach}
      onDelete={removeBrand}
    />
  );
}
