import { Board } from "../types";

const LOCKED_BOARD_KEYS = new Set(["by_request", "request", "done"]);

const normalizeBoardKey = (value?: string | null): string =>
  (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

export const isBoardOrderLocked = (board: Board): boolean =>
  [board.type, board.name].some((value) =>
    LOCKED_BOARD_KEYS.has(normalizeBoardKey(value)),
  );

export const getBoardSortableId = (boardId: string): string =>
  `board:${boardId}`;

export const getBoardIdFromSortableId = (sortableId: string): string | null =>
  sortableId.startsWith("board:") ? sortableId.slice("board:".length) : null;