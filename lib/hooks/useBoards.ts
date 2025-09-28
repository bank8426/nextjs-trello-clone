"use client";
import { useUser } from "@clerk/nextjs";
import { boardDataService, boardService, taskService } from "../services";
import { useEffect, useState } from "react";
import { Board, Column, ColumnWithTasks } from "../supabase/models";
import { useSupabase } from "../supabase/SupabaseProvider";

export function useBoards() {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadBoards();
  }, [user, supabase]);

  async function loadBoards() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await boardService.getBoards(supabase!, user.id);
      setBoards(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load boards."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createBoard(boardData: {
    title: string;
    description?: string;
    color?: string;
  }) {
    if (!user) throw new Error("User not authenticated");
    try {
      const newBoard = await boardDataService.createBoardWithDefaultColumns(
        supabase!,
        {
          ...boardData,
          userId: user.id,
        }
      );

      setBoards((prev) => [newBoard, ...prev]);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create board."
      );
    }
  }
  return { boards, loading, error, createBoard };
}

export function useBoard(boardId: string) {
  const { supabase } = useSupabase();
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardId) loadBoard(boardId);
  }, [boardId, supabase]);

  async function loadBoard(boardId: string) {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await boardDataService.getBoardWithColumns(
        supabase!,
        boardId
      );
      setBoard(data.board);
      setColumns(data.columnsWithTasks);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load board."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateBoard(boardId: string, updates: Partial<Board>) {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);
      const updatedBoard = await boardService.updateBoard(
        supabase!,
        boardId,
        updates
      );

      setBoard(updatedBoard);
      return updatedBoard;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update the board."
      );
    }
  }

  async function createRealTask(
    columnId: string,
    taskData: {
      title: string;
      description?: string;
      assignee?: string;
      dueDate?: string;
      priority?: "low" | "medium" | "high";
    }
  ) {
    try {
      const newTask = await taskService.createTask(supabase!, {
        title: taskData.title,
        description: taskData.description || null,
        assignee: taskData.dueDate || null,
        due_date: taskData.dueDate || null,
        column_id: columnId,
        sort_order:
          columns.find((column) => column.id === columnId)?.tasks.length || 0,
        priority: taskData.priority || "medium",
      });

      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
        )
      );

      return newTask;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create task."
      );
    }
  }

  return { board, columns, loading, error, updateBoard, createRealTask };
}
