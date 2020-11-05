import { writeFileSync } from 'fs';
import {
  LambdaIntegration,
  Model,
  ModelOptions,
  RequestValidator,
  Resource,
  RestApi,
  RestApiProps,
  MethodOptions,
  IModel,
  JsonSchema,
} from '@aws-cdk/aws-apigateway';
import { Function as LambdaFunction } from '@aws-cdk/aws-lambda';
import { Construct } from '@aws-cdk/core';
import { getSchemas, apiToSpec } from './util/schema';

export interface CustomMethodResponse {
  statusCode: string;
  responseParameters: {
    [key: string]: boolean;
  };
  responseModels: {
    [key: string]: string;
  };
}

interface OpenApiPathProps {
  lambda: LambdaFunction;
  requiredParameters: string[];
  requestModels: { [key: string]: string };
  methodResponses: CustomMethodResponse[];
}

interface OpenApiRequestBody {
  content: { [key: string]: { [key: string]: { $ref: string } } };
  required: boolean;
}
interface OpenApiMethod {
  parameters: {
    name: string;
    in: string;
    required: boolean;
    schema: { type: string };
  }[];
  requestBody?: OpenApiRequestBody;
  responses: {
    [key: string]: {
      description: string;
      headers: Record<string, unknown>;
      content: Record<string, unknown>;
    };
  };
  security: { [key: string]: [] }[];
}

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string };
  paths: {
    [key: string]: {
      [key: string]: OpenApiMethod;
    };
  };
  components: {
    schemas: {
      [key: string]: {
        title: string;
        required?: string[];
        type: string;
        properties: JsonSchema['properties'];
      };
    };
    securitySchemes: {
      [key: string]: {
        type: 'apiKey';
        name: 'Authorization';
        in: 'header';
        'x-amazon-apigateway-authtype': 'custom';
      };
    };
  };
}

export interface OpenApiProps {
  tsconfigPath: string;
  apiProps: RestApiProps;
  models: string;
}

export class OpenApiConstruct extends Construct {
  public restApi: RestApi;
  validators: {
    [key: string]: RequestValidator;
  };
  resources: {
    [key: string]: Resource;
  };
  models: {
    [key: string]: Model;
  };
  schemas: {
    [key: string]: ModelOptions;
  };
  openApiSpec: OpenApiSpec;

  constructor(scope: Construct, id: string, props: OpenApiProps) {
    super(scope, id);

    this.restApi = new RestApi(this, `${id}`, props.apiProps);
    this.schemas = getSchemas(`${props.tsconfigPath}`, `${props.models}`, this.restApi.restApiId);

    this.models = {};
    this.validators = {};
    this.resources = {};
    this.openApiSpec = {
      openapi: '3.0.1',
      info: {
        title: `${id}`,
        version: new Date().toISOString(),
      },
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
    };
    if (props.apiProps.defaultMethodOptions && props.apiProps.defaultMethodOptions.authorizer) {
      this.openApiSpec.components.securitySchemes.authorizer = {
        'type': 'apiKey',
        'name': 'Authorization',
        'in': 'header',
        'x-amazon-apigateway-authtype': 'custom',
      };
    }
  }

  addValidator(key: string, params: boolean, body: boolean): void {
    if (Object.keys(this.validators).includes(key)) {
      return;
    }
    this.validators[key] = this.restApi.addRequestValidator(key, {
      validateRequestBody: body,
      validateRequestParameters: params,
    });
  }

  addModel(modelName: string, modelSchema: ModelOptions): void {
    if (Object.keys(this.models).includes(modelName)) {
      return;
    }
    this.models[modelName] = this.restApi.addModel(
      (modelSchema as { modelName: string }).modelName,
      modelSchema as ModelOptions,
    );
    const modelProps = (modelSchema.schema as { properties: JsonSchema['properties'] }).properties;
    this.openApiSpec.components.schemas[(modelSchema as { modelName: string }).modelName] = {
      title: (modelSchema as { modelName: string }).modelName,
      type: 'object',
      properties: modelProps,
    };
    if (modelSchema.schema.required && modelSchema.schema.required.length > 0) {
      this.openApiSpec.components.schemas[(modelSchema as { modelName: string }).modelName].required =
        modelSchema.schema.required;
    }
  }

  addResourcesForPath(path: string): void {
    const splitPath = path.split('/');
    for (let j = 2; j <= splitPath.length; j++) {
      const tempPath = splitPath.slice(0, j).join('/');
      if (!(tempPath in this.resources)) {
        if (j === 2) {
          this.resources[tempPath] = this.restApi.root.addResource(splitPath[j - 1]);
        } else {
          this.resources[tempPath] = this.resources[splitPath.slice(0, j - 1).join('/')].addResource(splitPath[j - 1]);
        }
      }
    }
  }

  addEndpoint(path: string, method: string, pathProps: OpenApiPathProps): void {
    if (!(path in this.openApiSpec.paths)) {
      this.openApiSpec.paths[path] = {};
    }
    const pathParametersExp = RegExp('{([^}]*)}', 'g');
    let match;
    const parameters: string[] = [];
    while ((match = pathParametersExp.exec(path)) !== null) {
      parameters.push(match[1]);
    }

    this.addResourcesForPath(path);
    const validator: { requestValidator?: RequestValidator } = {};
    const validateBody = Object.keys(pathProps.requestModels).length > 0;
    const validateParams = pathProps.requiredParameters.length > 0;
    const validatorName = `validator${validateParams ? 'Params' : ''}${validateBody ? 'Body' : ''}`;
    this.addValidator(validatorName, validateParams, validateBody);
    validator.requestValidator = this.validators[validatorName];

    this.openApiSpec.paths[path][method.toLowerCase()] = {
      parameters: parameters.map((pathParam) => ({
        name: pathParam,
        in: 'path',
        required: pathProps.requiredParameters.includes(pathParam),
        schema: {
          type: 'string',
        },
      })),
      responses: {},
      security: Object.keys(this.openApiSpec.components.securitySchemes).map((security) => ({
        [security]: [],
      })),
    };
    if (validateBody) {
      this.openApiSpec.paths[path][method.toLowerCase()].requestBody = {
        content: {},
        required: true,
      };
    }

    const methodProps: MethodOptions = {
      requestModels: Object.keys(pathProps.requestModels).reduce((p, c) => {
        if (!(pathProps.requestModels && pathProps.requestModels[c])) {
          return p;
        }
        this.addModel(pathProps.requestModels[c], this.schemas[pathProps.requestModels[c]]);
        (this.openApiSpec.paths[path][method.toLowerCase()] as {
          requestBody: OpenApiRequestBody;
        }).requestBody.content[c] = {
          schema: { $ref: `#/components/schemas/${this.schemas[pathProps.requestModels[c]].modelName}` },
        };
        return { ...p, [c]: this.models[pathProps.requestModels[c]] as IModel };
      }, {}),
      requestParameters: pathProps.requiredParameters.reduce((p, param) => {
        return { ...p, [`method.request.path.${param}`]: true };
      }, {}),
      ...validator,
      methodResponses: pathProps.methodResponses.map((methodResponse) => {
        this.openApiSpec.paths[path][method.toLowerCase()].responses[methodResponse.statusCode] = {
          description: `${methodResponse.statusCode} response`,
          headers: {
            'Access-Control-Allow-Origin': {
              schema: {
                type: 'string',
              },
            },
            'Access-Control-Allow-Credentials': {
              schema: {
                type: 'string',
              },
            },
            'Content-Type': {
              schema: {
                type: 'string',
              },
            },
          },
          content: {},
        };
        return {
          ...methodResponse,
          responseModels: Object.keys(methodResponse.responseModels).reduce((p, c) => {
            if (c === 'text/plain') {
              this.openApiSpec.paths[path][method.toLowerCase()].responses[methodResponse.statusCode].content[c] = {
                schema: {
                  type: 'string',
                },
              };
              return {
                ...p,
                [c]: {
                  schema: {
                    type: 'string',
                  },
                },
              };
            }
            this.openApiSpec.paths[path][method.toLowerCase()].responses[methodResponse.statusCode].content[c] = {
              schema: {
                $ref: `#/components/schemas/${methodResponse.responseModels[c]}Model`,
              },
            };
            this.addModel(methodResponse.responseModels[c], this.schemas[methodResponse.responseModels[c]]);
            return {
              ...p,
              [c]: this.models[methodResponse.responseModels[c]],
            };
          }, {}),
        };
      }),
    };

    this.resources[path].addMethod(method, new LambdaIntegration(pathProps.lambda), methodProps);
  }

  generateOpenApiSpec(outputPath: string): OpenApiSpec {
    apiToSpec(this.openApiSpec);
    writeFileSync(outputPath, JSON.stringify(this.openApiSpec, null, 2));
    return this.openApiSpec;
  }
}