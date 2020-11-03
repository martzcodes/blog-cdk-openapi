import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import * as deployedApiSpec from '../openapideployed.json';
import { MyStack } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new MyStack(app, 'test');

  expect(stack).not.toHaveResource('AWS::S3::Bucket');
  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});

test('Api Spec', () => {
  const app = new App();
  const stack = new MyStack(app, 'test', { generateApiSpec: true });
  console.log(`Stack: ${JSON.stringify(stack.apiSpec)}`);
  console.log(`deployed: ${JSON.stringify(deployedApiSpec)}`);
  expect(stack.apiSpec).toMatchSnapshot({
    info: {
      version: expect.any(String),
    },
  });
});
