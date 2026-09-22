import { useCallback, useEffect, useState } from "react";

import {
  attachLabel,
  createLabel,
  deleteLabel as deleteLabelRequest,
  detachLabel,
  getLabels,
} from "../api/card.api";

import { Card, Label } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

interface Props {
  detail: Card | null;

  setDetail: React.Dispatch<
    React.SetStateAction<Card | null>
  >;
}

export default function useLabels({
  detail,
  setDetail,
}: Props) {
  const realtimeRevision = useRealtimeRevision(["ActivityLog", "Label"]);
  const [labels, setLabels] = useState<
    Label[]
  >([]);

  const [newLabel, setNewLabel] =
    useState("");

  const [newColor, setNewColor] =
    useState("#3b82f6");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const messageFromError = (err: unknown, fallback: string): string => {
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
  };

  const fetchLabels = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getLabels();

      setLabels(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat daftar label.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLabels();
  }, [fetchLabels, realtimeRevision]);

  async function createWith(name: string, color: string) {
    if (!name.trim()) return;

    setError(null);

    try {
      const created = await createLabel({
        name: name.trim(),
        color,
      });

      setLabels((prev) => [
        ...prev,
        { ...created, cards_count: created.cards_count ?? 0 },
      ]);

      // 🔥 Auto-attach label baru ke card yang sedang dibuka,
      // supaya tidak perlu klik "add" manual lagi.
      if (detail) {
        const updated = await attachLabel(
          detail.id,
          created.id
        );

        setDetail((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            labels: updated.labels,
          };
        });

        setLabels((prev) => prev.map((label) =>
          label.id === created.id
            ? { ...label, cards_count: (label.cards_count ?? 0) + 1 }
            : label
        ));
      }
    } catch (err) {
      console.error(err);
      setError(messageFromError(err, "Label gagal dibuat."));
      throw err;
    }
  }

  async function handleCreateLabel() {
    if (!newLabel.trim()) return;

    await createWith(newLabel, newColor);

    setNewLabel("");
  }

async function attach(
  labelId: string
) {
  if (!detail) return;

  try {
    const updated = await attachLabel(
      detail.id,
      labelId
    );

    setDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        labels: updated.labels,
      };
    });
    setLabels((prev) => prev.map((label) =>
      label.id === labelId
        ? { ...label, cards_count: (label.cards_count ?? 0) + 1 }
        : label
    ));
    setError(null);
  } catch (err) {
    console.error(err);
    setError(messageFromError(err, "Label gagal ditambahkan."));
  }
}

async function detach(
  labelId: string
) {
  if (!detail) return;

  try {
    const updated = await detachLabel(
      detail.id,
      labelId
    );

    setDetail((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        labels: updated.labels,
      };
    });
    setLabels((prev) => prev.map((label) =>
      label.id === labelId
        ? { ...label, cards_count: Math.max(0, (label.cards_count ?? 0) - 1) }
        : label
    ));
    setError(null);
  } catch (err) {
    console.error(err);
    setError(messageFromError(err, "Label gagal dilepas."));
  }
}

  // Konfirmasi hapus dilakukan di UI (konfirmasi inline dua langkah),
  // hook ini hanya mengeksekusi penghapusan.
  async function remove(labelId: string) {
    setError(null);

    try {
      await deleteLabelRequest(labelId);
      setLabels((prev) => prev.filter((label) => label.id !== labelId));
    } catch (err) {
      console.error(err);
      setError(messageFromError(err, "Label gagal dihapus."));
    }
  }

  return {
    labels,
    loading,

    newLabel,
    setNewLabel,

    newColor,
    setNewColor,

    handleCreateLabel,

    createWith,

    attach,
    detach,
    remove,
    error,
  };
}
