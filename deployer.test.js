const { Deployer } = require('./lib/deployer');

const excludeOption =
  '.editorconfig,.env.example,.eslintrc.json,.git*,**/.git*,.npm*,.nvmrc,.prettier*,artisan,composer*,package*,phpunit.xml,tsconfig.json,vite.config.js,.vscode/,resources/css/,resources/js/,tests/,database/,scripts/,node_modules/,.DS_Store';

const deploy = new Deployer(
  {
    host: '192.168.0.99',
    compress: true,
    localDir: './test',
    remoteDir: '/root/test/',
  },
  {
    exclude: excludeOption.split(','),
    dryRun: false,
  }
);

describe('Deployer', () => {
  test('isIgnoreFile', () => {
    expect(deploy.isIgnoreFile('.npmrc')).toBe(true);
    expect(deploy.isIgnoreFile('.npmignore')).toBe(true);
    expect(deploy.isIgnoreFile('.github/')).toBe(true);
    expect(deploy.isIgnoreFile('.gitignore')).toBe(true);
    expect(deploy.isIgnoreFile('.gitattributes')).toBe(true);
    expect(deploy.isIgnoreFile('resources/css/')).toBe(true);
    expect(deploy.isIgnoreFile('resources/views/')).toBe(false);
    expect(deploy.isIgnoreFile('node_modules/')).toBe(true);
    expect(deploy.isIgnoreFile('storage/app/public/.gitignore')).toBe(true);
  });
});
