import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "path";
import createMicroFrontend from "./utils/createMicroFrontend";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "TasksTable", {
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

    const userPool = new cognito.UserPool(this, "TodoUserPool", {
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

    const userPoolClient = new cognito.UserPoolClient(this, "TodoUserPoolClient", {
      userPool,
      generateSecret: false,
    });

    const authorizer = new HttpUserPoolAuthorizer("TodoAuthorizer", userPool, {
      userPoolClients: [userPoolClient],
    });

    const queue = new sqs.Queue(this, "TasksQueue", {
      visibilityTimeout: cdk.Duration.seconds(30), // time to process message
    });

    const timeService = new lambdaNode.NodejsFunction(this, "TimeService", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/time-service/src/index.ts"),
      handler: "handler",
    });

    const taskService = new lambdaNode.NodejsFunction(this, "TaskService", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/task-service/src/index.ts"),
      handler: "handler",
      environment: {
        TIME_SERVICE_ARN: timeService.functionArn,
        TIME_SERVICE_NAME: timeService.functionName,
        QUEUE_URL: queue.queueUrl,
        TABLE_NAME: table.tableName,
      },
    });

    const taskWorker = new lambdaNode.NodejsFunction(this, "TaskWorker", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/task-writer-service/src/index.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    timeService.grantInvoke(taskService);
    queue.grantSendMessages(taskService);
    queue.grantConsumeMessages(taskWorker);
    table.grantWriteData(taskWorker);
    table.grantReadData(taskService);

    taskWorker.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
      }),
    );

    const api = new apigw.HttpApi(this, "TodoApi", {
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

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong",
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

    new cdk.CfnOutput(this, "HostUrl", { value: `https://${hostUrl}` });
    new cdk.CfnOutput(this, "FormUrl", { value: `https://${formUrl}` });
    new cdk.CfnOutput(this, "ListUrl", { value: `https://${listUrl}` });

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
  }
}
