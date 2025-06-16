import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/authStore';
import { useAccountStore } from 'src/stores/accountStore';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $authStore: ReturnType<typeof useAuthStore>;
        $accountStore: ReturnType<typeof useAccountStore>;
    }
}

export default boot(async ({ app, store }) => {
    const accountStore = useAccountStore(store);
    const authStore = useAuthStore(store);

    try {
        // 初始化账户状态（从本地存储恢复并验证会话）
        await accountStore.initialize();

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

    // 将 store 添加到全局属性
    app.config.globalProperties.$authStore = authStore;
    app.config.globalProperties.$accountStore = accountStore;

    // 应用卸载时清理资源
    app.config.globalProperties.$onBeforeUnmount?.(() => {
        authStore.cleanup();
    });
});