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

    // Get environment variables or use defaults
    // const environment = props?.env?.account ? "prod" : "dev";

    // Create DynamoDB table with configurable name
    const tableName = new cdk.CfnParameter(this, "TableName", {
      type: "String",
      description: "DynamoDB table name",
      // default: `todo-tasks-${environment}`,
    });

    const table = new dynamodb.Table(this, "TasksTable", {
      tableName: tableName.valueAsString,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    table.addGlobalSecondaryIndex({
      indexName: "byUserId",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const userPool = new cognito.UserPool(this, "TodoUserPool", {
      // userPoolName: `todo-user-pool-${environment}`,
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

    // Create SQS queue with configurable name
    const queueName = new cdk.CfnParameter(this, "QueueName", {
      type: "String",
      description: "SQS queue name",
      // default: `todo-tasks-queue-${environment}`,
    });

    const queue = new sqs.Queue(this, "TasksQueue", {
      queueName: queueName.valueAsString,
      visibilityTimeout: cdk.Duration.seconds(30),
    });

    // Create Lambda functions with configurable environment variables
    const timeService = new lambdaNode.NodejsFunction(this, "TimeService", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/time-service/src/index.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
    });

    const taskService = new lambdaNode.NodejsFunction(this, "TaskService", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/task-service/src/index.ts"),
      handler: "handler",
      environment: {
        TIME_SERVICE_ARN: timeService.functionArn,
        TIME_SERVICE_NAME: timeService.functionName,
        QUEUE_URL: queue.queueUrl,
        TABLE_NAME: tableName.valueAsString,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const taskWorker = new lambdaNode.NodejsFunction(this, "TaskWorker", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../backend/lambdas/task-writer-service/src/index.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: tableName.valueAsString,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant proper permissions
    timeService.grantInvoke(taskService);
    queue.grantSendMessages(taskService);
    queue.grantConsumeMessages(taskWorker);
    table.grantWriteData(taskWorker);
    table.grantReadData(taskService);

    // Add SQS event source to task worker
    taskWorker.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
      }),
    );

    // Create API Gateway with proper CORS
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

    // Create micro-frontend outputs
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

    // Output all required values
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong",
      description: "API Gateway URL",
    });
    new cdk.CfnOutput(this, "HostUrl", {
      value: `https://${hostUrl}`,
      description: "Host application URL",
    });
    new cdk.CfnOutput(this, "FormUrl", {
      value: `https://${formUrl}`,
      description: "Form application URL",
    });
    new cdk.CfnOutput(this, "ListUrl", {
      value: `https://${listUrl}`,
      description: "List application URL",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });
    new cdk.CfnOutput(this, "TableName", {
      value: tableName.valueAsString,
      description: "DynamoDB table name",
    });
    new cdk.CfnOutput(this, "QueueUrl", {
      value: queue.queueUrl,
      description: "SQS Queue URL",
    });
    new cdk.CfnOutput(this, "QueueName", {
      value: queue.queueName,
      description: "SQS Queue Name",
    });
  }
}
