import { Method, Model, TokenAuthorizer } from '@aws-cdk/aws-apigateway';

export interface OpenApiConstruct {
  models: Model[];
  methods: Method[];
  authorizer: TokenAuthorizer;
}

interface OpenApiMethod {
  parameters: {
    name: string;
    in: string;
    required: boolean;
    schema: { type: string };
  }[];
  requestBody: {
    content: { 'application/json': { [key: string]: { $ref: string } } };
    required: boolean;
  };
  responses: {
    [key: string]: {
      description: string;
      headers: any;
    };
  };
  security: { [key: string]: [] }[];
}

interface OpenApiSpec {
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
        required: string[];
        type: string;
        properties: {
          [key: string]: {
            type: string;
            pattern?: string;
          };
        };
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

export const processApiSpec = (api: OpenApiConstruct) => {
  console.log(api.models);
  console.log(api.models[0].toString().split('/')[-1]);
  console.log(api.models[0].node.metadata);
  //   console.log(api.methods);
  //   console.log(api.authorizer);
  const authorizerName = api.authorizer.toString();

  const specOutput: OpenApiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'BlogCdkOpenApi',
      version: new Date().toISOString(),
    },
    paths: {},
    components: {
      schemas: {},
      securitySchemes:
        {
          [authorizerName]: {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'x-amazon-apigateway-authtype': 'custom',
          },
        },
    },
  };

  //   specOutput.paths = api.methods.reduce((p, c) => {
  //     const apiMethod: OpenApiMethod = {
  //       parameters: [],
  //       requestBody: {
  //         content: { 'application/json': { schema: { $ref: '' } } },
  //         required: true,
  //       },
  //       responses: {
  //         200: {
  //           description: '',
  //           headers: {
  //             'Access-Control-Allow-Origin': {
  //               schema: {
  //                 type: 'string',
  //               },
  //             },
  //             'Access-Control-Allow-Credentials': {
  //               schema: {
  //                 type: 'string',
  //               },
  //             },
  //             'Content-Type': {
  //               schema: {
  //                 type: 'string',
  //               },
  //             },
  //             'content': {
  //               'application/json': { schema: { $ref: '' } },
  //             },
  //           },
  //         },
  //       },
  //       security: [
  //         { [authorizerName]: [] },
  //       ],
  //     };
  //     return p;
  //   }, {});
  console.log(specOutput);
};
