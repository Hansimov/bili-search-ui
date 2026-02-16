import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
    },
    resolve: {
        alias: {
            src: resolve(__dirname, './src'),
            'boot/axios': resolve(__dirname, './src/__tests__/__mocks__/axios.ts'),
        },
    },
});
