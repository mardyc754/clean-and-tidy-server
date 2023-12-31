// import { readdir } from 'fs/promises';
// import * as path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// const handleAbsoluteImports = async (dir?: string) => {
//   // eslint-disable-next-line no-undef
//   const sourceDir = path.resolve(__dirname, 'src' + (dir ? '/' + dir : ''));

//   const dirContent = await readdir(sourceDir, { withFileTypes: true });
//   const directories = dirContent.filter((entry) => entry.isDirectory());
//   const files = dirContent.filter((entry) => entry.isFile());

//   return {
//     ...Object.fromEntries(
//       directories.map((entry) => [entry.name, path.resolve(sourceDir, entry.name)])
//     ),
//     ...Object.fromEntries(
//       files.map((entry) => {
//         const result = [
//           // entry.name.replace(/\.[^/.]+$/, ''),
//           // entry.name.replace(/^(~|\.(\.\/)*)/, ''),
//           entry.name.replace(/\.[^/.]+$/, ''),
//           path.resolve(sourceDir, entry.name)
//         ];

//         console.log(result);
//         return result;
//       })
//     ),
//     ...(await Promise.all(
//       directories.flatMap(
//         async (entry) => await handleAbsoluteImports((dir ? dir + '/' : '') + entry.name)
//       )
//     ))
//   };
// };

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ['src/tests/setup.ts']
  }
  // resolve: {
  //   alias: {
  //     ...(await handleAbsoluteImports())
  //   }
  // }
});
