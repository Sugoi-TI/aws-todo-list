import type { FileTable, TaskTable } from "./tables-types";

export type GetTasksResponseDto = (TaskTable &
  Partial<Pick<FileTable, "s3Key" | "fileName" | "fileType">>)[];

export type S3EventBridgeDetail = {
  version: string;
  bucket: {
    name: string;
  };
  object: {
    key: string;
    size: number;
    etag: string;
    "version-id"?: string;
    sequencer: string;
  };
  "request-id": string;
  requester: string;
  "source-ip-address": string;
  reason: string;
};
