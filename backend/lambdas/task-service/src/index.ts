import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const QUEUE_URL = process.env.QUEUE_URL;
const TIME_SERVICE_NAME = process.env.TIME_SERVICE_NAME;
const TABLE_NAME = process.env.TABLE_NAME;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Initialize outside the handler to reuse it if lambda is not could
const sqs = new SQSClient({});
const lambda = new LambdaClient({});
const dynamo = new DynamoDBClient({});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!QUEUE_URL) {
    throw new Error("Critical: QUEUE_URL is not defined in environment variables");
  }
  if (!TIME_SERVICE_NAME) {
    throw new Error("Critical: TIME_SERVICE_NAME is not defined in environment variables");
  }
  if (!TABLE_NAME) {
    throw new Error("Critical: TABLE_NAME is not defined in environment variables");
  }

  const method = event.requestContext?.http?.method;

  if (method === "GET") {
    try {
      // later will be fetched by user Id
      const command = new ScanCommand({
        TableName: TABLE_NAME,
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

    if (!body || !body.userId || !body.title || !body.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing userId, title or message",
        }),
      };
    }

    try {
      console.log("Calling time-service...");

      const invokeCommand = new InvokeCommand({
        FunctionName: TIME_SERVICE_NAME,
        InvocationType: "RequestResponse",
      });

      const timeResponse = await lambda.send(invokeCommand);

      if (!timeResponse.Payload) {
        throw new Error("Time service returned no payload");
      }

      const responseString = new TextDecoder("utf-8").decode(timeResponse.Payload);
      const timeData = JSON.parse(responseString); // { "time": "2026-..." }

      console.log("Time received:", timeData.time);

      const taskPayload = {
        userId: body.userId,
        title: body.title,
        message: body.message,
        createdAt: timeData.time,
      };

      const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(taskPayload),
      });

      const result = await sqs.send(command);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Task queued",
          id: result.MessageId,
        }),
        headers,
      };
    } catch (error) {
      console.error("SQS Error:", error);
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
