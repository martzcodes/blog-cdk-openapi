const { AwsCdkTypeScriptApp } = require("projen");

const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.71.0",
  name: "blog-cdk-openapi",
  authorName: "Matt Martz",
  authorUrl: "https://matt.martz.codes",
  cdkDependencies: [
    "@aws-cdk/core",
    "@aws-cdk/aws-apigateway",
    "@aws-cdk/aws-lambda",
  ],
  dependencies: {
    "ts-json-schema-generator": "0.77.0",
  },
  devDependencies: {
    "@types/aws-lambda": "8.10.63",
    esbuild: "^0.7.19",
    rimraf: "^3.0.2",
  },
});

project.addScriptCommand("clean", "rimraf dist");
project.addScriptCommand(
  "lambda",
  "yarn run clean && ts-node ./src/esbuild.ts"
);
project.addScriptCommand("prebuild", "yarn run lambda");
project.addScriptCommand("predeploy", "yarn run lambda");
project.addScriptCommand("visualize", "cdk synth --no-staging > template.yaml && cat template.yaml | cfg > graph.out");

project.synth();
