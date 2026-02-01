import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EventNames, EventSource, TASK_TABLE, type TaskReceivedPayload } from "@my-app/shared";

const TABLE_NAME = process.env.TABLE_NAME;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;

const ebClient = new EventBridgeClient({});
const dynamo = new DynamoDBClient({});

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
  if (!TABLE_NAME) {
    throw new Error("Critical: TABLE_NAME is not defined in environment variables");
  }

  const userId = event.requestContext.authorizer?.jwt.claims.sub as string;

  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  const method = event.requestContext?.http?.method;

  if (method === "GET") {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: TASK_TABLE.byUserId,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": { S: userId },
        },
        ScanIndexForward: false,
      });

      const result = await dynamo.send(command);

      const tasks = result.Items ? result.Items.map((item) => unmarshall(item)) : [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(tasks),
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

    try {
      console.log("Publishing TaskReceived event...");

      const taskPayload: TaskReceivedPayload = {
        userId,
        title: body.title,
        message: body.message,
        taskId: crypto.randomUUID(),
      };

      const command = new PutEventsCommand({
        Entries: [
          {
            Source: EventSource,
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
