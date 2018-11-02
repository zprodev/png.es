import resolve from 'rollup-plugin-node-resolve';

const output = [];
const plugins = [];
if(process.env.BROWSER){
  output.push({
    file: 'dist/browser/png.js',
    format: 'iife',
    name: 'pnges'
  });
  plugins.push(
    resolve()
  );
}else{
  output.push({
    file: 'dist/cjs/png.js',
    format: 'cjs',
  });
  output.push({
    file: 'dist/esm/png.js',
    format: 'es',
  });
}

export default {
  input: 'dist/tsc/png.js',
  output: output,
  plugins: plugins
};