import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default tseslint.config(
  { ignores: ['dist/**/*', 'node_modules/**', 'batches/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  firebaseRulesPlugin.configs['flat/recommended'],
);
