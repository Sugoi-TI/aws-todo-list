import { Construct } from "constructs";
import { EntityNames } from "../variables";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { FILE_TABLE, TASK_TABLE, USER_TABLE } from "@my-app/shared";

export const createDynamoTables = (scope: Construct) => {
  // User table
  const userTable = new dynamodb.Table(scope, EntityNames.UserTable, {
    partitionKey: { name: USER_TABLE.partitionKey, type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // free tier (On-demand)
    // removalPolicy: cdk.RemovalPolicy.DESTROY, // Important for test envs to clean up DB
  });

  // Task table
  const taskTable = new dynamodb.Table(scope, EntityNames.TasksTable, {
    partitionKey: { name: TASK_TABLE.partitionKey, type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  });

  taskTable.addGlobalSecondaryIndex({
    indexName: TASK_TABLE.byUserId,
    partitionKey: { name: USER_TABLE.partitionKey, type: dynamodb.AttributeType.STRING },
    sortKey: { name: TASK_TABLE.createdAt, type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  // File table
  const fileTable = new dynamodb.Table(scope, EntityNames.FilesTable, {
    partitionKey: { name: FILE_TABLE.partitionKey, type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  });

  fileTable.addGlobalSecondaryIndex({
    indexName: FILE_TABLE.byUploadedBy,
    partitionKey: { name: FILE_TABLE.uploadedBy, type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  fileTable.addGlobalSecondaryIndex({
    indexName: FILE_TABLE.byTaskId,
    partitionKey: { name: FILE_TABLE.attachedToTaskId, type: dynamodb.AttributeType.STRING },
    sortKey: { name: FILE_TABLE.createdAt, type: dynamodb.AttributeType.STRING },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  return { userTable, taskTable, fileTable };
};
