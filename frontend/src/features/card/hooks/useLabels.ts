import { useEffect, useState } from "react";

import {
  attachLabel,
  createLabel,
  detachLabel,
  getLabels,
} from "../api/card.api";

import { Card, Label } from "../types";

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
  const [labels, setLabels] = useState<
    Label[]
  >([]);

  const [newLabel, setNewLabel] =
    useState("");

  const [newColor, setNewColor] =
    useState("#3b82f6");

  useEffect(() => {
    fetchLabels();
  }, []);

  async function fetchLabels() {
    try {
      const data = await getLabels();

      setLabels(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateLabel() {
    if (!newLabel.trim()) return;

    try {
      const created = await createLabel({
        name: newLabel,
        color: newColor,
      });

      setLabels((prev) => [
        ...prev,
        created,
      ]);

      setNewLabel("");

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
      }
    } catch (err) {
      console.error(err);
    }
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
  } catch (err) {
    console.error(err);
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
  } catch (err) {
    console.error(err);
  }
}

  return {
    labels,

    newLabel,
    setNewLabel,

    newColor,
    setNewColor,

    handleCreateLabel,

    attach,
    detach,
  };
}