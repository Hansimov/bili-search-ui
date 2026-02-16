/**
 * Mock for boot/axios used in vitest tests.
 * Prevents Quasar boot system from loading in test environment.
 */
export const axios = {
    get: async () => ({ data: {} }),
    post: async () => ({ data: {} }),
    create: () => axios,
};

export const api = {
    get: async () => ({ data: {} }),
    post: async () => ({ data: {} }),
};

export default () => { };
