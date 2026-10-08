export type AssistantCard = { id: string; title: string; campaign?: string; board_id?: string };
export type AssistantBoard = { id: string; title: string; campaign?: string; workspace?: string };

export function openAssistant(card: AssistantCard) {
  window.dispatchEvent(new CustomEvent<AssistantCard>("tracko:open-assistant", { detail: card }));
}
