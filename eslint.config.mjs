// Flat config, required from Next 16: `next lint` is removed and
// @next/eslint-plugin-next defaults to this format. Replaces .eslintrc.json,
// which extended "next/core-web-vitals".
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
]

export default config
