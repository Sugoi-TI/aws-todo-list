import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSEvent } from "aws-lambda";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: SQSEvent) => {
    console.log("Received messages: ", event.Records.length);

    for (const record of event.Records) {
        try {
            // 1. Парсим сообщение из SQS
            // Внимание: SQS присылает body всегда строкой
            const body = JSON.parse(record.body);

            console.log(
                `Обрабатываю задачу: ${body.title} (ID сообщения: ${record.messageId})`,
            );

            // 2. Пишем в DynamoDB
            const command = new PutCommand({
                TableName: "Tasks", // Убедись, что имя таблицы совпадает с созданной в консоли
                Item: {
                    id: record.messageId, // Генерируем ID на основе ID сообщения SQS
                    userId: body.userId,
                    title: body.title,
                    message: body.message,
                    createdAt: body.createdAt, // Время, которое добавил time-service
                    status: "NEW",
                },
            });

            await docClient.send(command);
            console.log("Успешно сохранено в БД");
        } catch (error) {
            console.error("Ошибка обработки сообщения:", error);
            throw error;
            // Важно: если не выбросить ошибку (throw), SQS посчитает, что сообщение обработано
        }
    }

    return {};
};
