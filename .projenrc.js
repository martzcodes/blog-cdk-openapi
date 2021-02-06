const { AwsCdkTypeScriptApp } = require("projen");

const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.88.0",
  name: "blog-cdk-openapi",
  authorName: "Matt Martz",
  authorUrl: "https://matt.martz.codes",
  cdkDependencies: [
    "@aws-cdk/core",
    "@aws-cdk/aws-apigateway",
    "@aws-cdk/aws-lambda",
    "@aws-cdk/aws-lambda-nodejs",
  ],
  dependencies: {
    "ts-json-schema-generator": "0.77.0",
  },
  devDependencies: {
    "@types/aws-lambda": "8.10.63",
    "@types/newman": "5.1.2",
    "@types/postman-collection": "3.5.5",
    "esbuild": "0.8.34",
    "newman": "5.2.1",
    "openapi-to-postmanv2": "2.2.0",
    "postman-collection": "3.6.9",
  },
  gitignore: [
    "src/newman/newman-*",
    "src/newman/customized.json"
  ]
});

project.addScriptCommand(
  "newman:convert",
  "openapi2postmanv2 -s openapigenerated.json -o src/newman/api.json -p -c src/newman/config.json"
);

project.addScriptCommand("newman:run", "ts-node src/newman/newman.ts");

project.synth();
