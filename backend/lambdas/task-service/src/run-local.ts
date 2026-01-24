import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./index.js";

const mockEvent: Partial<APIGatewayProxyEvent> = {
  body: JSON.stringify({
    userId: "user-123",
    title: "Купить продукты",
    message: "Нужно купить молоко, хлеб и яйца",
  }),
};

console.log("--- STARTING LOCAL TS TEST ---");
// @ts-ignore
const response = await handler(mockEvent);
console.log("--- RESPONSE ---");
console.log(response);
