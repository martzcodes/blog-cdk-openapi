export const checkStatus = (status: number): string[] =>
  status
    ? [`pm.test("Status code is ${status}", function () {`, `    pm.response.to.have.status(${status});`, '});']
    : [];

const checkObject = (key: string, value: string): string[] => [
  `pm.test("Value at ${key} is '${value}'", function () {`,
  `    pm.expect(pm.response.json().${key}).to.equal('${value}');`,
  '});',
];

export const checkResponseItems = (responseItems?: Record<string, string>): string[] =>
  responseItems
    ? Object.keys(responseItems).reduce((p, c) => {
      return [...p, ...checkObject(c, responseItems[c])];
    }, [] as string[])
    : [];