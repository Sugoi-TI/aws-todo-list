import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { EventBridgeEvent, SQSEvent } from "aws-lambda";
import { EventNames, type TaskEnrichedPayload, type TaskTable } from "@my-app/shared";

type UnknownEvent = EventBridgeEvent<string, any>;
type EnrichedEvent = EventBridgeEvent<(typeof EventNames)["TaskEnriched"], TaskEnrichedPayload>;

function isEnrichedEvent(event: UnknownEvent): event is EnrichedEvent {
  return event["detail-type"] === EventNames.TaskEnriched;
}

const TABLE_NAME = process.env.TABLE_NAME;

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SQSEvent) => {
  console.log("Received messages: ", event.Records.length);

  if (!TABLE_NAME) {
    throw new Error("Critical: TABLE_NAME is not defined in environment variables");
  }

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);

      if (isEnrichedEvent(body)) {
        console.log(`Parsing task: (Massage ID: ${record.messageId})`);

        if (body.detail.title === "TEST_ERROR") {
          throw new Error("Intentional test error to trigger DLQ");
        }

        const commandItem: TaskTable = {
          taskId: body.detail.taskId,
          userId: body.detail.userId,
          title: body.detail.title,
          message: body.detail.message,
          createdAt: body.detail.createdAt,
          status: "NEW",
        };

        const command = new PutCommand({
          TableName: TABLE_NAME,
          Item: commandItem,
        });

        await docClient.send(command);
        console.log("Data saved in the DB");
      }
    } catch (error) {
      console.error("Parsing message error: ", error);
      throw error;
      // Throw or SQS will consider task done
    }
  }

  return {};
};
