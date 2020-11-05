import { readdirSync } from 'fs';
import { join as pathJoin } from 'path';
import { JsonSchema, JsonSchemaVersion, ModelOptions } from '@aws-cdk/aws-apigateway';
import { createGenerator } from 'ts-json-schema-generator';

const interfaceTemplate = (interfaceName: string, schemaProps: JsonSchema): ModelOptions => ({
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

const hasRef = (obj: unknown): obj is { ref?: string; $ref?: string } => {
  return (
    !!obj &&
    typeof obj === 'object' &&
    ('ref' in (obj as Record<string, unknown>) || '$ref' in (obj as Record<string, unknown>))
  );
};

const hasAdditionalProperties = (obj: unknown): obj is { additionalProperties?: unknown } => {
  return !!obj && typeof obj === 'object' && 'additionalProperties' in (obj as Record<string, unknown>);
};

export const updateApiRefs = (obj: unknown | Record<string, unknown>, restApi: string): void => {
  if (typeof obj !== 'object' || obj === null) return;
  if (hasRef(obj) && obj.$ref) {
    const refSplit = obj.$ref.split('/');
    obj.ref = `https://apigateway.amazonaws.com/restapis/${restApi}/models/${refSplit[refSplit.length - 1]}Model`;
    delete obj.$ref;
  }
  if (hasAdditionalProperties(obj)) {
    // TODO: additional properties tend to cause problems with openapi specs... remove for now
    delete obj.additionalProperties;
  }
  Object.keys(obj).forEach((key) => {
    updateApiRefs((obj as Record<string, unknown>)[key], restApi);
  });
};

export const apiToSpec = (obj: unknown | Record<string, unknown>): void => {
  if (typeof obj !== 'object' || obj === null) return;
  if (hasRef(obj) && obj.ref) {
    const refSplit = obj.ref.split('/');
    obj.$ref = `#/components/schemas/${refSplit[refSplit.length - 1]}`;
    delete obj.ref;
  }
  Object.keys(obj).forEach((key) => {
    apiToSpec((obj as Record<string, unknown>)[key]);
  });
};

export const getSchemas = (
  tsconfigPath: string,
  modelPath: string,
  restApi: string,
): { [key: string]: ModelOptions } => {
  // get all the interface file paths
  const filePaths: string[] = readdirSync(modelPath).map((file) => pathJoin(modelPath, file));

  const interfaces = filePaths
    .map((filePath) => getConfig(tsconfigPath, filePath))
    .map((config) => createGenerator(config).createSchema(config.type))
    .reduce((p, schema): { [key: string]: ModelOptions } => {
      const processedSchemas: { [key: string]: ModelOptions } = Object.keys(
        schema.definitions as { definitions: Record<string, unknown> },
      ).reduce((processed, def) => {
        const schemaDefinition = (schema as { definitions: Record<string, JsonSchema> }).definitions[def];
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