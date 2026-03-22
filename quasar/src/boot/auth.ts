import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/authStore';
import { useAccountStore } from 'src/stores/accountStore';
import { scheduleAfterInitialRender } from 'src/utils/schedule';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $authStore: ReturnType<typeof useAuthStore>;
        $accountStore: ReturnType<typeof useAccountStore>;
    }
}

export default boot(({ app }) => {
    const accountStore = useAccountStore();
    const authStore = useAuthStore();

    // 先同步恢复轻量登录态，保证首屏不被远程校验阻塞。
    accountStore.loadCoreFromStorage();

    scheduleAfterInitialRender(() => {
        void (async () => {
            try {
                await accountStore.initialize({
                    restoreCoreFromStorage: false,
                    restoreDeferredFromStorage: true,
                });

                console.log('Account initialization completed:', {
                    isLoggedIn: accountStore.isLoggedIn,
                    hasValidSession: accountStore.hasValidSession,
                    userName: accountStore.userName,
                });
            } catch (error) {
                console.error('Failed to initialize account:', error);
                // 初始化失败时清理状态
                accountStore.clearSession();
            }
        })();
    });

    // 将 store 添加到全局属性
    app.config.globalProperties.$authStore = authStore;
    app.config.globalProperties.$accountStore = accountStore;

    // 应用卸载时清理资源
    app.config.globalProperties.$onBeforeUnmount?.(() => {
        authStore.cleanup();
    });
});