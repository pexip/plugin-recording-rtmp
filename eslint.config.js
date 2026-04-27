import eslintConfigLove from 'eslint-config-love'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist', 'eslint.config.js', 'vite.config.ts', 'utils'],
  },
  eslintConfigLove,
  eslintConfigPrettier,
]