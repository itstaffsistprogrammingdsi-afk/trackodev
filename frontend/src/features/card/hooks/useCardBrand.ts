import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Brand, Card } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { deleteBrand as deleteBrandRequest } from "../api/card.api";

interface UseCardBrandReturn {
  brands: Brand[];
  loading: boolean;

  attachBrand: (brandId: string) => Promise<void>;
  detachBrand: (brandId: string) => Promise<void>;
  createAndAttach: (name: string, color: string) => Promise<void>;
  removeBrand: (brandId: string, brandName: string) => Promise<void>;
  error: string | null;
}

const brandNameCollator = new Intl.Collator("id", {
  sensitivity: "base",
  numeric: true,
});

function sortBrands(brands: Brand[]): Brand[] {
  return [...brands].sort((left, right) => {
    const nameOrder = brandNameCollator.compare(left.name, right.name);

    return nameOrder || left.id.localeCompare(right.id);
  });
}

export function useCardBrand(
  card: Card | null,
  isOpen: boolean,
  setDetail?: React.Dispatch<React.SetStateAction<Card | null>>
): UseCardBrandReturn {
  const realtimeRevision = useRealtimeRevision(["ActivityLog", "Brand"]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const campaignId = card?.campaign_id
    ?? card?.campaign?.id
    ?? card?.board?.campaign_id;

  // =========================================
  // FETCH ALL BRANDS
  // =========================================
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      // brand.view adalah akses read-only ke katalog. Jangan menyaring katalog
      // berdasarkan card di sini karena brand dari campaign lain tetap perlu
      // terlihat; BrandSection yang menentukan mana yang dapat di-attach.
      const res = await api.get("/brands");
      setBrands(sortBrands(res.data?.data ?? res.data ?? []));
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat daftar brand.");
    } finally {
      setLoading(false);
    }
  }, []);

  // =========================================
  // CREATE + ATTACH
  // =========================================
  const createAndAttach = async (name: string, color: string) => {
    if (!card) return;

    if (!campaignId) {
      const campaignError = new Error("Campaign card tidak ditemukan.");
      setError(campaignError.message);
      throw campaignError;
    }

    setError(null);

    try {
      const res = await api.post("/brands", {
        name: name.trim(),
        color,
        campaign_id: campaignId,
      });

      const newBrand: Brand = res.data.data ?? res.data;

      await api.post(`/cards/${card.id}/brands/${newBrand.id}/attach`);

      setBrands((prev) => sortBrands([
        ...prev.filter((brand) => brand.id !== newBrand.id),
        { ...newBrand, cards_count: (newBrand.cards_count ?? 0) + 1 },
      ]));

      // 🔥 IMPORTANT: sync ke detail state
      setDetail?.((prev) => {
        if (!prev) return prev;

        const exists = prev.brands?.some((b) => b.id === newBrand.id);

        return {
          ...prev,
          brands: exists
            ? prev.brands!
            : sortBrands([...(prev.brands || []), newBrand]),
        };
      });
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Brand gagal dibuat."));
      throw err;
    }
  };

  // =========================================
  // ATTACH EXISTING
  // =========================================
  const attachBrand = async (brandId: string) => {
    if (!card) return;

    setError(null);

    try {
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
            : sortBrands([...(prev.brands || []), brand]),
        };
      });
      setBrands((prev) => prev.map((brand) =>
        brand.id === brandId
          ? { ...brand, cards_count: (brand.cards_count ?? 0) + 1 }
          : brand
      ));
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Brand gagal ditambahkan."));
    }
  };

  // =========================================
  // DETACH
  // =========================================
  const detachBrand = async (brandId: string) => {
    if (!card) return;

    setError(null);

    try {
      await api.delete(`/cards/${card.id}/brands/${brandId}/detach`);

      setDetail?.((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          brands: (prev.brands || []).filter((b) => b.id !== brandId),
        };
      });
      setBrands((prev) => prev.map((brand) =>
        brand.id === brandId
          ? { ...brand, cards_count: Math.max(0, (brand.cards_count ?? 0) - 1) }
          : brand
      ));
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Brand gagal dilepas."));
    }
  };

  const removeBrand = async (brandId: string, brandName: string) => {
    if (!window.confirm(`Hapus brand "${brandName}" dari daftar master?`)) {
      return;
    }

    setError(null);

    try {
      await deleteBrandRequest(brandId);
      setBrands((prev) => prev.filter((brand) => brand.id !== brandId));
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Brand gagal dihapus."));
    }
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
    removeBrand,
    error,
  };
}

function errorMessage(err: unknown, fallback: string): string {
  const response = (err as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
  }).response;
  const validationMessage = response?.data?.errors?.name?.[0];

  return validationMessage || response?.data?.message || fallback;
}
