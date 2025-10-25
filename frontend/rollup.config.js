import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.tsx',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [typescript({
    check: false,
    tsconfig: './tsconfig.json',
    tsconfigOverride: {
      compilerOptions: {
        noEmitOnError: false
      }
    }
  })],
  external: ['react', 'react-dom']
};