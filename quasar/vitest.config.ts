import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    // @ts-expect-error vite types are duplicated between vitest-bundled vite and project vite
    plugins: [vue()],
    test: {
        environment: 'node',
        globals: true,
        pool: 'forks',
        isolate: false,
    },
    resolve: {
        alias: {
            src: resolve(__dirname, './src'),
            'boot/axios': resolve(__dirname, './src/__tests__/__mocks__/axios.ts'),
        },
    },
});
