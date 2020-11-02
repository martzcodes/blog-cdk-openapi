import {
  LambdaIntegration,
  Model,
  ModelOptions,
  RequestValidator,
  Resource,
  RestApi,
  RestApiProps,
} from '@aws-cdk/aws-apigateway';
import { Function } from '@aws-cdk/aws-lambda';
import { Construct } from '@aws-cdk/core';
import { getSchemas } from './util/ast';

interface CustomMethodResponse {
  statusCode: string;
  responseParameters: {
    [key: string]: boolean;
  };
  responseModels: {
    [key: string]: string;
  };
}

export interface OpenApiProps {
  api: RestApiProps;
  models: string;
  paths: {
    [key: string]: {
      [key: string]: {
        lambda: Function;
        requiredParameters: string[];
        requestModels: { [key: string]: string };
        methodResponses: CustomMethodResponse[];
      };
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

    this.restApi = new RestApi(this, `${id}Api`, props.api);
    const modelSchemas: { [key: string]: ModelOptions } = getSchemas(
      `${__dirname}/interfaces`,
      this.restApi.restApiId,
    );

    console.log(modelSchemas);

    this.models = {};

    const addModel = (modelName: string, modelSchema: ModelOptions) => {
      this.models[modelName] = this.restApi.addModel(
        modelSchema.modelName || '',
        modelSchema,
      );
    };

    this.validators = {};
    this.resources = {};
    Object.keys(props.paths)
      .sort()
      .forEach((path) => {
        const splitPath = path.split('/');
        for (let j = 2; j <= splitPath.length; j++) {
          const tempPath = splitPath.slice(0, j).join('/');
          if (!(tempPath in this.resources)) {
            if (j === 2) {
              this.resources[tempPath] = this.restApi.root.addResource(splitPath[j-1]);
            } else {
              this.resources[tempPath] = this.resources[
                splitPath.slice(0, j-1).join('/')
              ].addResource(splitPath[j-1]);
            }
          }
        }
        Object.keys(props.paths[path]).forEach((method) => {
          const pathProps = props.paths[path][method];
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

          const methodProps = {
            requestModels: Object.keys(pathProps.requestModels).reduce(
              (p, c) => {
                if (!(pathProps.requestModels[c] in this.models)) {
                  addModel(pathProps.requestModels[c], modelSchemas[pathProps.requestModels[c]]);
                }
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
            methodResponses: pathProps.methodResponses.map((methodResponse) => {
              return {
                ...methodResponse,
                responseModels: Object.keys(methodResponse.responseModels).reduce((p, c) => {
                  if (!(methodResponse.responseModels[c] in this.models)) {
                    addModel(methodResponse.responseModels[c], modelSchemas[methodResponse.responseModels[c]]);
                  }
                  return {
                    ...p,
                    [c]: this.models[methodResponse.responseModels[c]],
                  };
                }, {}),
              };
            }),
          };

          console.log(methodProps);

          this.resources[path].addMethod(
            method,
            new LambdaIntegration(pathProps.lambda),
            methodProps,
          );
        });
      });
  }
}
