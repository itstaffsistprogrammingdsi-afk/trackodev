import { useEffect, useMemo, useState } from "react";

import api from "@/lib/axios";

import { CardTask } from "../types";

interface ReturnType {
  tasks: CardTask[];

  total: number;
  done: number;
  progress: number;

handleAddTask: (
  title: string,
) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
}

export default function useTasks(
  cardId?: number | string,
  isOpen?: boolean,
): ReturnType {
  const [tasks, setTasks] = useState<CardTask[]>([]);

  // =========================================
  // FETCH TASKS
  // =========================================
  useEffect(() => {
    const fetchTasks = async () => {
      if (!cardId) return;

      try {
        const res = await api.get(`/cards/${cardId}/tasks`);

        setTasks(res.data.data || []);
      } catch (err) {
        console.error("FAILED FETCH TASKS", err);
      }
    };

    if (isOpen && cardId) {
      fetchTasks();
    }
  }, [cardId, isOpen]);

  // =========================================
  // ADD TASK
  // =========================================
const handleAddTask = async (
  title: string,
) => {
  if (!title.trim()) return;

  if (!cardId) return;

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

    const createdTask = res.data.data;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === tempTask.id
          ? createdTask
          : task,
      ),
    );
  } catch (err) {
    console.error(
      "FAILED CREATE TASK",
      err,
    );

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
  const toggleTask = async (id: number) => {
    const oldTasks = [...tasks];

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              is_completed: !task.is_completed,
            }
          : task,
      ),
    );

    try {
      await api.patch(`/tasks/${id}/complete`);
    } catch (err) {
      console.error("FAILED TOGGLE TASK", err);

      setTasks(oldTasks);
    }
  };

  // =========================================
  // DELETE TASK
  // =========================================
  const deleteTask = async (id: number) => {
    const oldTasks = [...tasks];

    setTasks((prev) => prev.filter((task) => task.id !== id));

    try {
      await api.delete(`/tasks/${id}`);
    } catch (err) {
      console.error("FAILED DELETE TASK", err);

      setTasks(oldTasks);
    }
  };

  // =========================================
  // PROGRESS
  // =========================================
  const total = useMemo(() => tasks.length, [tasks]);

  const done = useMemo(
    () => tasks.filter((t) => t.is_completed).length,
    [tasks],
  );

  const progress = useMemo(() => {
    if (!total) return 0;

    return Math.round((done / total) * 100);
  }, [done, total]);

  return {
    tasks,

    total,
    done,
    progress,

    handleAddTask,
    toggleTask,
    deleteTask,
  };
}