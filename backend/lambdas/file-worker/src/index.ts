import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Event } from "aws-lambda";
import { EventNames, FileStatus, EventSource } from "@my-app/shared";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;
const FILE_TABLE_NAME = process.env.FILE_TABLE_NAME;
const FILE_BUCKET_NAME = process.env.FILE_BUCKET_NAME;

const ebClient = new EventBridgeClient({});
const dynamo = new DynamoDBClient({});

export const handler = async (event: S3Event) => {
  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  if (!FILE_TABLE_NAME) {
    throw new Error("Critical: FILE_TABLE_NAME is not defined in environment variables");
  }
  if (!EVENT_BUS_NAME) {
    throw new Error("Critical: EVENT_BUS_NAME is not defined in environment variables");
  }
  if (!FILE_BUCKET_NAME) {
    throw new Error("Critical: FILE_BUCKET_NAME is not defined in environment variables");
  }

  for (const record of event.Records) {
    // TODO check it later
    const bucketName = record.s3.bucket.name;
    const key = record.s3.object.key;
    const parts = key.split("/");
    const fileId = parts[1]?.split("-")[0];
    // ===

    const updateStatusCommand = new UpdateCommand({
      TableName: FILE_TABLE_NAME,
      Key: { fileId },
      UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":status": FileStatus.Uploaded,
        ":updatedAt": new Date().toISOString(),
      },
    });

    try {
      const result = await dynamo.send(updateStatusCommand);
      console.log(`Updated file status: ${fileId}`);
    } catch (error) {
      console.error("File status update failed: ", error);
      throw error;
    }

    const uploadedEventCommand = new PutEventsCommand({
      Entries: [
        {
          Source: EventSource,
          DetailType: EventNames.FileUploaded,
          Detail: JSON.stringify({
            fileId,
            bucketName,
            s3Key: key,
            status: FileStatus.Uploaded,
            uploadedAt: new Date().toISOString(),
          }),
          EventBusName: EVENT_BUS_NAME,
        },
      ],
    });

    try {
      await ebClient.send(uploadedEventCommand);
      console.log(`Published event uploaded fileId: ${fileId}`);
    } catch (error) {
      console.error("Failed to publish event: ", error);
    }
  }

  return {};
};
