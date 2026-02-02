import { FileTable, TaskTable } from "./tables-types";

export type GetTasksResponseDto = (TaskTable &
  Partial<Pick<FileTable, "s3Key" | "fileName" | "fileType">>)[];
