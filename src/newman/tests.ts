import { ApiTestConfig } from './ApiTestConfig';

export const testGroups: Record<string, ApiTestConfig[]> = {
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
      name: 'Basic Missing Params',
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
      name: 'Advanced Missing Params',
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
      name: 'Basic Bad Body',
      path: '/example/:hello/basic',
      method: 'POST',
      pathParams: {
        hello: 'heyCheck',
      },
      status: 400,
      body: {},
    },
    {
      name: 'Advanced Bad Body',
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