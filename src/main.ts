import { JsonSchemaType, JsonSchemaVersion, LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';

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

    const restApi = new RestApi(this, 'BlogCdkOpenApi');
    const unvalidatedResource = restApi.root.addResource('unvalidated');
    const unvalidatedHelloResource = unvalidatedResource.addResource(
      '{hello}',
    );
    const unvalidatedHelloBasicResource = unvalidatedHelloResource.addResource(
      'basic',
    );

    const responseModel = restApi.addModel('ResponseModel', {
      contentType: 'application/json',
      modelName: 'ResponseModel',
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        title: 'responseModel',
        type: JsonSchemaType.OBJECT,
        properties: {
          message: { type: JsonSchemaType.STRING },
        },
      },
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
          'application/json': responseModel,
        },
      },
    ];

    unvalidatedHelloBasicResource.addMethod(
      'POST',
      new LambdaIntegration(basicLambda),
      {
        requestParameters: {
          'method.request.path.hello': true,
        },
        methodResponses,
      },
    );
    const unvalidatedHelloAdvancedResource = unvalidatedHelloResource.addResource(
      'advanced',
    );
    unvalidatedHelloAdvancedResource.addMethod(
      'POST',
      new LambdaIntegration(advancedLambda),
      {
        requestParameters: {
          'method.request.path.hello': true,
        },
        methodResponses,
      },
    );

    const validatedResource = restApi.root.addResource('validated');
    const validatedHelloResource = validatedResource.addResource('{hello}');
    const validatedHelloBasicResource = validatedHelloResource.addResource(
      'basic',
    );
    const basicModel = restApi.addModel('BasicModel', {
      contentType: 'application/json',
      modelName: 'BasicModel',
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        title: 'basicModel',
        type: JsonSchemaType.OBJECT,
        properties: {
          someString: { type: JsonSchemaType.STRING },
          someNumber: { type: JsonSchemaType.NUMBER, pattern: '[0-9]+' },
        },
        required: ['someString', 'someNumber'],
      },
    });
    const basicValidator = restApi.addRequestValidator('BasicValidator', {
      validateRequestParameters: true,
      validateRequestBody: true,
    });
    validatedHelloBasicResource.addMethod(
      'POST',
      new LambdaIntegration(basicLambda),
      {
        requestModels: {
          'application/json': basicModel,
        },
        requestParameters: {
          'method.request.path.hello': true,
        },
        requestValidator: basicValidator,
        methodResponses,
      },
    );
    const validatedHellowAdvancedResource = validatedHelloResource.addResource(
      'advanced',
    );
    const advancedModel = restApi.addModel('AdvancedModel', {
      contentType: 'application/json',
      modelName: 'AdvancedModel',
      schema: {
        schema: JsonSchemaVersion.DRAFT4,
        title: 'advancedModel',
        type: JsonSchemaType.OBJECT,
        properties: {
          greeting: { type: JsonSchemaType.STRING },
          postfix: { type: JsonSchemaType.STRING },
          basic: {
            ref: `https://apigateway.amazonaws.com/restapis/${restApi.restApiId}/models/${basicModel.modelId}`,
          },
        },
        required: ['greeting', 'basic'],
      },
    });
    const advancedValidator = restApi.addRequestValidator('AdvancedValidator', {
      validateRequestParameters: true,
      validateRequestBody: true,
    });
    validatedHellowAdvancedResource.addMethod(
      'POST',
      new LambdaIntegration(advancedLambda),
      {
        requestParameters: {
          'method.request.path.hello': true,
        },
        requestValidator: advancedValidator,
        requestModels: {
          'application/json': advancedModel,
        },
        methodResponses,
      },
    );
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
