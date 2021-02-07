/* eslint-disable import/no-extraneous-dependencies */
import { run } from 'newman';
import { Collection, Event, Item, ItemGroup, RequestBody, Variable } from 'postman-collection';
import * as apiJson from './api.json';
import { ApiTestConfig } from './ApiTestConfig';
import { checkResponseItems, checkStatus } from './checks';
import { testGroups } from './tests';

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
  delete itemJson.id;
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

const testApi = async (apiTestUrl: string, onlyPR: boolean) => {
  const generated = new Collection(apiJson);
  const customized = new Collection({
    name: 'blog-cdk-openapi-postman',
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

  try {
    Object.keys(testGroups).forEach((testGroupName) => {
      const testGroup = new ItemGroup({ name: testGroupName }) as ItemGroup<Item>;

      testGroups[testGroupName].forEach((apiTest) => {

        const testItem = generateTestItem(generated, apiTest);
        testGroup.items.add(testItem);

      });
      customized.items.add(testGroup);
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  if (onlyPR) {
    process.exit(0);
  }

  run(
    {
      collection: customized,
      reporters: ['cli'],
      exportEnvironment: './src/newman/newman-environment.json',
      exportGlobals: './src/newman/newman-globals.json',
      exportCollection: './src/newman/customized.json',
      environment: {
        name: 'blog-cdk-openapi',
        values: [
          {
            key: 'baseUrl',
            value: apiTestUrl,
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

const onlyPR = !!process.argv[2];
void testApi(`${process.env.API_TEST_URL}`, onlyPR);