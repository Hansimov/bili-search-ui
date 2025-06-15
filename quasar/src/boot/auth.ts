import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/authStore';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $authStore: ReturnType<typeof useAuthStore>;
    }
}

export default boot(({ app, store }) => {
    // 初始化认证状态
    const authStore = useAuthStore(store);
    authStore.initAuth();

    // 将 authStore 添加到全局属性中，方便在选项式 API 中使用
    app.config.globalProperties.$authStore = authStore;
});