import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

const createMicroFrontend = (scope: Construct, id: string, pathDist: string): string => {
    // 1. Bucket
    const bucket = new s3.Bucket(scope, `${id}Bucket`, {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        cors: [{
            allowedMethods: [s3.HttpMethods.GET],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
        }],
    });

    // 2. CloudFront
    const distribution = new cloudfront.Distribution(scope, `${id}Distribution`, {
        defaultBehavior: {
            origin: new origins.S3Origin(bucket),
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // usefull to disable for tests
        },
        defaultRootObject: 'index.html',
        errorResponses: [
            {
                httpStatus: 403,
                responseHttpStatus: 200,
                responsePagePath: '/index.html',
            },
            {
                httpStatus: 404,
                responseHttpStatus: 200,
                responsePagePath: '/index.html',
            },
        ],
    });

    // 3. Deploy
    new s3deploy.BucketDeployment(scope, `${id}Deploy`, {
        sources: [s3deploy.Source.asset(pathDist)],
        destinationBucket: bucket,
        distribution,
        distributionPaths: ['/*'],
    });

    return distribution.distributionDomainName;
};

export default createMicroFrontend;