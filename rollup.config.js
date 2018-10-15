export default {
  input: 'dist/tsc/png.js',
  output: [
    {
      file: 'dist/browser/png.js',
      format: 'iife',
      name: 'pnges'
    },
    {
      file: 'dist/cjs/png.js',
      format: 'cjs',
    },
    {
      file: 'dist/esm/png.mjs',
      format: 'es',
    }
  ]
};