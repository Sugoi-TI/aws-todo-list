import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const QUEUE_URL = process.env.QUEUE_URL;
const TIME_SERVICE_NAME = process.env.TIME_SERVICE_NAME;

// Initialize outside the handler to reuse it if lambda is not could
const sqs = new SQSClient({});
const lambda = new LambdaClient({});

export const handler = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    if (!QUEUE_URL) {
        throw new Error("Critical: QUEUE_URL is not defined in environment variables");
    }

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

        const responseString = new TextDecoder("utf-8").decode(
            timeResponse.Payload,
        );
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
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
        };
    } catch (error) {
        console.error("SQS Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};
