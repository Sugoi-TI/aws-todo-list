import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import type { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { EventNames, EventSources, type S3EventBridgeDetail } from "@my-app/shared";

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
    if (parts.length < 2) {
      console.warn(`Skipping key with unexpected format: ${key}`);
    }
    const fileNamePart = parts[1];
    const firstHyphenIndex = fileNamePart.indexOf("-");
    if (firstHyphenIndex === -1) {
      console.warn(`Skipping file name with unexpected format: ${fileNamePart}`);
    }

    const fileId = fileNamePart.substring(0, firstHyphenIndex);

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
            userId: parts[0],
            s3Key: key,
            status: "uploaded",
            fileName: fileNamePart.substring(firstHyphenIndex + 1),
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
