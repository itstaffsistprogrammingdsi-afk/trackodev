export type AssistantCard = { id: string; title: string; campaign?: string; board_id?: string };
export type AssistantBoard = { id: string; title: string; campaign?: string; workspace?: string };

export function openAssistant(card: AssistantCard) {
  window.dispatchEvent(new CustomEvent<AssistantCard>("tracko:open-assistant", { detail: card }));
}

export function normalizeAssistantText(value: string): string {
  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\ufeff]/g, "")
    .replace(/^```[a-zA-Z0-9_-]*\s*$/gm, "")
    .replace(/`/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*([-*_]){3,}\s*$/gm, "")
    .replace(/^\s*[*+]\s+/gm, "- ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/(?<![\w*])\*(?!\*)(\S(?:.*?\S)?)\*(?![\w*])/gs, "$1")
    .replace(/(?<![\w_])_(?!_)(\S(?:.*?\S)?)_(?![\w_])/gs, "$1");

  const lines = text.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    if (trimmed && trimmed.includes("|")) {
      if (trimmed.includes("-") && /^\|?[\s:|-]+\|?$/.test(trimmed)) return [];
      const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (cells.length >= 2) return [cells.join(" — ")];
    }
    return [line.replace(/\s+$/, "")];
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}
