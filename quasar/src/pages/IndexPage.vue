<template>
  <q-card flat class="index-page-card">
    <div
      class="index-content"
      :class="{ 'index-content-direct': isDirectMode }"
    >
      <div
        class="index-chat-empty-state"
        :class="{ 'index-chat-empty-state-direct': isDirectMode }"
      >
        <div class="index-chat-empty-brand">blbl.top</div>
        <p class="index-chat-empty-subtitle">
          <span class="index-mode-pill" :class="currentModeAccentClass">
            {{ currentModeLabel }}
          </span>
          <span class="index-chat-empty-subtitle-rest">
            {{ currentModeSubtitleText }}
          </span>
        </p>
      </div>

      <!-- 直接查找模式：内联 DSL 语法帮助 -->
      <div v-if="isDirectMode" class="index-dsl-help">
        <div class="dsl-inline-title">
          <q-icon name="search" size="18px" style="opacity: 0.5" />
          直接查找 — 搜索语法速查
        </div>
        <div class="dsl-inline-body">
          <div class="dsl-inline-section">
            <div class="dsl-inline-format">
              格式: <code>&lt;关键词&gt; &lt;过滤器&gt;</code>
            </div>
          </div>
          <div class="dsl-inline-columns">
            <div class="dsl-inline-col">
              <div class="dsl-inline-heading">关键词</div>
              <div class="dsl-inline-row"><code>词1 词2</code> 同时包含</div>
              <div class="dsl-inline-row"><code>"短语"</code> 精确匹配</div>
              <div class="dsl-inline-row"><code>+词</code> 必须包含</div>
              <div class="dsl-inline-row"><code>-词</code> 排除</div>
            </div>
            <div class="dsl-inline-col">
              <div class="dsl-inline-heading">统计过滤器</div>
              <div class="dsl-inline-row"><code>:view>=1w</code> 播放≥1万</div>
              <div class="dsl-inline-row">
                <code>:like&lt;500</code> 点赞&lt;500
              </div>
              <div class="dsl-inline-row">
                <code>:coin>1k</code> 投币&gt;1千
              </div>
              <div class="dsl-inline-row">
                <code>:danmaku</code> <code>:reply</code>
                <code>:favorite</code> <code>:share</code>
              </div>
              <div class="dsl-inline-row">
                <code>:view=[1w, 10w]</code> 区间
              </div>
            </div>
            <div class="dsl-inline-col">
              <div class="dsl-inline-heading">日期 / 时长 / UP主</div>
              <div class="dsl-inline-row"><code>:date&lt;=7d</code> 7天内</div>
              <div class="dsl-inline-row"><code>:date>=2024-01</code> 之后</div>
              <div class="dsl-inline-row"><code>:t>5m</code> 时长&gt;5分钟</div>
              <div class="dsl-inline-row"><code>:user=名字</code> 指定UP主</div>
              <div class="dsl-inline-row"><code>:uid=946974</code> 指定UID</div>
            </div>
          </div>
          <div class="dsl-inline-columns">
            <div class="dsl-inline-col">
              <div class="dsl-inline-heading">视频ID</div>
              <div class="dsl-inline-row"><code>bv=BV1xx</code> 按BV号查</div>
              <div class="dsl-inline-row"><code>av=12345</code> 按AV号查</div>
            </div>
            <div class="dsl-inline-col">
              <div class="dsl-inline-heading">搜索模式</div>
              <div class="dsl-inline-row">
                <code>q=w</code> 文字 <code>q=v</code> 向量
                <code>q=wv</code> 混合
              </div>
              <div class="dsl-inline-row"><code>q=vwr</code> 混合+重排序</div>
            </div>
            <div class="dsl-inline-col">
              <div class="dsl-inline-heading">数值单位</div>
              <div class="dsl-inline-row">
                <code>k</code>=千 <code>w</code>=万 <code>m</code>=百万
              </div>
              <div class="dsl-inline-row">
                时间: <code>Nh</code> <code>Nd</code> <code>Nw</code>
                <code>Nm</code> <code>Ny</code>
              </div>
            </div>
          </div>
          <div class="dsl-inline-examples">
            <span class="dsl-inline-heading">示例: </span>
            <code>黑神话 :view>=1w :date&lt;=30d</code>
            &nbsp;·&nbsp;
            <code>:user=影视飓风 :date&lt;=7d</code>
            &nbsp;·&nbsp;
            <code>Python 教程 -广告 :view>=1k</code>
          </div>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  SEARCH_MODE_PLACEHOLDERS,
  useSearchModeStore,
} from 'src/stores/searchModeStore';

defineOptions({
  name: 'IndexPage',
});

const searchModeStore = useSearchModeStore();

const isDirectMode = computed(() => searchModeStore.isDirectMode);
const currentMode = computed(() => searchModeStore.currentMode);
const currentModePlaceholder = computed(
  () => SEARCH_MODE_PLACEHOLDERS[currentMode.value]
);
const currentModeLabel = computed(
  () =>
    currentModePlaceholder.value.split(' · ')[0] || currentModePlaceholder.value
);
const currentModeSubtitleText = computed(() => {
  const parts = currentModePlaceholder.value.split(' · ');
  return parts.length > 1
    ? parts.slice(1).join(' · ')
    : currentModePlaceholder.value;
});
const currentModeAccentClass = computed(
  () => `index-mode-pill-${currentMode.value}`
);
</script>

<style lang="scss" scoped>
.index-page-card {
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: calc(100vh - 50px);
  padding-bottom: calc(var(--search-bar-total-height, 96px) + 32px);
}

.index-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: var(--search-input-max-width, 95vw);
  padding: 0 16px;
}

.index-content-direct {
  justify-content: flex-start;
  gap: 20px;
  padding-top: 40px;
}

.index-chat-empty-state {
  display: flex;
  min-height: min(46vh, 360px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
}

.index-chat-empty-state-direct {
  min-height: auto;
  padding-top: 8px;
}

.index-chat-empty-brand {
  font-size: clamp(32px, 5vw, 44px);
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.index-chat-empty-subtitle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: min(720px, 92vw);
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}

.index-mode-pill {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
}

.index-chat-empty-subtitle-rest {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.body--light .index-chat-empty-brand {
  color: #202020;
}

body.body--dark .index-chat-empty-brand {
  color: #f2f2f2;
}

body.body--light .index-mode-pill-direct {
  color: #00897b;
  background: rgba(0, 137, 123, 0.1);
}

body.body--light .index-mode-pill-smart {
  color: #1976d2;
  background: rgba(25, 118, 210, 0.08);
}

body.body--light .index-mode-pill-think {
  color: #8e24aa;
  background: rgba(142, 36, 170, 0.1);
}

body.body--light .index-mode-pill-research {
  color: #e64a19;
  background: rgba(230, 74, 25, 0.1);
}

body.body--dark .index-mode-pill-direct {
  color: #4db6ac;
  background: rgba(77, 182, 172, 0.16);
}

body.body--dark .index-mode-pill-smart {
  color: #90caf9;
  background: rgba(144, 202, 249, 0.12);
}

body.body--dark .index-mode-pill-think {
  color: #ce93d8;
  background: rgba(206, 147, 216, 0.14);
}

body.body--dark .index-mode-pill-research {
  color: #ff8a65;
  background: rgba(255, 138, 101, 0.14);
}

body.body--light .index-chat-empty-subtitle {
  color: rgba(0, 0, 0, 0.62);
}

body.body--dark .index-chat-empty-subtitle {
  color: rgba(255, 255, 255, 0.62);
}

/* ============ 内联 DSL 语法帮助 ============ */
.index-dsl-help {
  width: 100%;
  max-width: 700px;
  margin-top: 0;
}

.dsl-inline-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.65;
  margin-bottom: 14px;
}

.dsl-inline-body {
  font-size: 13px;
  line-height: 1.7;
}

.dsl-inline-format {
  margin-bottom: 12px;
  opacity: 0.7;
}

.dsl-inline-columns {
  display: flex;
  gap: 32px;
  margin-bottom: 14px;
}

.dsl-inline-col {
  flex: 1;
  min-width: 0;
}

.dsl-inline-heading {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  opacity: 0.7;
}

.dsl-inline-row {
  margin: 2px 0;
  opacity: 0.8;
}

.dsl-inline-examples {
  opacity: 0.7;
  margin-top: 4px;
}

.dsl-inline-body code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
}

body.body--light .dsl-inline-body code {
  background: rgba(0, 0, 0, 0.05);
  color: #c7254e;
}

body.body--dark .dsl-inline-body code {
  background: rgba(255, 255, 255, 0.08);
  color: #e6db74;
}
</style>
