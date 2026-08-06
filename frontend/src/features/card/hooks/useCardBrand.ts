import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Brand, Card } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

interface UseCardBrandReturn {
  brands: Brand[];
  loading: boolean;

  attachBrand: (brandId: string) => Promise<void>;
  detachBrand: (brandId: string) => Promise<void>;
  createAndAttach: (name: string, color: string) => Promise<void>;
}

export function useCardBrand(
  card: Card | null,
  isOpen: boolean,
  setDetail?: React.Dispatch<React.SetStateAction<Card | null>>
): UseCardBrandReturn {
  const realtimeRevision = useRealtimeRevision(["ActivityLog", "Brand"]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const campaignId = card?.campaign_id
    ?? card?.campaign?.id
    ?? card?.board?.campaign_id;

  // =========================================
  // FETCH ALL BRANDS
  // =========================================
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/brands", {
        params: campaignId ? { campaign_id: campaignId } : undefined,
      });
      setBrands(res.data?.data ?? res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // =========================================
  // CREATE + ATTACH
  // =========================================
  const createAndAttach = async (name: string, color: string) => {
    if (!card) return;

    if (!campaignId) {
      console.error("campaign_id tidak ditemukan");
      return;
    }

    const res = await api.post("/brands", {
      name,
      color,
      campaign_id: campaignId,
    });

    const newBrand: Brand = res.data.data ?? res.data;

    await api.post(`/cards/${card.id}/brands/${newBrand.id}/attach`);

    // 🔥 IMPORTANT: sync ke detail state
    setDetail?.((prev) => {
      if (!prev) return prev;

      const exists = prev.brands?.some((b) => b.id === newBrand.id);

      return {
        ...prev,
        brands: exists
          ? prev.brands!
          : [...(prev.brands || []), newBrand],
      };
    });
  };

  // =========================================
  // ATTACH EXISTING
  // =========================================
  const attachBrand = async (brandId: string) => {
    if (!card) return;

    await api.post(`/cards/${card.id}/brands/${brandId}/attach`);

    const brand = brands.find((b) => b.id === brandId);
    if (!brand) return;

    setDetail?.((prev) => {
      if (!prev) return prev;

      const exists = prev.brands?.some((b) => b.id === brandId);

      return {
        ...prev,
        brands: exists
          ? prev.brands!
          : [...(prev.brands || []), brand],
      };
    });
  };

  // =========================================
  // DETACH
  // =========================================
  const detachBrand = async (brandId: string) => {
    if (!card) return;

    await api.delete(`/cards/${card.id}/brands/${brandId}/detach`);

    setDetail?.((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        brands: (prev.brands || []).filter((b) => b.id !== brandId),
      };
    });
  };

  // =========================================
  // INIT
  // =========================================
  useEffect(() => {
    if (isOpen) fetchBrands();
  }, [isOpen, fetchBrands, realtimeRevision]);

  return {
    brands,
    loading,
    attachBrand,
    detachBrand,
    createAndAttach,
  };
}
