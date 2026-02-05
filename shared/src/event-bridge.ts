import type { TaskTable } from "./types/tables-types";

export const EventNames = {
  TaskReceived: "TaskReceived",
  TaskUpdated: "TaskUpdated",
  TaskToDelete: "TaskToDelete",
  TaskEnriched: "TaskEnriched",
  TaskSaved: "TaskSaved",
  FileUploaded: "FileUploaded",
} as const;

export const TaskRules = {
  EnrichTaskRule: "EnrichTaskRule",
  SaveTaskRule: "SaveTaskRule",
  DeleteTaskRule: "DeleteTaskRule",
  UpdateTaskRule: "UpdateTaskRule",
  TaskSavedRule: "TaskSavedRule",
  FileUploadRule: "FileUploadRule",
} as const;

export const EventSources = {
  task: "todo.task",
  S3Source: "aws.s3",
} as const;

// TODO rename to reflect edit case
export type TaskReceivedPayload = Pick<
  TaskTable,
  "taskId" | "title" | "message" | "createdAt" | "lastUpdateAt"
> & {
  userId: string;
  fileId?: string;
};

export type TaskEnrichedPayload = TaskReceivedPayload;

export type TaskSavedPayload = TaskTable;

export type TaskToDeletePayload = Pick<TaskTable, "taskId" | "fileId">;

export type FileUploadedPayload = {
  userId: string;
  taskId: string;
  fileId: string;
  s3Key: string;
  fileName: string;
};
