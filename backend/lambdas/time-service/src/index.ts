import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { EventBridgeEvent } from "aws-lambda";
import {
  EventNames,
  EventSource,
  type TaskReceivedPayload,
  type TaskEnrichedPayload,
} from "@my-app/shared";

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;
const ebClient = new EventBridgeClient({});

export const handler = async (
  event: EventBridgeEvent<(typeof EventNames)["TaskReceived"], TaskReceivedPayload>,
) => {
  if (!EVENT_BUS_NAME) {
    throw new Error("Critical: EVENT_BUS_NAME is not defined in environment variables");
  }

  const now = new Date().toISOString();
  console.log("Generating time:", now);

  const taskPayload: TaskEnrichedPayload = {
    ...event.detail,
    createdAt: now,
  };

  const command = new PutEventsCommand({
    Entries: [
      {
        Source: EventSource,
        DetailType: EventNames.TaskEnriched,
        Detail: JSON.stringify(taskPayload),
        EventBusName: EVENT_BUS_NAME,
      },
    ],
  });

  try {
    const result = await ebClient.send(command);

    console.log(`Event published ID: ${result.Entries?.[0].EventId}`);

    return {
      statusCode: 202,
      body: JSON.stringify({
        message: "Task accepted for processing",
        eventId: result.Entries?.[0].EventId,
        taskId: taskPayload.taskId,
      }),
    };
  } catch (error) {
    console.error("Bus Error:", error);
    return {
      statusCode: 500,
    };
  }
};
