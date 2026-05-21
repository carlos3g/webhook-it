// ESLint flat config — built on the shared @carlos3g/eslint-config base preset
// (TypeScript + typescript-eslint strictTypeChecked).
import base from '@carlos3g/eslint-config/base';

export default [
  {
    // website/ is a separate Docusaurus project with its own package.json,
    // tsconfig and tooling — not part of this repo's strict TS lint scope.
    ignores: ['**/dist/**', '.agents/**', 'website/**', 'eslint.config.mjs'],
  },
  ...base,
  {
    // OpenTUI's intrinsic JSX elements are loosely typed, so type-aware rules
    // see every JSX expression as unsafe. Scope that one rule off for TSX.
    files: ['**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
