<template>
  <q-card
    flat
    class="result-item q-pt-none q-pb-sm"
    :class="{ 'result-item-menu-open': contextMenuOpen }"
  >
    <!-- Right-click context menu -->
    <ResultItemContextMenu
      :bvid="result.bvid"
      @view-snapshot="showSnapshotViewer = true"
      @menu-open="contextMenuOpen = true"
      @menu-close="contextMenuOpen = false"
    />
    <!-- Snapshot viewer dialog -->
    <VideoSnapshotViewer
      v-model="showSnapshotViewer"
      :bvid="result.bvid"
      :title="result.title"
      :result="result"
    />
    <q-card-section class="q-px-xs q-pt-none q-pb-xs">
      <a
        :href="`https://www.bilibili.com/video/${result.bvid}`"
        target="_blank"
      >
        <q-img
          :src="coverSrc"
          :title="result.title + '\n' + result.tags"
          referrerpolicy="no-referrer"
          class="rounded-borders result-item-cover"
          :ratio="224 / 140"
          no-transition
          no-spinner
          @load="onCoverLoad"
        >
          <span
            class="text-caption absolute-bottom text-center result-bottom-bar"
            :class="{ 'bar-visible': coverLoaded }"
          ></span>
          <span
            class="text-caption absolute-top text-center result-top-bar"
            :class="{ 'bar-visible': coverLoaded }"
          ></span>
          <span class="text-caption result-score">
            {{
              normalizedResult?.score != null
                ? normalizedResult.score.toFixed(1)
                : ''
            }}
          </span>
          <span class="text-caption result-tname">
            {{ getRegionName() }}
          </span>
          <span class="text-caption result-view">
            <q-icon name="fa-regular fa-play-circle"></q-icon>
            {{
              normalizedResult?.stat?.view != null
                ? humanReadableNumber(normalizedResult.stat.view)
                : ''
            }}
          </span>
          <span class="text-caption result-duration">
            {{
              normalizedResult?.duration
                ? secondsToDuration(normalizedResult.duration)
                : ''
            }}
          </span>
        </q-img>
      </a>
    </q-card-section>
    <q-card-section class="q-px-xs q-pt-none q-pb-xs">
      <a
        :href="`https://www.bilibili.com/video/${result.bvid}`"
        target="_blank"
      >
        <div
          class="result-title"
          :class="{ 'cjk-punct-indent': titleHasLeadingCjkPunct }"
          v-html="highlightedTitle()"
          :title="result.title + '\n' + result.tags"
        ></div>
      </a>
    </q-card-section>
    <q-item class="q-px-xs q-pt-none q-pb-xs result-bottom">
      <q-item-section side class="result-owner-name">
        <a
          :href="`https://space.bilibili.com/${result.owner?.mid || 0}/video`"
          target="_blank"
        >
          <div v-html="highlightedOwnerName()"></div>
        </a>
      </q-item-section>
      <q-item-section></q-item-section>
      <q-item-section side class="result-pubdate">
        <div v-html="highlightedPubdateStr()"></div>
      </q-item-section>
    </q-item>
  </q-card>
</template>

<script>
import { ref, watch } from 'vue';
import { computed } from 'vue';
import constants from '../stores/constants.json';
import {
  humanReadableNumber,
  secondsToDuration,
  tsToYmd,
  hasLeadingCjkPunctuation,
} from 'src/utils/convert';
import { useCachedImage } from 'src/composables/useCachedImage';
import { normalizeVideoHit, normalizeVideoPicUrl } from 'src/utils/videoHit';
import ResultItemContextMenu from './ResultItemContextMenu.vue';
import VideoSnapshotViewer from './VideoSnapshotViewer.vue';

export default {
  components: {
    ResultItemContextMenu,
    VideoSnapshotViewer,
  },
  props: {
    result: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const normalizedResult = computed(() => normalizeVideoHit(props.result));
    const { cachedSrc: coverSrc } = useCachedImage(() =>
      normalizeVideoPicUrl(normalizedResult.value.pic)
    );
    const coverLoaded = ref(false);
    const showSnapshotViewer = ref(false);

    // Reset coverLoaded when the image source changes
    watch(coverSrc, () => {
      coverLoaded.value = false;
    });

    const onCoverLoad = () => {
      coverLoaded.value = true;
    };

    const contextMenuOpen = ref(false);

    const titleHasLeadingCjkPunct = computed(() =>
      hasLeadingCjkPunctuation(props.result?.title || '')
    );

    return {
      normalizedResult,
      coverSrc,
      coverLoaded,
      onCoverLoad,
      showSnapshotViewer,
      contextMenuOpen,
      titleHasLeadingCjkPunct,
    };
  },
  data() {
    return {
      coverPicSuffix: constants.coverPicSuffix,
      userPicSuffix: constants.userPicSuffix,
    };
  },
  methods: {
    highlightedTitle() {
      if (
        this.result.highlights?.merged &&
        this.result.highlights?.merged['title']
      ) {
        return this.result.highlights?.merged['title'][0];
      } else {
        return this.result.title;
      }
    },
    highlightedOwnerName() {
      if (
        this.result.highlights?.merged &&
        this.result.highlights?.merged['owner.name']
      ) {
        return this.result.highlights?.merged['owner.name'][0];
      } else {
        return this.result.owner?.name || '';
      }
    },
    highlightedPubdateStr() {
      return tsToYmd(this.normalizedResult?.pubdate || '');
    },
    humanReadableNumber,
    secondsToDuration,
    getRegionName() {
      return (
        this.normalizedResult?.region_parent_name ||
        this.normalizedResult?.region_name ||
        ''
      );
    },
  },
};
</script>

<style lang="scss" scoped>
@use '../css/video-preview-card.scss' as preview;

.result-item {
  background-color: transparent;
  max-width: var(--result-item-width);
  /* Skip rendering off-screen items; provide intrinsic size hint for scrollbar accuracy */
  content-visibility: auto;
  contain-intrinsic-block-size: auto 200px;
}
.result-item-cover {
  max-width: var(--result-item-width);
  width: 100%;
}
.result-item {
  transition: transform 0.25s ease, filter 0.3s ease;
}
.result-item:hover,
.result-item.result-item-menu-open {
  transform: scale(1.025);
}
body.body--light .result-item:hover,
body.body--light .result-item.result-item-menu-open {
  background: linear-gradient(#ffffff00, #eeeeeeee);
  filter: contrast(1.25) saturate(1.15) brightness(1.05);
}
body.body--dark .result-item:hover,
body.body--dark .result-item.result-item-menu-open {
  background: linear-gradient(#22222200, #55555555);
  filter: contrast(1.25) saturate(1.15) brightness(1.1);
}
.result-owner-avatar,
.result-pubdate {
  @include preview.pubdate;
}
.result-owner-name {
  @include preview.owner;
}
.result-title {
  @include preview.title;
}
/* Compensate leading CJK punctuation whitespace when halt is not supported */
.result-title.cjk-punct-indent {
  text-indent: -0.5em;
  padding-left: 0.5em;
}
body.body--light .result-owner-name:hover,
body.body--light .result-title:hover {
  color: #0080d0;
  opacity: 1;
}
body.body--dark .result-owner-name:hover,
body.body--dark .result-title:hover {
  color: #60c0f0;
  opacity: 1;
}
.q-card a {
  text-decoration: none;
  color: inherit;
}
.q-item {
  @include preview.bottom-row;
}
.result-score,
.result-tname,
.result-view,
.result-duration {
  @include preview.cover-badge;
  position: absolute;
  z-index: 2;
  max-width: calc(50% - 12px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-score {
  top: 4px;
  left: 6px;
}

.result-tname {
  top: 4px;
  right: 6px;
  text-align: right;
}

.result-view,
.result-duration {
  top: calc(100% - 12px);
  transform: translateY(-50%);
}

.result-view {
  left: 6px;
  gap: 5px;
}

.result-duration {
  right: 6px;
  text-align: right;
}
.result-top-bar,
.result-bottom-bar {
  @include preview.cover-bar;
}
.result-top-bar.bar-visible,
.result-bottom-bar.bar-visible {
  @include preview.cover-bar-visible;
}
.q-img i {
  vertical-align: 2%;
}
</style>
