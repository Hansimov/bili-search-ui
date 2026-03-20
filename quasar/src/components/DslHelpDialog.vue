<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="dsl-help-card">
      <q-toolbar class="dsl-help-toolbar">
        <q-icon
          name="search"
          size="20px"
          class="q-mr-sm"
          style="opacity: 0.6"
        />
        <q-toolbar-title class="dsl-help-title">
          直接查找模式 — 搜索语法帮助
        </q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="close"
          @click="$emit('update:modelValue', false)"
        />
      </q-toolbar>

      <q-card-section class="dsl-help-notice">
        <q-icon name="info" size="18px" class="q-mr-sm" color="teal-5" />
        <span>
          <strong>直接查找</strong
          >是一个高级搜索模式，更偏底层，适合需要精确控制搜索条件的用户。
          一般用户推荐使用<strong>「快速问答」</strong>模式，直接用自然语言提问即可。
        </span>
      </q-card-section>

      <q-separator />

      <q-card-section class="dsl-help-body">
        <div class="dsl-section">
          <div class="dsl-format">
            搜索语句格式: <code>&lt;关键词&gt; &lt;过滤器&gt;</code>
          </div>
        </div>

        <!-- 一、关键词 -->
        <div class="dsl-section">
          <div class="dsl-heading">一、关键词</div>
          <p class="dsl-desc">关键词之间用空格分隔，表示同时搜索多个词。</p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>语法</th>
                <th>含义</th>
                <th>示例</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>词</code></td>
                <td>搜索包含该词的视频</td>
                <td><code>黑神话</code></td>
              </tr>
              <tr>
                <td><code>词1 词2</code></td>
                <td>同时包含多个词</td>
                <td><code>黑神话 悟空</code></td>
              </tr>
              <tr>
                <td><code>"短语"</code></td>
                <td>精确匹配完整短语</td>
                <td><code>"黑神话 悟空"</code></td>
              </tr>
              <tr>
                <td><code>+词</code></td>
                <td>结果必须包含该词</td>
                <td><code>游戏实况 +黑神话</code></td>
              </tr>
              <tr>
                <td><code>-词</code></td>
                <td>排除包含该词的结果</td>
                <td><code>Python 教程 -广告</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 二、过滤器 -->
        <div class="dsl-section">
          <div class="dsl-heading">二、过滤器</div>
          <p class="dsl-desc">
            过滤器以 <code>:</code> 起始，格式为
            <code>:&lt;字段&gt;&lt;操作符&gt;&lt;值&gt;</code>。
          </p>

          <!-- 统计过滤器 -->
          <div class="dsl-subheading">1. 统计过滤器</div>
          <p class="dsl-desc">
            字段: <code>view</code>(播放), <code>like</code>(点赞),
            <code>coin</code>(投币), <code>danmaku</code>(弹幕),
            <code>reply</code>(评论), <code>favorite</code>(收藏),
            <code>share</code>(分享)
          </p>
          <p class="dsl-desc">
            数值单位: <code>k</code>=千, <code>w</code>=万, <code>m</code>=百万
          </p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>语法</th>
                <th>含义</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>:view>=1w</code></td>
                <td>播放量 ≥ 1万</td>
              </tr>
              <tr>
                <td><code>:coin>1k</code></td>
                <td>投币 > 1千</td>
              </tr>
              <tr>
                <td><code>:like&lt;500</code></td>
                <td>点赞 &lt; 500</td>
              </tr>
              <tr>
                <td><code>:view=[1w, 10w]</code></td>
                <td>播放量在 1万 到 10万 之间（含边界）</td>
              </tr>
            </tbody>
          </table>

          <!-- 日期过滤器 -->
          <div class="dsl-subheading">2. 日期过滤器</div>
          <p class="dsl-desc">
            字段: <code>date</code>。 相对时间: <code>Nh</code>(N小时),
            <code>Nd</code>(N天), <code>Nw</code>(N周), <code>Nm</code>(N月),
            <code>Ny</code>(N年)。 绝对日期: <code>YYYY</code>,
            <code>YYYY-MM</code>, <code>YYYY-MM-DD</code>
          </p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>语法</th>
                <th>含义</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>:date&lt;=7d</code></td>
                <td>7天内</td>
              </tr>
              <tr>
                <td><code>:date&lt;=3h</code></td>
                <td>3小时内</td>
              </tr>
              <tr>
                <td><code>:date>=2024-01</code></td>
                <td>2024年1月之后</td>
              </tr>
              <tr>
                <td><code>:date=2024</code></td>
                <td>2024年内</td>
              </tr>
            </tbody>
          </table>

          <!-- 视频时长过滤器 -->
          <div class="dsl-subheading">3. 视频时长过滤器</div>
          <p class="dsl-desc">
            字段: <code>t</code>。时长格式: <code>Ns</code>(N秒),
            <code>Nm</code>(N分钟), <code>Nh</code>(N小时)
          </p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>语法</th>
                <th>含义</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>:t>5m</code></td>
                <td>时长大于5分钟</td>
              </tr>
              <tr>
                <td><code>:t&lt;=30m</code></td>
                <td>时长不超过30分钟</td>
              </tr>
              <tr>
                <td><code>:t=[5m, 30m]</code></td>
                <td>时长在5到30分钟之间</td>
              </tr>
            </tbody>
          </table>

          <!-- UP主过滤器 -->
          <div class="dsl-subheading">4. UP主昵称过滤器</div>
          <p class="dsl-desc">字段: <code>user</code></p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>语法</th>
                <th>含义</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>:user=影视飓风</code></td>
                <td>指定UP主</td>
              </tr>
              <tr>
                <td><code>:user=["影视飓风", "飓多多StormCrew"]</code></td>
                <td>指定多个UP主</td>
              </tr>
              <tr>
                <td><code>:user!=某UP主</code></td>
                <td>排除该UP主</td>
              </tr>
            </tbody>
          </table>

          <!-- UID过滤器 -->
          <div class="dsl-subheading">5. UP主UID过滤器</div>
          <p class="dsl-desc">字段: <code>uid</code></p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>语法</th>
                <th>含义</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>:uid=946974</code></td>
                <td>指定UP主UID</td>
              </tr>
              <tr>
                <td><code>:uid=[946974, 1780480185]</code></td>
                <td>指定多个UID</td>
              </tr>
            </tbody>
          </table>

          <!-- 搜索模式 -->
          <div class="dsl-subheading">6. 搜索模式</div>
          <p class="dsl-desc">字段: <code>q</code></p>
          <table class="dsl-table">
            <thead>
              <tr>
                <th>值</th>
                <th>含义</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>q=w</code></td>
                <td>仅文字搜索</td>
              </tr>
              <tr>
                <td><code>q=v</code></td>
                <td>仅向量搜索</td>
              </tr>
              <tr>
                <td><code>q=wv</code></td>
                <td>混合搜索（默认）</td>
              </tr>
              <tr>
                <td><code>q=vwr</code></td>
                <td>混合搜索+重排序（相关性更高）</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 三、组合示例 -->
        <div class="dsl-section">
          <div class="dsl-heading">三、组合示例</div>
          <ul class="dsl-examples">
            <li>
              <code>黑神话 :view>=1w :date&lt;=30d</code> —
              搜索"黑神话"，播放≥1万，30天内
            </li>
            <li>
              <code>:user=影视飓风 :date&lt;=7d</code> — 影视飓风最近7天的视频
            </li>
            <li>
              <code>Python 教程 -广告 :date&lt;=1y :view>=1k</code> —
              Python教程，排除广告，1年内，播放≥1千
            </li>
            <li>
              <code>:user=["老番茄", "影视飓风"] :date&lt;=30d</code> —
              两个UP主最近30天的视频
            </li>
            <li>
              <code>游戏评测 +黑神话 :view>=5w</code> —
              游戏评测且必含"黑神话"，播放≥5万
            </li>
            <li>
              <code>:user=何同学 :t>10m</code> — 何同学时长超过10分钟的视频
            </li>
            <li>
              <code>深度学习入门 q=vwr</code> —
              深度学习入门，启用重排序提高相关性
            </li>
          </ul>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions class="dsl-help-actions">
        <q-checkbox
          v-model="dontShowAgain"
          label="不再自动弹出"
          dense
          size="sm"
          class="dsl-dismiss-checkbox"
        />
        <q-space />
        <q-btn flat label="关闭" color="primary" @click="closeDialog" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

defineOptions({ name: 'DslHelpDialog' });

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const dontShowAgain = ref(!!localStorage.getItem('dslHelpDismissed'));

const closeDialog = () => {
  if (dontShowAgain.value) {
    localStorage.setItem('dslHelpDismissed', '1');
  }
  emit('update:modelValue', false);
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      dontShowAgain.value = !!localStorage.getItem('dslHelpDismissed');
    }
  }
);
</script>

<style lang="scss" scoped>
.dsl-help-card {
  display: flex;
  flex-direction: column;
  width: 90vw;
  max-width: 720px;
  max-height: 70vh;
  border-radius: 12px;
}

.dsl-help-toolbar {
  flex-shrink: 0;
  min-height: 48px;
  padding: 0 12px 0 16px;
}

.dsl-help-title {
  font-size: 15px;
  font-weight: 600;
}

.dsl-help-notice {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px 20px;
  opacity: 0.85;
}

.dsl-help-body {
  overflow-y: auto;
  padding: 16px 20px;
  font-size: 13px;
  line-height: 1.7;
}

.dsl-section {
  margin-bottom: 20px;
}

.dsl-format {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.dsl-heading {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
}

.dsl-subheading {
  font-size: 13px;
  font-weight: 600;
  margin: 12px 0 6px;
}

.dsl-desc {
  margin: 4px 0 8px;
  opacity: 0.8;
}

.dsl-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;

  th,
  td {
    text-align: left;
    padding: 5px 10px;
    border: 1px solid rgba(128, 128, 128, 0.2);
  }

  th {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.7;
  }

  code {
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 4px;
  }
}

.dsl-examples {
  padding-left: 18px;
  margin: 8px 0;

  li {
    margin: 4px 0;
  }

  code {
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    padding: 1px 5px;
    border-radius: 4px;
  }
}

.dsl-help-actions {
  flex-shrink: 0;
  padding: 8px 16px;
}

.dsl-dismiss-checkbox {
  font-size: 12px;
  opacity: 0.7;
}

body.body--light {
  .dsl-help-notice {
    background: rgba(0, 137, 123, 0.06);
  }

  .dsl-table {
    code {
      background: rgba(0, 0, 0, 0.05);
      color: #c7254e;
    }
  }

  .dsl-examples code {
    background: rgba(0, 0, 0, 0.05);
    color: #c7254e;
  }
}

body.body--dark {
  .dsl-help-notice {
    background: rgba(0, 137, 123, 0.12);
  }

  .dsl-table {
    code {
      background: rgba(255, 255, 255, 0.08);
      color: #e6db74;
    }
  }

  .dsl-examples code {
    background: rgba(255, 255, 255, 0.08);
    color: #e6db74;
  }
}
</style>
