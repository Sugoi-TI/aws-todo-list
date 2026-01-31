export enum EventNames {
  TaskReceived = "TaskReceived",
  TaskEnriched = "TaskEnriched",
}

export enum TaskRules {
  EnrichTaskRule = "EnrichTaskRule",
  SaveTaskRule = "SaveTaskRule",
}

export const EventSource = "todo.tasks";

export type TaskReceivedPayload = {
  userId: string;
  title: string;
  message: string;
  taskId: string;
};

export type TaskEnrichedPayload = TaskReceivedPayload & {
  createAt: string;
};
