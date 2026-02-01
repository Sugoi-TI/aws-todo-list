import type { TaskTable } from "./types/tables-types";

export const EventNames = {
  TaskReceived: "TaskReceived",
  TaskEnriched: "TaskEnriched",
} as const;

export const TaskRules = {
  EnrichTaskRule: "EnrichTaskRule",
  SaveTaskRule: "SaveTaskRule",
} as const;

export const EventSource = "todo.tasks";

export type TaskReceivedPayload = Pick<TaskTable, "taskId" | "title" | "message"> & {
  userId: string;
};

export type TaskEnrichedPayload = TaskReceivedPayload & Pick<TaskTable, "createdAt">;
