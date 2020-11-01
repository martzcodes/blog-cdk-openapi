import {
  LambdaIntegration,
  MethodResponse,
  Model,
  ModelOptions,
  RequestValidator,
  Resource,
  RestApi,
  TokenAuthorizer,
} from '@aws-cdk/aws-apigateway';
import { Function } from '@aws-cdk/aws-lambda';
import { Construct } from '@aws-cdk/core';

export interface OpenApiProps {
  authorizer?: TokenAuthorizer;
  models: { [key: string]: ModelOptions };
  paths: {
    [key: string]: {
      method: string;
      lambda: Function;
      requiredParameters: string[];
      requestModels: { [key: string]: string };
      methodResponses: MethodResponse[];
    };
  };
}

export class OpenApiConstruct extends Construct {
  restApi: RestApi;
  validators: {
    [key: string]: RequestValidator;
  };
  resources: {
    [key: string]: Resource;
  };
  models: {
    [key: string]: Model;
  };

  constructor(scope: Construct, id: string, props: OpenApiProps) {
    super(scope, id);
    console.log(props);
    if (props.authorizer) {
      this.restApi = new RestApi(this, 'BlogCdkOpenApi', {
        defaultMethodOptions: {
          authorizer: props.authorizer,
        },
      });
    } else {
      this.restApi = new RestApi(this, 'BlogCdkOpenApi', {});
    }
    this.models = Object.keys(props.models).reduce((p, modelName) => {
      return {
        ...p,
        [modelName]: this.restApi.addModel(modelName, props.models[modelName]),
      };
    }, {});
    this.validators = {};
    this.resources = {};
    Object.keys(props.paths)
      .sort()
      .forEach((path) => {
        const splitPath = path.split('/');
        for (let j = 1; j < splitPath.length; j++) {
          const tempPath = path.split('/').slice(0, j).join('/');
          if (!(tempPath in this.resources)) {
            if (j === 1) {
              this.resources[tempPath] = this.restApi.root.addResource(
                splitPath[j],
              );
            } else {
              this.resources[tempPath] = this.resources[
                tempPath.split('/').splice(0, -1).join('/')
              ].addResource(splitPath[j]);
            }
          }
        }
        const pathProps = props.paths[path];

        const validator: { requestValidator?: RequestValidator } = {};
        if (
          pathProps.requiredParameters.length > 0 &&
        Object.keys(pathProps.requestModels).length > 0
        ) {
          if (!('paramBodyValidator' in this.validators)) {
            this.validators.paramBodyValidator = this.restApi.addRequestValidator(
              'paramBodyValidator',
              {
                validateRequestBody: true,
                validateRequestParameters: true,
              },
            );
          }
          validator.requestValidator = this.validators.paramBodyValidator;
        } else if (pathProps.requiredParameters.length > 0) {
          if (!('paramValidator' in this.validators)) {
            this.validators.paramValidator = this.restApi.addRequestValidator(
              'paramValidator',
              {
                validateRequestParameters: true,
              },
            );
          }
          validator.requestValidator = this.validators.paramValidator;
        } else if (Object.keys(pathProps.requestModels).length > 0) {
          if (!('bodyValidator' in this.validators)) {
            this.validators.bodyValidator = this.restApi.addRequestValidator(
              'bodyValidator',
              {
                validateRequestBody: true,
              },
            );
          }
          validator.requestValidator = this.validators.bodyValidator;
        }

        this.resources[path].addMethod(
          pathProps.method,
          new LambdaIntegration(pathProps.lambda),
          {
            requestModels: Object.keys(pathProps.requestModels).reduce(
              (p, c) => {
                return { ...p, [c]: this.models[pathProps.requestModels[c]] };
              },
              {},
            ),
            requestParameters: pathProps.requiredParameters.reduce(
              (p, param) => {
                return { ...p, [`method.request.path.${param}`]: true };
              },
              {},
            ),
            ...validator,
            ...pathProps.methodResponses,
          },
        );
      });
  }
}
