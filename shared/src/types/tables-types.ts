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
