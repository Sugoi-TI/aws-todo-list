export enum EntityNames {
  TasksTable = "TasksTable",
  TodoUserPool = "TodoUserPool",
  TodoUserPoolClient = "TodoUserPoolClient",
  TodoAuthorizer = "TodoAuthorizer",
  TasksQueue = "TasksQueue",
  TasksEventBus = "TasksEventBus",
  TimeService = "TimeService",
  TaskService = "TaskService",
  TaskWorker = "TaskWorker",
  TaskCreatedRule = "TaskCreatedRule",
  TodoApi = "TodoApi",
}

export enum EventNames {
  TaskReceived = "TaskReceived",
  TaskEnriched = "TaskEnriched",
}

export enum TaskRules {
  EnrichTaskRule = "EnrichTaskRule",
  SaveTaskRule = "SaveTaskRule",
}
