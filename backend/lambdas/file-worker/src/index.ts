import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { EventNames, EventSources, FileStatus, type S3EventBridgeDetail } from "@my-app/shared";

export type S3EventBridgeEvent = EventBridgeEvent<"Object Created", S3EventBridgeDetail>;

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;
const FILE_TABLE_NAME = process.env.FILE_TABLE_NAME;

const ebClient = new EventBridgeClient({});
const dynamo = new DynamoDBClient({});

export const handler = async (event: S3EventBridgeEvent) => {
  if (!EVENT_BUS_NAME) {
    throw new Error("EVENT_BUS_NAME is not defined");
  }

  if (!FILE_TABLE_NAME) {
    throw new Error("FILE_TABLE_NAME is not defined");
  }

  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  try {
    const bucketName = event.detail.bucket.name;
    const key = decodeURIComponent(event.detail.object.key.replace(/\+/g, " "));

    const parts = key.split("/");
    if (parts.length < 3) {
      console.warn(`Skipping keys with unexpected format: ${key}`);
    }
    const userId = parts[0];
    const fileId = parts[1];
    const fileName = parts[2];

    console.log(`Processing fileId: ${fileId} for key: ${key}`);

    const updateCommand = new UpdateItemCommand({
      TableName: FILE_TABLE_NAME,
      Key: { fileId: { S: fileId } },
      UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":status": { S: "uploaded" },
        ":updatedAt": { S: new Date().toISOString() },
      },
    });

    await dynamo.send(updateCommand);
    console.log(`Updated file status for: ${fileId}`);

    const eventCommand = new PutEventsCommand({
      Entries: [
        {
          Source: EventSources.todoTask,
          DetailType: EventNames.FileUploaded,
          Detail: JSON.stringify({
            fileId,
            userId,
            s3Key: key,
            status: FileStatus.Uploaded,
            fileName,
            bucketName,
          }),
          EventBusName: EVENT_BUS_NAME,
        },
      ],
    });

    await ebClient.send(eventCommand);
  } catch (error) {
    console.error("Error processing file upload:", error);
    throw error;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "File processed successfully",
    }),
  };
};
