import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  DynamoDBClient,
  QueryCommand,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  EventNames,
  EventSources,
  TASK_TABLE,
  type TaskReceivedPayload,
  type GetTasksResponseDto,
  TaskTable,
  FileTable,
} from "@my-app/shared";

const TASK_TABLE_NAME = process.env.TASK_TABLE_NAME;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;
const FILES_BUCKET_NAME = process.env.FILES_BUCKET_NAME;
const FILES_TABLE_NAME = process.env.FILES_TABLE_NAME;

const ebClient = new EventBridgeClient({});
const dynamo = new DynamoDBClient({});
const s3Client = new S3Client({});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  if (!EVENT_BUS_NAME) {
    throw new Error("Critical: EVENT_BUS_NAME is not defined in environment variables");
  }
  if (!TASK_TABLE_NAME) {
    throw new Error("Critical: TASK_TABLE_NAME is not defined in environment variables");
  }
  if (!FILES_BUCKET_NAME) {
    throw new Error("Critical: FILES_BUCKET_NAME is not defined in environment variables");
  }
  if (!FILES_TABLE_NAME) {
    throw new Error("Critical: FILES_TABLE_NAME is not defined in environment variables");
  }

  const userId = event.requestContext.authorizer?.jwt.claims.sub as string;

  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  const method = event.requestContext?.http?.method;

  if (method === "GET") {
    try {
      const command = new QueryCommand({
        TableName: TASK_TABLE_NAME,
        IndexName: TASK_TABLE.byUserId,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": { S: userId },
        },
        ScanIndexForward: false,
      });

      const result = await dynamo.send(command);

      const tasks = result.Items
        ? (result.Items.map((item) => unmarshall(item)) as TaskTable[])
        : [];

      const tasksWithFiles: GetTasksResponseDto = [];

      for (const task of tasks) {
        if (task.fileId) {
          try {
            const fileCommand = new GetItemCommand({
              TableName: FILES_TABLE_NAME,
              Key: {
                fileId: { S: task.fileId },
              },
            });

            const fileResult = await dynamo.send(fileCommand);

            if (fileResult.Item) {
              const fileData = unmarshall(fileResult.Item) as FileTable;

              tasksWithFiles.push({
                ...task,
                fileName: fileData.fileName,
                fileType: fileData.fileType,
                s3Key: fileData.s3Key,
              });
            } else {
              tasksWithFiles.push(task);
            }
          } catch (error) {
            console.error("Error fetching file data for task: ", task.taskId, error);
            tasksWithFiles.push(task);
          }
        } else {
          tasksWithFiles.push(task);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(tasksWithFiles),
      };
    } catch (error) {
      console.error("DynamoDB Read Error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: "Failed to fetch tasks" }),
      };
    }
  }

  if (method === "POST") {
    let body;

    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      body = event.body;
    }

    if (!body || !body.title || !body.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing title or message",
        }),
      };
    }

    const taskId = crypto.randomUUID();
    try {
      let presignedUrl;
      let fileId = body.fileId;

      if (body.fileName) {
        fileId = crypto.randomUUID();
        // Format: userId/fileId-filename
        const key = `${userId}/${fileId}-${body.fileName}`;

        const putObjectCommand = new PutObjectCommand({
          Bucket: FILES_BUCKET_NAME,
          Key: key,
          ContentType: body.fileType || "application/octet-stream",
        });

        console.log("Generating presigned URL...");
        presignedUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 60 });

        const putItemCommand = new PutItemCommand({
          TableName: FILES_TABLE_NAME,
          Item: {
            fileId: { S: fileId },
            userId: { S: userId },
            taskId: { S: taskId },
            fileName: { S: body.fileName },
            status: { S: "pending" },
            createdAt: { S: new Date().toISOString() },
            s3Key: { S: key },
            fileSize: { N: body.fileSize ? String(body.fileSize) : "0" },
            fileType: { S: body.fileType || "application/octet-stream" },
          },
        });

        console.log("Writing into File table...");
        await dynamo.send(putItemCommand);
      }

      console.log("Publishing TaskReceived event...");

      const taskPayload: TaskReceivedPayload = {
        userId,
        title: body.title,
        message: body.message,
        taskId,
        ...(fileId && { fileId: fileId }),
      };

      const command = new PutEventsCommand({
        Entries: [
          {
            Source: EventSources.todoTask,
            DetailType: EventNames.TaskReceived,
            Detail: JSON.stringify(taskPayload),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      });

      const result = await ebClient.send(command);

      console.log(`Event published ID: ${result.Entries?.[0].EventId}`);

      return {
        statusCode: 202,
        body: JSON.stringify({
          message: "Task accepted for processing",
          eventId: result.Entries?.[0].EventId,
          taskId: taskPayload.taskId,
          presignedUrl, // Return the URL
          fileId,
        }),
        headers,
      };
    } catch (error) {
      console.error("Bus Error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: "Method Not Allowed" }),
  };
};
