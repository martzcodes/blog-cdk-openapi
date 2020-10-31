// eslint-disable-next-line import/no-unresolved
import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

const generatePolicy = (
  token: string,
  methodArn: string,
): APIGatewayAuthorizerResult => {
  const policy: APIGatewayAuthorizerResult = {
    principalId: token,
    policyDocument: {
      Statement: [],
      Version: '2012-10-17',
    },
  };
  policy.policyDocument.Statement.push({
    Action: ['execute-api:Invoke'],
    Effect: 'Allow',
    Resource: methodArn,
  });
  return policy;
};

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  if (Object.keys(event).indexOf('authorizationToken') === -1) {
    console.error('No Token!');
    throw new Error('No Token!');
  }

  const token = event.authorizationToken.replace('Bearer ', '');

  return generatePolicy(token, event.methodArn);
};