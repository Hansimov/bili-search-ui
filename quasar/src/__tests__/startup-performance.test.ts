import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth boot startup performance', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('restores cached account state immediately and defers remote initialization', async () => {
        const scheduleAfterInitialRender = vi.fn();
        const authStore = {
            cleanup: vi.fn(),
        };
        const accountStore = {
            clearSession: vi.fn(),
            hasValidSession: false,
            initialize: vi.fn().mockResolvedValue(undefined),
            isLoggedIn: false,
            loadCoreFromStorage: vi.fn(),
            userName: '',
        };

        vi.doMock('quasar/wrappers', () => ({
            boot: (callback: unknown) => callback,
        }));
        vi.doMock('src/stores/authStore', () => ({
            useAuthStore: () => authStore,
        }));
        vi.doMock('src/stores/accountStore', () => ({
            useAccountStore: () => accountStore,
        }));
        vi.doMock('src/utils/schedule', () => ({
            scheduleAfterInitialRender,
        }));

        const { default: authBoot } = await import('src/boot/auth');
        const app: { config: { globalProperties: Record<string, unknown> } } = {
            config: {
                globalProperties: {},
            },
        };

        authBoot({ app } as never);

        expect(accountStore.loadCoreFromStorage).toHaveBeenCalledTimes(1);
        expect(accountStore.initialize).not.toHaveBeenCalled();
        expect(scheduleAfterInitialRender).toHaveBeenCalledTimes(1);
        expect(app.config.globalProperties.$authStore).toBe(authStore);
        expect(app.config.globalProperties.$accountStore).toBe(accountStore);

        const scheduledTask = scheduleAfterInitialRender.mock.calls[0][0];
        await scheduledTask();

        expect(accountStore.initialize).toHaveBeenCalledWith({
            restoreCoreFromStorage: false,
            restoreDeferredFromStorage: true,
        });
    });
});