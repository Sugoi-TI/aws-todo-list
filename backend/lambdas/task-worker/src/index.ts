import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { EventBridgeEvent, SQSEvent } from "aws-lambda";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  EventNames,
  FileTable,
  TaskToDeletePayload,
  type TaskEnrichedPayload,
  type TaskTable,
} from "@my-app/shared";

type UnknownEvent = EventBridgeEvent<string, any>;
type EnrichedEvent = EventBridgeEvent<(typeof EventNames)["TaskEnriched"], TaskEnrichedPayload>;
type ToDeleteEvent = EventBridgeEvent<(typeof EventNames)["TaskToDelete"], TaskToDeletePayload>;

function isEnrichedEvent(event: UnknownEvent): event is EnrichedEvent {
  return event["detail-type"] === EventNames.TaskEnriched;
}

function isToDeleteEvent(event: UnknownEvent): event is ToDeleteEvent {
  return event["detail-type"] === EventNames.TaskToDelete;
}

const FILE_TABLE_NAME = process.env.FILE_TABLE_NAME;
const FILES_BUCKET_NAME = process.env.FILES_BUCKET_NAME;
const TASK_TABLE_NAME = process.env.TASK_TABLE_NAME;

const s3Client = new S3Client({});
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SQSEvent) => {
  if (!FILES_BUCKET_NAME) {
    throw new Error("Critical: FILES_BUCKET_NAME is not defined in environment variables");
  }
  if (!FILE_TABLE_NAME) {
    throw new Error("Critical: FILE_TABLE_NAME is not defined in environment variables");
  }
  if (!TASK_TABLE_NAME) {
    throw new Error("Critical: TASK_TABLE_NAME is not defined in environment variables");
  }

  console.log("Received messages: ", event.Records.length);

  for (const record of event.Records) {
    try {
      // TODO properly type it
      const body = JSON.parse(record.body);

      if (isEnrichedEvent(body)) {
        console.log(`Parsing task: (Massage ID: ${record.messageId})`);

        if (body.detail.title === "TEST_ERROR") {
          throw new Error("Intentional test error to trigger DLQ");
        }

        // TODO spread
        const commandItem: TaskTable = {
          taskId: body.detail.taskId,
          userId: body.detail.userId,
          title: body.detail.title,
          message: body.detail.message,
          createdAt: body.detail.createdAt,
          status: "NEW",
          fileId: body.detail?.fileId,
        };

        const command = new PutCommand({
          TableName: TASK_TABLE_NAME,
          Item: commandItem,
        });

        await docClient.send(command);
        console.log("Data saved in the DB");
      }

      if (isToDeleteEvent(body)) {
        console.log(`Parsing task: (Massage ID: ${record.messageId})`);

        const getTaskCommand = new GetCommand({
          TableName: TASK_TABLE_NAME,
          Key: { taskId: body.detail.taskId },
        });

        const taskResponse = await docClient.send(getTaskCommand);
        const task = taskResponse.Item as TaskTable;

        if (!task) {
          console.log("Task not found");
          continue;
        }

        if (task.fileId) {
          const getFileToDelete = new GetCommand({
            TableName: FILE_TABLE_NAME,
            Key: { fileId: task.fileId },
          });

          console.log("Getting file to delete...");
          const fileResponse = await docClient.send(getFileToDelete);

          const fileToDelete = fileResponse.Item as FileTable;

          if (fileToDelete && fileToDelete.s3Key) {
            await docClient.send(
              new TransactWriteCommand({
                TransactItems: [
                  { Delete: { TableName: TASK_TABLE_NAME, Key: { taskId: body.detail.taskId } } },
                  { Delete: { TableName: FILE_TABLE_NAME, Key: { fileId: task.fileId } } },
                ],
              }),
            );

            console.log("Task and file records deleted from DB transactionally");

            const deleteS3Command = new DeleteObjectCommand({
              Bucket: FILE_BUCKET_NAME,
              Key: fileToDelete.s3Key,
            });

            const s3DeleteResult = await s3Client.send(deleteS3Command);
            console.log("File deleted from s3");
          }
        } else {
          const deleteTaskCommand = new DeleteCommand({
            TableName: TASK_TABLE_NAME,
            Key: { taskId: body.detail.taskId },
          });

          await docClient.send(deleteTaskCommand);
          console.log("Task deleted from DB");
        }
      }
    } catch (error) {
      console.error("Parsing message error: ", error);
      throw error;
      // Throw or SQS will consider task done
    }
  }

  return {};
};
