import { useEffect, useState } from "react";

import { Brand } from "../types";

export default function useBrands() {
  const [brands, setBrands] = useState<
    Brand[]
  >([]);

  const [newBrand, setNewBrand] =
    useState("");

  // =========================================
  // LOAD
  // =========================================
  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      // dummy sementara
      setBrands([
        {
          id: "1",
          name: "Tokopedia",
          color: "#22c55e",
        },
        {
          id: "2",
          name: "Shopee",
          color: "#f97316",
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================
  // CREATE
  // =========================================
  const handleCreateBrand = () => {
    if (!newBrand.trim()) return;

    const item: Brand = {
      id: Date.now().toString(),
      name: newBrand,
      color: "#3b82f6",
    };

    setBrands((prev) => [...prev, item]);

    setNewBrand("");
  };

  // =========================================
  // DELETE
  // =========================================
  const handleDeleteBrand = (
    id: string,
  ) => {
    setBrands((prev) =>
      prev.filter((b) => b.id !== id),
    );
  };

  return {
    brands,

    newBrand,
    setNewBrand,

    handleCreateBrand,
    handleDeleteBrand,
  };
}