import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import createMicroFrontend from "./utils/createMicroFrontend";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB
    const table = new dynamodb.Table(this, 'TasksTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // free tier (On-demand)
      // removalPolicy: cdk.RemovalPolicy.DESTROY, // Important for test envs to clean up DB
    });

    // 2. SQS
    const queue = new sqs.Queue(this, 'TasksQueue', {
      visibilityTimeout: cdk.Duration.seconds(30), // time to process message
    });

    // 3. Lambdas
    // Using NodejsFunction - it will build  TS files with esbuild

    const timeService = new lambdaNode.NodejsFunction(this, 'TimeService', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../backend/lambdas/time-service/src/index.ts'),
      handler: 'handler',
    });

    const taskService = new lambdaNode.NodejsFunction(this, 'TaskService', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../backend/lambdas/task-service/src/index.ts'),
      handler: 'handler',
      environment: {
        TIME_SERVICE_ARN: timeService.functionArn,
        QUEUE_URL: queue.queueUrl,
      },
    });

    const taskWorker = new lambdaNode.NodejsFunction(this, 'TaskWorker', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../backend/lambdas/task-writer-service/src/index.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // 4. Configure access (IAM)
    timeService.grantInvoke(taskService);
    queue.grantSendMessages(taskService);
    queue.grantConsumeMessages(taskWorker);
    table.grantWriteData(taskWorker);

    // 5. Configure triggers
    taskWorker.addEventSource(new SqsEventSource(queue, {
      batchSize: 10,
    }));

    // 6. API Gateway
    const api = new apigw.HttpApi(this, 'TodoApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST],
      },
    });

    //  POST /tasks
    api.addRoutes({
      path: '/tasks',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('TaskServiceIntegration', taskService),
    });

    // Output URL API into console after deploy
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? 'Something went wrong',
    });

    // 7. Frontend
    const hostUrl = createMicroFrontend(this, 'HostApp', path.join(__dirname, '../../frontend/host/dist'));
    const formUrl = createMicroFrontend(this, 'TodoFormApp', path.join(__dirname, '../../frontend/todo-form/dist'));
    const listUrl = createMicroFrontend(this, 'TodoListApp', path.join(__dirname, '../../frontend/todo-list/dist'));

    // Output frontend URLs
    new cdk.CfnOutput(this, 'HostUrl', { value: `https://${hostUrl}` });
    new cdk.CfnOutput(this, 'FormUrl', { value: `https://${formUrl}` });
    new cdk.CfnOutput(this, 'ListUrl', { value: `https://${listUrl}` });
  }
}