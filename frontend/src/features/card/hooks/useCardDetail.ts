import { useCallback, useEffect, useState } from "react";

import api from "@/lib/axios";

import { Brand, Card, User } from "../types";

import { getUsers } from "@/features/user/api/user.api";

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
    brandId: string,
  ) => Promise<void>;

  handleDetachBrand: (
    brandId: string,
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
    if (!card?.id) return;

    setLoading(true);

    try {
      const cardRes = await api.get(
        `/cards/${card.id}`,
      );

      setDetail(cardRes.data.data);
    } catch (err) {
      console.error(
        "FAILED FETCH CARD DETAIL",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [card?.id]);

  // =========================================
  // FETCH USERS
  // =========================================
  const fetchUsers = useCallback(async () => {
  try {
    const users = await getUsers();

    setUsers(users);
  } catch (err) {
    console.error(
      "FAILED FETCH USERS",
      err,
    );
  }
}, []);

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
    brandId: string,
  ) => {
    if (!detail?.id) return;

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
    brandId: string,
  ) => {
    if (!detail?.id) return;

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

    if (!detail?.campaign_id) {
      console.error("CAMPAIGN ID NOT FOUND");

      return;
    }

    try {
      await createBrand(
        detail.campaign_id,
        brandName,
        brandColor,
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
  // FETCH USERS + BRANDS
  // ONLY WHEN MODAL OPEN
  // =========================================
  useEffect(() => {
    if (!isOpen) return;

    fetchUsers();

    fetchBrands();
  }, [
    isOpen,
    fetchUsers,
    fetchBrands,
  ]);

  // =========================================
  // FETCH CARD DETAIL
  // ONLY WHEN CARD ID CHANGED
  // =========================================
  useEffect(() => {
    if (!card?.id || !isOpen) return;

    fetchDetail();
  }, [
    card?.id,
    isOpen,
    fetchDetail,
  ]);

  // =========================================
  // RESET STATE WHEN MODAL CLOSED
  // =========================================
  useEffect(() => {
    if (isOpen) return;

    setDetail(null);

    setLoading(false);

    setBrandName("");

    setBrandColor("#3b82f6");
  }, [isOpen]);

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