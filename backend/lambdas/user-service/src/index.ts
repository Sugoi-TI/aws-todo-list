import { PostConfirmationTriggerEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { type UserTable } from "@my-app/shared";

const TABLE_NAME = process.env.TABLE_NAME;

const dynamo = new DynamoDBClient({});

export const handler = async (event: PostConfirmationTriggerEvent) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  if (!TABLE_NAME) {
    throw new Error("Critical: TABLE_NAME is not defined in environment variables");
  }

  const { userAttributes } = event.request;
  const { sub, email, name } = userAttributes;

  if (!sub || !email) {
    console.error("Missing required attributes: sub or email", userAttributes);
    return event;
  }

  const user: UserTable = {
    userId: sub,
    email: email,
    name: name || email.split("@")[0], // Fallback if name is missing
    createdAt: new Date().toISOString(),
  };

  try {
    await dynamo.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(user),
      }),
    );
    console.log(`User created: ${user.userId}`);
  } catch (error) {
    console.error("Error saving user to DynamoDB:", error);
    throw error;
  }

  return event;
};
