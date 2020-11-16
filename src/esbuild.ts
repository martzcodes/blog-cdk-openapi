// eslint-disable-next-line import/no-extraneous-dependencies
import { startService } from 'esbuild';

const fns = [
  'basic',
  'advanced',
  'authorizer',
];

const runBuild = async () => {
  const service = await startService();
  const promises = fns.map((fn) =>
    service
      .build({
        bundle: true,
        entryPoints: [`./src/lambdas/${fn}.ts`],
        external: ['pkginfo'],
        minify: true,
        outfile: `./dist/${fn}/index.js`,
        platform: 'node',
        target: 'es2019',
      })
      .catch(() => process.exit(1)),
  );
  await Promise.all(promises);
  service.stop();
};

void runBuild();