// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions are Deno (jsr: imports, Deno globals) — linted by `deno lint`.
    ignores: ['dist/*', '.expo/*', 'supabase/functions/*'],
  },
  {
    // Golden rule 1: supabase-js lives in src/api/* (+ its client in src/lib/supabase.ts).
    // Screens and components must go through the api layer.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/api/**', 'src/lib/supabase.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Supabase calls belong in src/api/* only (CLAUDE.md golden rule 1).',
            },
          ],
          patterns: [
            {
              group: ['**/lib/supabase', '@/lib/supabase'],
              message:
                'Import from src/api/* instead of the supabase client (CLAUDE.md golden rule 1).',
            },
          ],
        },
      ],
    },
  },
]);
