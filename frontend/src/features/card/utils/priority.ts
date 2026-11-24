import type { CardPriority } from "../types";

export const PRIORITY_ORDER: CardPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const priorityBadgeClasses: Record<CardPriority, string> = {
  low: "bg-priority-low-soft text-priority-low",
  medium: "bg-priority-medium-soft text-priority-medium",
  high: "bg-priority-high-soft text-priority-high",
  urgent: "bg-priority-urgent-soft text-priority-urgent",
};

export const priorityDotClasses: Record<CardPriority, string> = {
  low: "bg-priority-low-dot",
  medium: "bg-priority-medium-dot",
  high: "bg-priority-high-dot",
  urgent: "bg-priority-urgent-dot",
};

export const priorityLabels: Record<
  CardPriority,
  { label: string; labelEn: string }
> = {
  low: { label: "Rendah", labelEn: "Low" },
  medium: { label: "Normal", labelEn: "Medium" },
  high: { label: "Tinggi", labelEn: "High" },
  urgent: { label: "Urgent", labelEn: "Urgent" },
};
