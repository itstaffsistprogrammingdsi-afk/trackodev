import { useCallback, useEffect, useState } from "react";

import api from "@/lib/axios";

import { Brand, Card, User } from "../types";

import {
  attachBrand,
  detachBrand,
  createBrand,
  getBrands,
} from "../api/card.api";

interface ReturnType {
  detail: Card | null;

  users: User[];

  brands: Brand[];

  loading: boolean;

  brandName: string;

  brandColor: string;

  setBrandName: React.Dispatch<
    React.SetStateAction<string>
  >;

  setBrandColor: React.Dispatch<
    React.SetStateAction<string>
  >;

  fetchDetail: () => Promise<void>;

  fetchBrands: () => Promise<void>;

  handleAttachBrand: (
    brandId: number,
  ) => Promise<void>;

  handleDetachBrand: (
    brandId: number,
  ) => Promise<void>;

  handleCreateBrand: () => Promise<void>;

  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export function useCardDetail(
  card: Card | null,
  isOpen: boolean,
): ReturnType {
  // =========================================
  // STATE
  // =========================================
  const [detail, setDetail] =
    useState<Card | null>(null);

  const [users, setUsers] = useState<User[]>(
    [],
  );

  const [brands, setBrands] = useState<
    Brand[]
  >([]);

  const [brandName, setBrandName] =
    useState("");

  const [brandColor, setBrandColor] =
    useState("#3b82f6");

  const [loading, setLoading] =
    useState(false);

  // =========================================
  // FETCH CARD DETAIL
  // =========================================
  const fetchDetail = useCallback(async () => {
    if (!card) return;

    setLoading(true);

    try {
      const [cardRes, userRes] =
        await Promise.all([
          api.get(`/cards/${card.id}`),
          api.get(`/users`),
        ]);

      setDetail(cardRes.data.data);

      setUsers(userRes.data.data || []);
    } catch (err) {
      console.error(
        "FAILED FETCH CARD DETAIL",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [card]);

  // =========================================
  // FETCH BRANDS
  // =========================================
  const fetchBrands = useCallback(async () => {
    try {
      const data = await getBrands();

      setBrands(data || []);
    } catch (err) {
      console.error(
        "FAILED FETCH BRANDS",
        err,
      );
    }
  }, []);

  // =========================================
  // ATTACH BRAND
  // =========================================
  const handleAttachBrand = async (
    brandId: number,
  ) => {
    if (!detail) return;

    try {
      await attachBrand(detail.id, brandId);

      await fetchDetail();
    } catch (err) {
      console.error(
        "FAILED ATTACH BRAND",
        err,
      );
    }
  };

  // =========================================
  // DETACH BRAND
  // =========================================
  const handleDetachBrand = async (
    brandId: number,
  ) => {
    if (!detail) return;

    try {
      await detachBrand(detail.id, brandId);

      await fetchDetail();
    } catch (err) {
      console.error(
        "FAILED DETACH BRAND",
        err,
      );
    }
  };

  // =========================================
  // CREATE BRAND
  // =========================================
  const handleCreateBrand = async () => {
    if (!brandName.trim()) return;

    try {
await createBrand(
  detail?.campaign_id ?? "",
  brandName,
  brandColor
);

      setBrandName("");

      setBrandColor("#3b82f6");

      await fetchBrands();
    } catch (err) {
      console.error(
        "FAILED CREATE BRAND",
        err,
      );
    }
  };

  // =========================================
  // INITIAL FETCH
  // =========================================
  useEffect(() => {
    if (card && isOpen) {
      fetchDetail();

      fetchBrands();
    }
  }, [
    card,
    isOpen,
    fetchDetail,
    fetchBrands,
  ]);

  return {
    detail,

    users,

    brands,

    loading,

    brandName,

    brandColor,

    setBrandName,

    setBrandColor,

    fetchDetail,

    fetchBrands,

    handleAttachBrand,

    handleDetachBrand,

    handleCreateBrand,

    setDetail,
  };
}