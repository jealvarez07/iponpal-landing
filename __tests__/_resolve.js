/* Shared path resolver so the tests run from anywhere in the repo
   (repo root, tests/, or with an explicit path argument). */
const fs = require('fs'), path = require('path');
function resolveTarget(names, label){
  const argPath = process.argv[2];
  const here = __dirname;
  const cands = [];
  if (argPath) cands.push(path.resolve(argPath));
  for (const n of names){
    cands.push(
      path.resolve(process.cwd(), n),            // run from repo root
      path.resolve(here, n),                     // run from tests/
      path.resolve(here, '..', n),               // tests/ → repo root
      path.resolve(here, '..', '..', n)          // nested
    );
  }
  for (const c of cands) if (fs.existsSync(c)) return c;
  console.error('\n❌ Could not find ' + label + '.');
  console.error('   Looked for: ' + names.join(', '));
  console.error('   Run with an explicit path:  node ' + path.basename(process.argv[1]) + ' path/to/file\n');
  process.exit(2);
}
module.exports = { resolveTarget, fs };
