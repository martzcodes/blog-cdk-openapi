import { join } from 'path';
import { TokenAuthorizer } from '@aws-cdk/aws-apigateway';
import { AssetCode, Function, Runtime } from '@aws-cdk/aws-lambda';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { OpenApiConstruct, OpenApiSpec } from './api';

interface MyStackProps extends StackProps {
  generateApiSpec: boolean;
}
export class MyStack extends Stack {
  public apiSpec?: OpenApiSpec;

  constructor(scope: Construct, id: string, props: MyStackProps = { generateApiSpec: false }) {
    super(scope, id, props);

    const lambdaProps = {
      handler: 'index.handler',
      runtime: Runtime.NODEJS_12_X,
    };

    const basicLambda = new Function(this, 'basicLambdaFunction', {
      ...lambdaProps,
      code: new AssetCode(`${__dirname}/../dist/basic`),
    });

    const advancedLambda = new Function(this, 'advancedLambdaFunction', {
      ...lambdaProps,
      code: new AssetCode(`${__dirname}/../dist/advanced`),
    });

    const authorizerLambda = new Function(this, 'authorizerLambdaFunction', {
      functionName: 'blogAuthorizer',
      ...lambdaProps,
      code: new AssetCode(`${__dirname}/../dist/authorizer`),
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

    const api = new OpenApiConstruct(this, 'OpenApi', {
      tsconfigPath: `${join(__dirname, '..', 'tsconfig.json')}`,
      apiProps: {
        defaultMethodOptions: {
          authorizer: auth,
        },
      },
      models: `${__dirname}/interfaces`,
    });

    api.addEndpoint('/{hello}/basic', 'POST', {
      lambda: basicLambda,
      requiredParameters: ['hello'],
      requestModels: {
        'application/json': 'Basic',
      },
      methodResponses,
    });

    api.addEndpoint('/{hello}/advanced', 'POST', {
      lambda: advancedLambda,
      requiredParameters: ['hello'],
      requestModels: {
        'application/json': 'Advanced',
      },
      methodResponses,
    });

    if (props.generateApiSpec) {
      this.apiSpec = api.generateOpenApiSpec(join(`${__dirname}`, '..', 'openapigenerated.json'));
    }
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'blog-cdk-openapi', { env: devEnv, generateApiSpec: false });

app.synth();
