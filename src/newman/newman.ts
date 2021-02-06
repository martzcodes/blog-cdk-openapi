/* eslint-disable import/no-extraneous-dependencies */
import { run } from 'newman';
import { Collection, Event, Item, ItemGroup, RequestBody, Variable } from 'postman-collection';
import * as apiJson from './api.json';
import { checkResponseItems, checkStatus } from './checks';

interface ApiTestConfig {
  name: string;
  description?: string;
  path: string;
  method: string;
  status: number;
  pathParams: Record<string, string>;
  body?: any;
  responseValues?: Record<string, string>;
}

const testGroups: Record<string, ApiTestConfig[]> = {
  Basic: [
    {
      name: 'Basic Hello Check',
      path: '/example/:hello/basic',
      method: 'POST',
      pathParams: {
        hello: 'heyCheck',
      },
      status: 200,
      responseValues: {
        message: 'Hello heyCheck.  How many times have you some string?  12 times.',
      },
      body: {
        someString: 'some string',
        someNumber: 12,
      },
    },

  ],
  Advanced: [
    {
      name: 'Advanced Hello Check',
      path: '/example/:hello/advanced',
      method: 'POST',
      pathParams: {
        hello: 'hiCheck',
      },
      status: 200,
      responseValues: {
        message: 'greeting hiCheck.  How many times have you some string?  12 times. some postfix',
      },
      body: {
        greeting: 'greeting',
        basic: {
          someString: 'some string',
          someNumber: 12,
        },
        postfix: 'some postfix',
      },
    },
  ],
  MissingParameters: [
    {
      name: 'Basic Hello Check',
      path: '/example/:hello/basic',
      method: 'POST',
      pathParams: {
        hello: '',
      },
      status: 400,
      body: {
        someString: 'some string',
        someNumber: 12,
      },
    },
    {
      name: 'Advanced Hello Check',
      path: '/example/:hello/advanced',
      method: 'POST',
      pathParams: {
        hello: '',
      },
      status: 400,
      body: {
        greeting: 'greeting',
        basic: {
          someString: 'some string',
          someNumber: 12,
        },
        postfix: 'some postfix',
      },
    },
  ],
  InvalidBody: [
    {
      name: 'Basic Hello Check',
      path: '/example/:hello/basic',
      method: 'POST',
      pathParams: {
        hello: 'heyCheck',
      },
      status: 400,
      body: {},
    },
    {
      name: 'Advanced Hello Check',
      path: '/example/:hello/advanced',
      method: 'POST',
      pathParams: {
        hello: 'hiCheck',
      },
      status: 400,
      body: {
        greeting: 'greeting',
        postfix: 'some postfix',
      },
    },
  ],
};

const findItem = (collection: Collection, path: string, method: string): Item | null => {
  let found = null;
  collection.forEachItem((item) => {
    if (item.name === path && item.request.method === method.toUpperCase()) {
      found = item;
    }
  });
  return found;
};

const generateTestItem = (collection: Collection, testConfig: ApiTestConfig) => {
  const item = findItem(collection, `{{baseUrl}}${testConfig.path}`, testConfig.method) as Item;
  if (!item) {
    throw new Error(`Misconfigured test: ${testConfig.name} - ${testConfig.path}`);
  }
  item.events.clear();
  item.responses.clear();
  item.events.add(
    new Event({
      listen: 'test',
      script: {
        exec: [
          'console.log(pm.response.json());',
          ...checkStatus(testConfig.status),
          ...checkResponseItems(testConfig.responseValues || {}),
        ],
        type: 'text/javascript',
      },
    }),
  );
  item.request.addHeader({
    key: 'Content-Type',
    value: 'application/json',
  });
  if (testConfig.body) {
    item.request.body = new RequestBody({
      mode: 'raw',
      raw: JSON.stringify(testConfig.body),
    });
  }
  const itemJson = item.toJSON();
  delete itemJson.request?.auth;
  delete itemJson.response;
  const testItem = new Item(itemJson);
  testItem.name = testConfig.name;
  Object.keys(testConfig.pathParams).forEach((pathParam) => {
    testItem.request.url.variables.upsert(
      new Variable({ id: pathParam, value: testConfig.pathParams[pathParam], type: 'string' }),
    );
  });
  if (testConfig.description) {
    testItem.describe(testConfig.description);
  }

  return testItem;
};

const testApi = async (apiTestUrl: string) => {
  const generated = new Collection(apiJson);
  const customized = new Collection({
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: 'asdf',
          type: 'string',
        },
      ],
    },
  });
  customized.variables.add(
    new Variable({
      id: 'baseUrl',
      value: apiTestUrl,
      type: 'string',
    }),
  );

  Object.keys(testGroups).forEach((testGroupName) => {
    const testGroup = new ItemGroup({ name: testGroupName }) as ItemGroup<Item>;

    testGroups[testGroupName].forEach((apiTest) => {
      const testItem = generateTestItem(generated, apiTest);
      testGroup.items.add(testItem);
    });
    customized.items.add(testGroup);
  });

  run(
    {
      collection: customized,
      reporters: ['cli'],
      exportEnvironment: './src/newman/newman-environment.json',
      exportGlobals: './src/newman/newman-globals.json',
      exportCollection: './src/newman/customized.json',
      environment: {
        name: 'hobsons-nav-dragon',
        values: [
          {
            key: 'baseUrl',
            value: process.env.API_TEST_URL,
            type: 'string',
          },
        ],
      },
    },
    function (err, summary) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      if (summary.run.failures.length) {
        process.exit(1);
      }
      console.log('collection run complete');
    },
  );
};
void testApi(`${process.env.API_TEST_URL}`);