import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowRightLeft,
  Building2,
  ChevronDown,
  CircleCheckBig,
  Clock3,
  Inbox,
  Loader2,
  PlayCircle,
  UserRound,
} from "lucide-react";

import CardDetailModal from "@/features/card/components/CardDetailModal";
import EmptyState from "@/components/ui/EmptyState";
import CardItem from "@/features/card/components/CardItem";
import NativeCardItem from "@/features/card/components/NativeCardItem";
import {
  assignMember,
  getMyCards,
  moveCard,
} from "@/features/card/api/card.api";
import { alertIfMirrorConflict } from "@/features/card/utils/mirrorConflict";
import type { Card, CardWorkflowBoard } from "@/features/card/types";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { toast } from "@/lib/feedback";

type WorkColumn = {
  id: string;
  label: string;
  description: string;
  color: string;
  icon: typeof Clock3;
};

/**
 * Sekelompok kartu yang merupakan satu pekerjaan yang sama: kartu asli +
 * salinan lintas divisi (mirror). Di "Tugas Saya", grup ditampilkan sebagai
 * satu baris ringkas agar tidak terlihat seperti tugas ganda.
 */
type FamilyGroup = {
  key: string;
  representative: Card;
  members: Card[];
  originals: Card[];
  copies: Card[];
};

/**
 * Deteksi tumbukan kanban: ikuti posisi kursor (`pointerWithin`) supaya drop
 * terasa tepat. Item yang sedang digeser dikecualikan agar `over` tidak
 * menunjuk balik ke kartu asal. Kartu di bawah kursor diprioritaskan; kolom
 * dipakai saat kursor di area kosong. `closestCorners` sebagai fallback, dan
 * hasilnya selalu satu target agar tidak ambigu.
 */
const kanbanCollisionDetection: CollisionDetection = (args) => {
  const isActive = (id: string | number) => id === args.active.id;

  const pointerCollisions = pointerWithin(args).filter(
    (collision) => !isActive(collision.id),
  );

  if (pointerCollisions.length === 0) {
    return closestCorners(args).filter((collision) => !isActive(collision.id));
  }

  const cardCollision = pointerCollisions.find((collision) =>
    args.droppableContainers.some(
      (container) =>
        container.id === collision.id && Boolean(container.data.current?.card),
    ),
  );

  return [cardCollision ?? pointerCollisions[0]];
};

function normalizeWorkflowValue(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s-]+/g, "_");
}

function workflowKey(board: CardWorkflowBoard): string {
  const type = normalizeWorkflowValue(board.type);
  return type ? `type:${type}` : `name:${normalizeWorkflowValue(board.name)}`;
}

function isCompletedWorkflow(board?: CardWorkflowBoard): boolean {
  const value = normalizeWorkflowValue(board?.type || board?.name);
  return ["done", "finished", "complete", "completed", "selesai", "qc_done"].includes(value);
}

function workflowDescription(board: CardWorkflowBoard): string {
  const value = normalizeWorkflowValue(board.type || board.name);
  if (["request", "by_request", "requested"].includes(value)) return "Menunggu permintaan";
  if (["todo", "to_do", "backlog"].includes(value)) return "Belum dikerjakan";
  if (["progress", "in_progress", "doing", "on_progress"].includes(value)) return "Sedang dikerjakan";
  if (isCompletedWorkflow(board)) return "Sudah selesai";
  return "Kolom workflow";
}

function workflowIcon(board: CardWorkflowBoard): typeof Clock3 {
  const value = normalizeWorkflowValue(board.type || board.name);
  if (isCompletedWorkflow(board)) return CircleCheckBig;
  if (["progress", "in_progress", "doing", "on_progress"].includes(value)) return PlayCircle;
  return Clock3;
}

function DivisionLabel({ card }: { card: Card }) {
  const label = [card.source?.division?.name, card.source?.campaign?.name]
    .filter(Boolean)
    .join(" · ");

  if (!label) return null;

  return (
    <div className="flex items-center gap-1.5 px-1 text-2xs font-semibold text-fg-subtle dark:text-fg-muted">
      <Building2 size={12} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function OwnerClaimRow({
  card,
  onClaimCard,
  claimingCardId,
}: {
  card: Card;
  onClaimCard: (card: Card) => Promise<void>;
  claimingCardId: string | null;
}) {
  if ((card.assignees ?? []).length > 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1">
      <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning-soft px-2 py-0.5 text-2xs font-semibold text-warning dark:border-warning/30 dark:bg-warning-soft dark:text-warning">
        <UserRound size={11} aria-hidden="true" />
        Belum ada pemilik
        {card.created_by?.name ? ` · dibuat oleh ${card.created_by.name}` : ""}
      </span>
      <button
        type="button"
        disabled={claimingCardId === card.id}
        onClick={() => void onClaimCard(card)}
        className="rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50 dark:border-accent/30 dark:bg-accent-soft dark:text-accent"
      >
        {claimingCardId === card.id ? "Mengambil..." : "Ambil"}
      </button>
    </div>
  );
}

function moveTargetsFor(card: Card): Array<{ id: string; name: string }> {
  return (card.source?.workflow_boards ?? [])
    .filter((board) => board.id !== card.board_id)
    .map((board) => ({ id: board.id, name: board.name }));
}

/**
 * Satu baris grup family. Kartu representatif tetap bisa di-drag; salinan lain
 * dibuka lewat tombol expand dan tetap bisa dibuka/dipindah lewat pilihan
 * status (tanpa drag) agar tidak ada kemampuan yang hilang.
 */
function MyTaskGroupRow({
  group,
  onOpenCard,
  onMoveCard,
  onClaimCard,
  claimingCardId,
}: {
  group: FamilyGroup;
  onOpenCard: (card: Card) => void;
  onMoveCard: (card: Card, boardId: string) => Promise<void>;
  onClaimCard: (card: Card) => Promise<void>;
  claimingCardId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const { representative, members, originals, copies } = group;
  const siblings = members.filter((card) => card.id !== representative.id);

  const badgeDivision = copies[0]?.source_division?.name;
  const badgeText =
    originals.length > 0 && copies.length > 0
      ? `Asli + ${copies.length} salinan`
      : `${copies.length} salinan lintas divisi`;

  if (siblings.length === 0) {
    return (
      <div className="space-y-1.5">
        <DivisionLabel card={representative} />
        <OwnerClaimRow
          card={representative}
          onClaimCard={onClaimCard}
          claimingCardId={claimingCardId}
        />
        <CardItem
          card={representative}
          onOpen={onOpenCard}
          moveTargets={moveTargetsFor(representative)}
          onMove={onMoveCard}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <DivisionLabel card={representative} />

      <div className="rounded-panel border border-line bg-surface-muted/50 p-2 dark:border-line dark:bg-surface-muted/30">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mb-2 flex w-full items-center gap-1.5 rounded-control px-1.5 py-1 text-left text-2xs font-semibold text-accent transition hover:bg-surface-muted dark:text-accent dark:hover:bg-surface-muted/60"
        >
          <ArrowRightLeft size={12} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {badgeText}
            {badgeDivision ? ` · ${badgeDivision}` : ""}
          </span>
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <OwnerClaimRow
          card={representative}
          onClaimCard={onClaimCard}
          claimingCardId={claimingCardId}
        />
        <CardItem
          card={representative}
          onOpen={onOpenCard}
          moveTargets={moveTargetsFor(representative)}
          onMove={onMoveCard}
        />

        {expanded
          ? siblings.map((card) => (
              <div
                key={card.id}
                className="mt-2 space-y-1.5 border-t border-line pt-2 dark:border-line"
              >
                <DivisionLabel card={card} />
                <OwnerClaimRow
                  card={card}
                  onClaimCard={onClaimCard}
                  claimingCardId={claimingCardId}
                />
                <NativeCardItem
                  card={card}
                  onOpen={onOpenCard}
                  moveTargets={moveTargetsFor(card)}
                  onMove={onMoveCard}
                />
              </div>
            ))
          : null}
      </div>
    </div>
  );
}

function MyTaskColumn({
  column,
  groups,
  onOpenCard,
  onMoveCard,
  onClaimCard,
  claimingCardId,
}: {
  column: WorkColumn;
  groups: FamilyGroup[];
  onOpenCard: (card: Card) => void;
  onMoveCard: (card: Card, boardId: string) => Promise<void>;
  onClaimCard: (card: Card) => Promise<void>;
  claimingCardId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `my-task-${column.id}` });
  const Icon = column.icon;

  return (
    <section
      ref={setNodeRef}
      className={`flex max-h-[min(50vh,460px)] w-[85vw] max-w-[340px] shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-surface p-3 shadow-e1 transition-all duration-200 hover:shadow-e2 sm:w-[340px] sm:max-w-none dark:border-line dark:bg-surface ${
        isOver ? "border-accent/30 shadow-e2 ring-2 ring-accent/30 dark:border-accent/30" : ""
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-subtle dark:bg-surface-muted dark:text-fg-muted">
            <Icon size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{column.label}</h3>
            <p className="text-2xs font-medium opacity-75">{column.description}</p>
          </div>
        </div>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-surface-muted px-1.5 text-xs font-semibold text-fg-muted dark:bg-surface-muted dark:text-fg">
          {groups.length}
        </span>
      </header>

      <SortableContext
        items={groups.map((group) => group.representative.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 flex-1 space-y-3 overflow-y-auto rounded-control pr-1 custom-scrollbar">
          {groups.map((group) => (
            <MyTaskGroupRow
              key={group.key}
              group={group}
              onOpenCard={onOpenCard}
              onMoveCard={onMoveCard}
              onClaimCard={onClaimCard}
              claimingCardId={claimingCardId}
            />
          ))}

          {groups.length === 0 ? (
            <div className="rounded-control border border-dashed border-current/25 bg-surface/35 px-3 py-8 text-center text-xs font-medium opacity-70 dark:bg-surface-muted/20">
              Tidak ada tugas
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export default function MyAssignedTasks() {
  const { user } = useAuth();
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog",
    "Card",
    "Notification",
  ]);
  const {
    data: cards = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Card[]>({
    queryKey: ["my-cards"],
    // Sertakan card tanpa pemilik di campaign user agar tugas yang dibuat
    // admin di board anggota tetap terlihat dan bisa diambil.
    queryFn: () => getMyCards(true),
    staleTime: 30_000,
  });
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [claimingCardId, setClaimingCardId] = useState<string | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleClaimCard = async (card: Card) => {
    if (!user?.id) return;

    setClaimingCardId(card.id);

    try {
      await assignMember(card.id, user.id);
      await refetch();
    } catch (error) {
      if (alertIfMirrorConflict(error)) {
        await refetch();
        return;
      }
      console.error("Claim card failed", error);
      toast.error("Gagal mengambil tugas ini. Silakan coba lagi.");
    } finally {
      setClaimingCardId(null);
    }
  };

  useEffect(() => {
    if (realtimeRevision > 0) {
      void refetch();
    }
  }, [realtimeRevision, refetch]);

  const columns = useMemo<WorkColumn[]>(() => {
    const workflowColumns = new Map<string, WorkColumn & { order: number }>();

    cards.forEach((card) => {
      const boards = card.source?.workflow_boards ?? [];
      boards.forEach((board) => {
        const id = workflowKey(board);
        const existing = workflowColumns.get(id);
        if (!existing || (board.order ?? 0) < existing.order) {
          workflowColumns.set(id, {
            id,
            label: board.name,
            description: workflowDescription(board),
            color: board.color || "#6366f1",
            icon: workflowIcon(board),
            order: board.order ?? 0,
          });
        }
      });
    });

    return [...workflowColumns.values()]
      .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label))
      .map(({ order, ...column }) => {
        void order;
        return column;
      });
  }, [cards]);

  /*
  |--------------------------------------------------------------------------
  | PENGELOMPOKAN FAMILY (ASLI + SALINAN LINTAS DIVISI)
  |--------------------------------------------------------------------------
  | Satu pekerjaan bisa tampil sebagai kartu asli + salinan mirror. Agar tidak
  | terlihat seperti tugas ganda, kartu se-family ditampilkan sebagai satu grup.
  | Hanya kartu yang memang terlihat user (sudah difilter backend) yang
  | dikelompokkan; sibling tersembunyi tidak pernah diambil atau dihitung.
  */
  const familyGroups = useMemo<FamilyGroup[]>(() => {
    const buckets = new Map<string, Card[]>();

    cards.forEach((card) => {
      const key = card.parent_card_id ?? card.id;
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.push(card);
      } else {
        buckets.set(key, [card]);
      }
    });

    return [...buckets.entries()].map(([key, members]) => {
      const originals = members.filter((card) => !card.is_cross_division_copy);
      const copies = members.filter((card) => card.is_cross_division_copy);

      return {
        key,
        representative: originals[0] ?? members[0],
        members: [...originals, ...copies],
        originals,
        copies,
      };
    });
  }, [cards]);

  const familyByRepresentativeId = useMemo(
    () => new Map(familyGroups.map((group) => [group.representative.id, group])),
    [familyGroups],
  );

  const groupedGroups = useMemo(() => {
    const groups: Record<string, FamilyGroup[]> = Object.fromEntries(
      columns.map((column) => [column.id, [] as FamilyGroup[]]),
    );

    familyGroups.forEach((group) => {
      const board = group.representative.source?.board;
      if (!board) return;
      const key = workflowKey(board);
      (groups[key] ??= []).push(group);
    });

    return groups;
  }, [familyGroups, columns]);

  const moveToNativeBoard = async (card: Card, targetBoardId: string) => {
    if (!targetBoardId || targetBoardId === card.board_id) return;

    setMovingCardId(card.id);

    try {
      await moveCard(card.id, targetBoardId);
      await refetch();
    } catch (error) {
      if (alertIfMirrorConflict(error)) {
        await refetch();
        return;
      }
      throw error;
    } finally {
      setMovingCardId(null);
    }
  };

  const moveToWorkflowColumn = async (card: Card, targetColumnId: string) => {
    if (workflowKey(card.source?.board ?? { id: card.board_id, name: "", type: null }) === targetColumnId) return;

    const targetBoard = (card.source?.workflow_boards ?? []).find(
      (board) => workflowKey(board) === targetColumnId,
    );

    if (!targetBoard) {
      toast.error(
        "Campaign sumber tidak memiliki kolom workflow ini. Gunakan pilihan status pada card untuk memilih board tujuan.",
      );
      return;
    }

    await moveToNativeBoard(card, targetBoard.id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as Card | undefined;
    setActiveDragCard(card ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeCard = event.active.data.current?.card as Card | undefined;
    setActiveDragCard(null);

    if (!activeCard || !event.over) return;

    // Drop ke atas item itu sendiri = tidak ada perubahan.
    if (String(event.active.id) === String(event.over.id)) return;

    const overId = String(event.over.id);
    const targetGroup = familyByRepresentativeId.get(overId);
    const targetColumnId = targetGroup
      ? workflowKey(
          targetGroup.representative.source?.board ?? {
            id: targetGroup.representative.board_id,
            name: "",
            type: null,
          },
        )
      : columns.find((column) => `my-task-${column.id}` === overId)?.id;

    if (targetColumnId) {
      void moveToWorkflowColumn(activeCard, targetColumnId).catch(() => {
        void refetch();
      });
    }
  };

  const totalOpen = familyGroups.filter(
    (group) =>
      !group.representative.completed_at &&
      !isCompletedWorkflow(group.representative.source?.board),
  ).length;

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-surface">
      <header className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="text-fg-subtle" size={16} aria-hidden="true" />
            <h2 className="text-sm font-semibold text-fg">Tugas saya</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-fg-muted">
            Semua card yang ditugaskan langsung kepada Anda, termasuk dari divisi lain. Card tanpa pemilik di campaign Anda juga tampil agar bisa diambil.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-control bg-surface-muted px-2.5 py-1.5 text-2xs font-medium text-fg-muted sm:self-auto">
          {isFetching && !isLoading ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" size={13} aria-hidden="true" />
          ) : null}
          {totalOpen} tugas aktif
        </div>
      </header>

      <div className="border-b border-line bg-surface-muted/50 px-5 py-3 text-2xs leading-5 text-fg-muted sm:px-6">
        Tampilan ini adalah pintasan ke card asli, bukan salinan. Saat status dipindahkan di sini, board pemilik campaign juga langsung ikut berubah. Kartu lintas divisi digabung menjadi satu grup (asli + salinan); tekan grupnya untuk melihat semua.
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5 sm:p-6" role="status" aria-busy="true">
          <span className="sr-only">Memuat tugas Anda</span>
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-3 rounded-card border border-line p-4">
              <div className="h-9 w-9 animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Belum ada tugas yang ditugaskan"
          description="Saat Anda ditambahkan sebagai member card, tugas tersebut akan langsung muncul di sini."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragCard(null)}
        >
          <div className="flex items-start gap-4 overflow-x-auto px-4 py-5 custom-scrollbar sm:px-6">
            {columns.map((column) => (
              <MyTaskColumn
                key={column.id}
                column={column}
                groups={groupedGroups[column.id] ?? []}
                onOpenCard={setSelectedCard}
                onMoveCard={moveToNativeBoard}
                onClaimCard={handleClaimCard}
                claimingCardId={claimingCardId}
              />
            ))}
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {activeDragCard ? (
              <div className="w-[300px] cursor-grabbing rounded-card border border-accent/30 bg-surface p-4 shadow-e3 ring-2 ring-accent/15">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 break-words text-sm font-medium text-fg">
                    {activeDragCard.title}
                  </span>
                  {activeDragCard.priority ? (
                    <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-medium capitalize text-warning">
                      {activeDragCard.priority}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1.5 text-2xs font-medium text-accent">
                  Memindahkan tugas
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdated={async () => {
          await refetch();
        }}
        onDeleted={(cardId) => {
          if (selectedCard?.id === cardId) setSelectedCard(null);
          void refetch();
        }}
      />

      {movingCardId ? (
        <span className="sr-only" aria-live="polite">
          Memindahkan card {movingCardId}
        </span>
      ) : null}
    </section>
  );
}
