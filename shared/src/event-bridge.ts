import type { TaskTable } from "./types/tables-types";

export const EventNames = {
  TaskReceived: "TaskReceived",
  TaskEnriched: "TaskEnriched",
  FileUploaded: "FileUploaded",
} as const;

export const TaskRules = {
  EnrichTaskRule: "EnrichTaskRule",
  SaveTaskRule: "SaveTaskRule",
  FileUploadRule: "FileUploadRule",
} as const;

export const EventSources = {
  todoTask: "todo.task",
  S3Source: "aws.s3",
} as const;

export type TaskReceivedPayload = Pick<TaskTable, "taskId" | "title" | "message"> & {
  userId: string;
  fileId?: string;
};

export type TaskEnrichedPayload = TaskReceivedPayload & Pick<TaskTable, "createdAt">;

export type FileUploadedPayload = {
  userId: string;
  taskId: string;
  fileId: string;
  s3Key: string;
  fileName: string;
};
