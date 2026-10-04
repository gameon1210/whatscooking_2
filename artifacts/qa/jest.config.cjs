const path = require('path');
const root = path.resolve(__dirname, '../..');
module.exports = {
  rootDir: root,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/artifacts/qa/*.test.ts'],
  moduleDirectories: [path.join(root, 'app/node_modules'), 'node_modules'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/app/src/$1' },
  transform: { '^.+\\.tsx?$': [path.join(root, 'app/node_modules/ts-jest'), {
    tsconfig: { strict: true, esModuleInterop: true, target: 'es2020', module: 'commonjs', lib: ['es2021','dom'], types: ['jest','node'], typeRoots: [path.join(root, 'app/node_modules/@types')], paths: { '@/*': [path.join(root, 'app/src/*')] } },
    diagnostics: { warnOnly: false },
  }] },
};
