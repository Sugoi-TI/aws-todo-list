export const USER_TABLE = {
  partitionKey: "userId",
} as const;

export const TASK_TABLE = {
  partitionKey: "taskId",
  byUserId: "byUserId",
  createdAt: "createdAt",
} as const;

export const FILE_TABLE = {
  partitionKey: "fileId",
  byUploadedBy: "byUploadedBy",
  uploadedBy: "uploadedBy",
  byTaskId: "byTaskId",
  attachedToTaskId: "attachedToTaskId",
  createdAt: "createdAt",
} as const;
