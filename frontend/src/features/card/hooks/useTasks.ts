import { useEffect, useMemo, useRef, useState } from "react";

import api from "@/lib/axios";

import { CardTask } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

interface ReturnType {
  tasks: CardTask[];

  total: number;

  done: number;

  progress: number;
  error: string;

  handleAddTask: (
    title: string,
  ) => Promise<void>;

  toggleTask: (
    id: number,
  ) => Promise<void>;

  deleteTask: (
    id: number,
  ) => Promise<void>;
}

export default function useTasks(
  cardId?: number | string,
  isOpen?: boolean,

  onUpdated?: () => void,
): ReturnType {
  const realtimeRevision = useRealtimeRevision(["Subtask", "Task"]);
  const [tasks, setTasks] =
    useState<CardTask[]>([]);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const activeCardIdRef = useRef<string | null>(null);

  // =========================================
  // FETCH TASKS
  // =========================================
  useEffect(() => {
    const fetchTasks = async () => {
      if (!cardId) return;
      const requestId = ++requestRef.current;
      if (activeCardIdRef.current !== String(cardId)) {
        activeCardIdRef.current = String(cardId);
        setTasks([]);
      }

      try {
        const res = await api.get(
          `/cards/${cardId}/tasks`,
        );

        if (requestId === requestRef.current) {
          setTasks(res.data.data || []);
          setError("");
        }
      } catch (err) {
        if (requestId === requestRef.current) {
          console.error("FAILED FETCH TASKS", err);
          setError("Task gagal dimuat.");
        }
      }
    };

    if (isOpen && cardId) {
      fetchTasks();
    }
    return () => {
      requestRef.current += 1;
    };
  }, [cardId, isOpen, realtimeRevision]);

  // =========================================
  // ADD TASK
  // =========================================
  const handleAddTask = async (
    title: string,
  ) => {
    if (!title.trim()) return;

    if (!cardId) return;

    // 🔥 optimistic task
    const tempTask: CardTask = {
      id: Date.now(),
      title,
      is_completed: false,
    };

    setTasks((prev) => [
      ...prev,
      tempTask,
    ]);

    try {
      const res = await api.post(
        `/cards/${cardId}/tasks`,
        {
          title,
        },
      );

      const createdTask =
        res.data.data;

      // replace temp task
      setTasks((prev) =>
        prev.map((task) =>
          task.id === tempTask.id
            ? createdTask
            : task,
        ),
      );
      setError("Task gagal ditambahkan.");
    } catch (err) {
      console.error(
        "FAILED CREATE TASK",
        err,
      );

      // rollback
      setTasks((prev) =>
        prev.filter(
          (task) =>
            task.id !== tempTask.id,
        ),
      );
    }
  };

  // =========================================
  // TOGGLE TASK
  // =========================================
  const toggleTask = async (
    id: number,
  ) => {
    const oldTasks = [...tasks];

    // optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              is_completed:
                !task.is_completed,
            }
          : task,
      ),
    );

    try {
      await api.patch(
        `/tasks/${id}/complete`,
      );

      onUpdated?.();
    } catch (err) {
      console.error(
        "FAILED TOGGLE TASK",
        err,
      );

      // rollback
      setTasks(oldTasks);
      setError("Status task gagal diperbarui.");
    }
  };

  // =========================================
  // DELETE TASK
  // =========================================
  const deleteTask = async (
    id: number,
  ) => {
    const oldTasks = [...tasks];

    // optimistic delete
    setTasks((prev) =>
      prev.filter(
        (task) => task.id !== id,
      ),
    );

    try {
      await api.delete(`/tasks/${id}`);
    } catch (err) {
      console.error(
        "FAILED DELETE TASK",
        err,
      );

      // rollback
      setTasks(oldTasks);
      setError("Task gagal dihapus.");
    }
  };

  // =========================================
  // PROGRESS
  // =========================================
  const total = useMemo(
    () => tasks.length,
    [tasks],
  );

  const done = useMemo(
    () =>
      tasks.filter(
        (t) => t.is_completed,
      ).length,
    [tasks],
  );

  const progress = useMemo(() => {
    if (!total) return 0;

    return Math.round(
      (done / total) * 100,
    );
  }, [done, total]);

  return {
    tasks,

    total,

    done,

    progress,
    error,

    handleAddTask,

    toggleTask,

    deleteTask,
  };
}
