"use client";
import { useUser } from "@clerk/nextjs";
import {
  boardDataService,
  boardService,
  columnService,
  taskService,
} from "../services";
import { useEffect, useState } from "react";
import {
  Board,
  BoardWithTaskCount,
  Column,
  ColumnWithTasks,
  Task,
} from "../supabase/models";
import { useSupabase } from "../supabase/SupabaseProvider";

export function useBoards() {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [boards, setBoards] = useState<BoardWithTaskCount[]>([]);
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
  const { user } = useUser();
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
        assignee: taskData.assignee || null,
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

  const moveTask = async (
    taskId: string,
    newColumnId: string,
    newOrder: number
  ) => {
    try {
      await taskService.moveTask(supabase!, taskId, newColumnId, newOrder);
      setColumns((prev) => {
        const newColumns = [...prev];

        let taskToMove: Task | null = null;
        // get specific task
        for (const col of newColumns) {
          const taskIndex = col.tasks.findIndex((task) => task.id === taskId);
          if (taskIndex !== -1) {
            taskToMove = col.tasks[taskIndex];
            taskToMove.column_id = newColumnId;
            taskToMove.sort_order = newOrder;
            col.tasks.splice(taskIndex, 1);
            break;
          }
        }

        // move to target column
        if (taskToMove) {
          const targetColumn = newColumns.find((col) => col.id === newColumnId);

          // move task to specific sort_order
          if (targetColumn) {
            targetColumn.tasks.splice(newOrder, 0, taskToMove);

            // adjust sort_order of all tasks after specific task
            targetColumn.tasks.forEach(async (task, index) => {
              if (task.id !== taskId && task.sort_order !== index) {
                console.log(task.title, index);

                task.sort_order = index;
                await taskService.moveTask(
                  supabase!,
                  task.id,
                  newColumnId,
                  index
                );
              }
            });
          }
        }

        return newColumns;
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to move task.");
    }
  };

  const createColumn = async (title: string) => {
    if (!board || !user) throw new Error("Board not loaded");

    try {
      const newColumn = await columnService.createColumn(supabase!, {
        title,
        board_id: board.id,
        sort_order: columns.length,
        user_id: user.id,
      });

      setColumns((prev) => [...prev, { ...newColumn, tasks: [] }]);
      return newColumn;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create column."
      );
    }
  };

  const updateColumn = async (columnId: string, title: string) => {
    if (!board || !user) throw new Error("Board not loaded");

    try {
      const updatedColumn = await columnService.updateColumnTitle(
        supabase!,
        columnId,
        title
      );

      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, ...updatedColumn } : col
        )
      );
      return updatedColumn;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update column title."
      );
    }
  };
  return {
    board,
    columns,
    loading,
    error,
    updateBoard,
    createRealTask,
    setColumns,
    moveTask,
    createColumn,
    updateColumn,
  };
}
