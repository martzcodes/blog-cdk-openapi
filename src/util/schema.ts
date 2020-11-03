import { readdirSync } from 'fs';
import { join as pathJoin } from 'path';
import {
  JsonSchema,
  JsonSchemaVersion,
  ModelOptions,
} from '@aws-cdk/aws-apigateway';
import { createGenerator } from 'ts-json-schema-generator';

const interfaceTemplate = (
  interfaceName: string,
  schemaProps: JsonSchema,
): ModelOptions => ({
  contentType: 'application/json',
  modelName: `${interfaceName}Model`,
  schema: {
    ...schemaProps,
    schema: JsonSchemaVersion.DRAFT7,
    title: `${interfaceName}Model`,
  },
});

const getConfig = (tsconfig: string, path: string) => ({
  path,
  tsconfig,
  type: '*',
});

const updateApiRefs = (obj: any, restApi: string) => {
  if (typeof obj !== 'object' || obj === null) return;
  if (typeof obj.$ref !== 'undefined') {
    const refSplit = obj.$ref.split('/');
    obj.$ref = `https://apigateway.amazonaws.com/restapis/${restApi}/models/${refSplit[refSplit.length-1]}Model`;
  }
  Object.keys(obj).forEach((key) => {
    if (!(obj === obj[key] || !obj.hasOwnProperty(key))) {
      updateApiRefs(obj[key], restApi);
    }
  });
};

export const updateSpecRefs = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return;
  if (typeof obj.$ref !== 'undefined') {
    const refSplit = obj.$ref.split('/');
    obj.$ref = `#/components/schemas/${refSplit[refSplit.length-1]}`;
  }
  Object.keys(obj).forEach((key) => {
    if (!(obj === obj[key] || !obj.hasOwnProperty(key))) {
      updateSpecRefs(obj[key]);
    }
  });
};

export const getSchemas = (tsconfigPath: string, modelPath: string, restApi: string): { [key: string]: ModelOptions} => {
  // get all the interface file paths
  const filePaths: string[] = readdirSync(modelPath).map((file) =>
    pathJoin(modelPath, file),
  );

  const interfaces = filePaths
    .map(filePath => getConfig(tsconfigPath, filePath))
    .map(config => createGenerator(config).createSchema(config.type))
    .reduce((p, schema): { [key: string]: ModelOptions } => {
      const processedSchemas: { [key: string]: ModelOptions } = Object.keys(schema.definitions || {}).reduce(( processed, def) => {
        const schemaDefinition = (schema.definitions || {})[def];
        return {
          ...processed,
          [def]: interfaceTemplate(def, schemaDefinition as JsonSchema),
        };
      }, {} as { [key: string]: ModelOptions });
      return {
        ...p,
        ...processedSchemas,
      };
    }, {} as { [key: string]: ModelOptions });
  updateApiRefs(interfaces, restApi);

  return interfaces;
};
