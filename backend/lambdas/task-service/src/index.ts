import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Клиент инициализируется вне хендлера (Best Practice для переиспользования коннектов)
const sqs = new SQSClient({});
const lambda = new LambdaClient({});
const sqsUrl =
    "https://sqs.eu-central-1.amazonaws.com/248585128710/tasks-queue";

export const handler = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    // В реальном API Gateway body приходит как строка.
    // Но если ты тестируешь локально и передаешь объект, нужно проверить.
    // Безопасный парсинг:
    let body;
    try {
        body = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
        // Если event.body уже объект (бывает в тестах)
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
            FunctionName: "time-service",
            InvocationType: "RequestResponse", // Ждем ответа (синхронно)
        });

        const timeResponse = await lambda.send(invokeCommand);

        // 3. Декодируем ответ от Лямбды
        // Payload приходит как Uint8Array, нужно превратить в строку
        if (!timeResponse.Payload) {
            throw new Error("Time service returned no payload");
        }

        const responseString = new TextDecoder("utf-8").decode(
            timeResponse.Payload,
        );
        const timeData = JSON.parse(responseString); // { "time": "2026-..." }

        console.log("Time received:", timeData.time);

        // 4. Формируем финальный объект для очереди
        const taskPayload = {
            userId: body.userId,
            title: body.title,
            message: body.message,
            createdAt: timeData.time, // Добавили время из сервиса
        };

        const command = new SendMessageCommand({
            QueueUrl: sqsUrl,
            MessageBody: JSON.stringify(taskPayload),
        });

        const result = await sqs.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Task queued",
                id: result.MessageId,
            }),
        };
    } catch (error) {
        console.error("SQS Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};
