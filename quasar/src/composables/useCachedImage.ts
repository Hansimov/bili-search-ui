/**
 * useCachedImage - Vue 组合式函数
 *
 * 提供响应式的图片缓存 URL，自动管理缓存的加载和 Blob URL 的生命周期。
 *
 * 使用示例：
 * ```vue
 * <script setup>
 * import { useCachedImage } from 'src/composables/useCachedImage';
 * const { cachedSrc, isLoading } = useCachedImage(() => props.imageUrl);
 * </script>
 * <template>
 *   <img :src="cachedSrc" />
 * </template>
 * ```
 */

import { ref, watch, onBeforeUnmount, type Ref } from 'vue';
import { getCachedImageUrl } from 'src/services/imageCacheService';

/**
 * 组合式函数：获取缓存的图片 URL
 *
 * @param srcGetter 返回原始图片 URL 的响应式 getter
 * @returns { cachedSrc, isLoading, error }
 */
export function useCachedImage(srcGetter: () => string): {
    cachedSrc: Ref<string>;
    isLoading: Ref<boolean>;
    error: Ref<string | null>;
} {
    const cachedSrc = ref('');
    const isLoading = ref(true);
    const error = ref<string | null>(null);

    let currentUrl = '';

    const loadImage = async (url: string) => {
        if (!url) {
            cachedSrc.value = '';
            isLoading.value = false;
            return;
        }

        currentUrl = url;
        isLoading.value = true;
        error.value = null;

        try {
            const result = await getCachedImageUrl(url);

            // 确保结果匹配当前请求的 URL（防止竞态条件）
            if (currentUrl === url) {
                cachedSrc.value = result;
                isLoading.value = false;
            }
        } catch (err) {
            if (currentUrl === url) {
                // 出错时回退到原始 URL
                cachedSrc.value = url;
                error.value = err instanceof Error ? err.message : 'Unknown error';
                isLoading.value = false;
            }
        }
    };

    // 监听 URL 变化
    watch(
        srcGetter,
        (newUrl) => {
            loadImage(newUrl);
        },
        { immediate: true }
    );

    onBeforeUnmount(() => {
        currentUrl = '';
    });

    return {
        cachedSrc,
        isLoading,
        error,
    };
}
