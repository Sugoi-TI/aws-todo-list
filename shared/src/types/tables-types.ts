export type UserTable = {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
};

export type TaskTable = {
  taskId: string;
  userId: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
};

export const FileStatus = {
  Pending: "pending",
  Uploaded: "uploaded",
} as const;

export type FileTable = {
  fileId: string;
  userId: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  status: (typeof FileStatus)[keyof typeof FileStatus];
  createdAt: string;
  updatedAt?: string;
};
