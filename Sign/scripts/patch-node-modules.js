/**
 * Workaround for https://github.com/facebook/react-native/issues/XXXX
 *
 * Top-level @react-native/codegen@0.81.5 only recognizes the Flow utility
 * type `$ReadOnly<T>`, not the newer `Readonly<T>` convention used by the
 * nested react-native 0.86.0 clone that expo-router pulls in. Without this
 * fix, codegen throws "Unable to determine event arguments" or "Unknown
 * property type for ... $FlowFixMe" when parsing NativeComponent spec files.
 *
 * This script rewrites `Readonly<` to `$ReadOnly<` in all .js files under
 * the nested react-native source tree that contain NativeComponent or
 * NativeModule definitions. It is idempotent.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'node_modules',
  'react-native',
  'src',
);

const TARGET_DIRS = [
  'private/specs_DEPRECATED/components',
  'private/specs_DEPRECATED/modules',
  'private/components',
  'private/animated',
  'private/devsupport/devmenu/elementinspector',
  'private/renderer/events',
  'private/webapis/dom/events',
  'private/webapis/dom/nodes/specs',
  'private/webapis/mutationobserver/internals',
  'private/webapis/performance',
];

// Also patch the top-level react-native VirtualViewNativeComponent.js
const TOP_LEVEL_VIRTUALVIEW = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'src',
  'private',
  'components',
  'virtualview',
  'VirtualViewNativeComponent.js',
);

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(full);
    }
  }
}

function patchFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match `Readonly<` that is NOT preceded by `$` (i.e. not already $ReadOnly)
  const patched = content.replace(/(?<!\$)Readonly</g, '$ReadOnly<');
  if (patched !== content) {
    fs.writeFileSync(filePath, patched);
    console.log(`  patched ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
}

console.log('patch-node-modules: rewriting Readonly< → $ReadOnly< in nested RN');

for (const rel of TARGET_DIRS) {
  walk(path.join(ROOT, rel), patchFile);
}

// Also patch the top-level VirtualViewNativeComponent.js
if (fs.existsSync(TOP_LEVEL_VIRTUALVIEW)) {
  patchFile(TOP_LEVEL_VIRTUALVIEW);
}
