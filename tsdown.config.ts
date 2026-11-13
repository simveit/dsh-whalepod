// Web client bundle only; the host half is compiled by `tsc -p tsconfig.host.json` (it lowers the standard
// `@Remote` decorators). The client bundle is a CommonJS factory registered with the page's module loader,
// as dsh's own client bundles are. react, zod, @deepseek-ai/cordis and dsh's form primitives
// (@deepseek-ai/dsh-client-ui-primitives, for the Plugins page settings) come from the page's shared module table;
// the pure `@deepseek-ai/dsh-typert-protocol/remote-info` leaf is inlined.
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  clean: false,
  tsconfig: 'tsconfig.client.json',
  // The fake data source is compiled in only for development builds (scripts/dev.sh sets DSH_COORDINATOR_DEV=1).
  define: { __DSH_COORDINATOR_DEV__: JSON.stringify(process.env['DSH_COORDINATOR_DEV'] === '1') },
  deps: {
    neverBundle: ['react', 'react/jsx-runtime', 'react-dom', 'zod', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-primitives'],
    alwaysBundle: ['@deepseek-ai/dsh-typert-protocol/remote-info'],
  },
  outputOptions: {
    entryFileNames: 'client.js',
    // The module id is the package name: dsh imports a bundle's browser half as `<package>/client` and strips the suffix.
    banner: 'window.__ModuleLoader__.load({ id: "dsh-whalepod", factory: (require) => {',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
})
