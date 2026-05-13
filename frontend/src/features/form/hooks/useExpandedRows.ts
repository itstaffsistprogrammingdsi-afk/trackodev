import { useState } from "react";

export default function useExpandedRows() {
  const [expandedRows, setExpandedRows] =
    useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  return {
    expandedRows,
    toggleExpanded,
  };
}