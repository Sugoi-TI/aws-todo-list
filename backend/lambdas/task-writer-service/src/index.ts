import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSEvent } from "aws-lambda";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event: SQSEvent) => {
    console.log("Received messages: ", event.Records.length);

    if (!TABLE_NAME) {
        throw new Error("Critical: TABLE_NAME is not defined in environment variables");
    }

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);

            console.log(
                `Parsing task: ${body.title} (Massage ID: ${record.messageId})`,
            );

            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    id: record.messageId,
                    userId: body.userId,
                    title: body.title,
                    message: body.message,
                    createdAt: body.createdAt,
                    status: "NEW",
                },
            });

            await docClient.send(command);
            console.log("Data saved in the DB");
        } catch (error) {
            console.error("Parsing message error: ", error);
            throw error;
            // Throw or SQS will consider task done
        }
    }

    return {};
};
