import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";
import createMicroFrontend from "./utils/createMicroFrontend";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { EntityNames } from "./variables";
import { EventNames, EventSource, TaskRules } from "@my-app/shared";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, EntityNames.TasksTable, {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // free tier (On-demand)
      // removalPolicy: cdk.RemovalPolicy.DESTROY, // Important for test envs to clean up DB
    });

    table.addGlobalSecondaryIndex({
      indexName: "byUserId",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const userPool = new cognito.UserPool(this, EntityNames.TodoUserPool, {
      userPoolName: "todo-user-pool",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, EntityNames.TodoUserPoolClient, {
      userPool,
      generateSecret: false,
    });

    const authorizer = new HttpUserPoolAuthorizer(EntityNames.TodoAuthorizer, userPool, {
      userPoolClients: [userPoolClient],
    });

    const queue = new sqs.Queue(this, EntityNames.TasksQueue, {
      visibilityTimeout: cdk.Duration.seconds(30), // time to process message
    });

    const eventBus = new events.EventBus(this, EntityNames.TasksEventBus);

    const timeService = new lambdaNode.NodejsFunction(this, EntityNames.TimeService, {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/time-service/src/index.ts"),
      handler: "handler",
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
    });

    const taskService = new lambdaNode.NodejsFunction(this, EntityNames.TaskService, {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/task-service/src/index.ts"),
      handler: "handler",
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
        TABLE_NAME: table.tableName,
      },
    });

    const taskWorker = new lambdaNode.NodejsFunction(this, EntityNames.TaskWorker, {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/task-writer-service/src/index.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    const enrichTaskRule = new events.Rule(this, TaskRules.EnrichTaskRule, {
      eventBus: eventBus,
      eventPattern: {
        source: [EventSource],
        detailType: [EventNames.TaskReceived],
      },
    });
    enrichTaskRule.addTarget(new targets.LambdaFunction(timeService));

    const saveTaskRule = new events.Rule(this, TaskRules.SaveTaskRule, {
      eventBus: eventBus,
      eventPattern: {
        source: [EventSource],
        detailType: [EventNames.TaskEnriched],
      },
    });
    saveTaskRule.addTarget(new targets.SqsQueue(queue));

    eventBus.grantPutEventsTo(taskService);
    eventBus.grantPutEventsTo(timeService);
    table.grantWriteData(taskWorker);
    table.grantReadData(taskService);

    queue.grantConsumeMessages(taskWorker);
    taskWorker.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
      }),
    );

    const api = new apigw.HttpApi(this, EntityNames.TodoApi, {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"],
        maxAge: cdk.Duration.days(1),
      },
    });

    api.addRoutes({
      path: "/tasks",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration("TaskServiceIntegration", taskService),
      authorizer,
    });

    const hostUrl = createMicroFrontend(
      this,
      "HostApp",
      path.join(__dirname, "../../frontend/host/dist"),
    );
    const formUrl = createMicroFrontend(
      this,
      "TodoFormApp",
      path.join(__dirname, "../../frontend/todo-form/dist"),
    );
    const listUrl = createMicroFrontend(
      this,
      "TodoListApp",
      path.join(__dirname, "../../frontend/todo-list/dist"),
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong",
    });
    new cdk.CfnOutput(this, "hostUrl", { value: `https://${hostUrl}` });
    new cdk.CfnOutput(this, "formUrl", { value: `https://${formUrl}` });
    new cdk.CfnOutput(this, "listUrl", { value: `https://${listUrl}` });

    new cdk.CfnOutput(this, "queueUrl", { value: queue.queueUrl });
    new cdk.CfnOutput(this, "timeServiceName", { value: timeService.functionName });
    new cdk.CfnOutput(this, "tableName", { value: table.tableName });

    new cdk.CfnOutput(this, "userPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "userPoolClientId", { value: userPoolClient.userPoolClientId });

    new cdk.CfnOutput(this, "eventBusName", { value: eventBus.eventBusName });
  }
}
