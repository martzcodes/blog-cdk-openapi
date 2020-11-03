# This repo is for a blog post on https://matt.martz.codes

Install the project, deploy and export the deployed version of the OpenAPI spec

```bash
npx projen
npm run deploy
aws apigateway get-export --parameters extensions='postman' --rest-api-id x4h3yibjr3 --stage-name prod --export-type oas30 deployedopenapi.json
```

Where `x4h3yibjr3` is your api id

OpenApi 3.0 Spec from AWS Console / cli:
https://editor.swagger.io/?url=https://raw.githubusercontent.com/martzcodes/blog-cdk-openapi/main/deployedopenapi.json

Generated from project:
https://editor.swagger.io/?url=https://raw.githubusercontent.com/martzcodes/blog-cdk-openapi/main/openapispec.json