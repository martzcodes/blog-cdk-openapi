# This repo is for a blog post on https://matt.martz.codes

Install the project, deploy and export the deployed version of the OpenAPI spec

```bash
npx projen
npm run deploy
aws apigateway get-export --parameters extensions='postman' --rest-api-id x4h3yibjr3 --stage-name prod --export-type oas30 deployedopenapi.json
```

Where `x4h3yibjr3` is your api id