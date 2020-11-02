import { TokenAuthorizer } from '@aws-cdk/aws-apigateway';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { OpenApiConstruct } from './api';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const basicLambda = new NodejsFunction(this, 'basicLambdaFunction', {
      entry: `${__dirname}/lambdas/basic.ts`,
      handler: 'handler',
      runtime: Runtime.NODEJS_12_X,
    });

    const advancedLambda = new NodejsFunction(this, 'advancedLambdaFunction', {
      entry: `${__dirname}/lambdas/advanced.ts`,
      handler: 'handler',
      runtime: Runtime.NODEJS_12_X,
    });

    const authorizerLambda = new NodejsFunction(this, 'authorizerLambdaFunction', {
      functionName: 'blogAuthorizer',
      entry: `${__dirname}/lambdas/authorizer.ts`,
      handler: 'handler',
      runtime: Runtime.NODEJS_12_X,
    });

    const auth = new TokenAuthorizer(this, 'blogAuthorizer', {
      handler: authorizerLambda,
    });

    const methodResponses = [
      {
        // Successful response from the integration
        statusCode: '200',
        // Define what parameters are allowed or not
        responseParameters: {
          'method.response.header.Content-Type': true,
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
        },
        // Validate the schema on the response
        responseModels: {
          'application/json': 'Response',
        },
      },
    ];

    new OpenApiConstruct(this, 'OpenApi', {
      api: {
        defaultMethodOptions: {
          authorizer: auth,
        },
      },
      models: `${__dirname}/interfaces`,
      paths: {
        '/{hello}/basic': {
          POST: {
            lambda: basicLambda,
            requiredParameters: ['hello'],
            requestModels: {
              'application/json': 'Basic',
            },
            methodResponses,
          },
        },
        '/{hello}/advanced': {
          POST: {
            lambda: advancedLambda,
            requiredParameters: ['hello'],
            requestModels: {
              'application/json': 'Advanced',
            },
            methodResponses,
          },
        },
      },
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'blog-cdk-openapi', { env: devEnv });

app.synth();
