<template>
  <div
    v-if="visible && videoInfo"
    class="bili-video-tooltip"
    :style="tooltipStyle"
    @mouseenter="onTooltipEnter"
    @mouseleave="onTooltipLeave"
  >
    <div class="tooltip-cover-wrapper">
      <img
        :src="coverUrl"
        class="tooltip-cover"
        referrerpolicy="no-referrer"
        loading="lazy"
      />
      <span class="tooltip-duration">{{ formattedDuration }}</span>
    </div>
    <div class="tooltip-info">
      <div class="tooltip-title">{{ videoInfo.title }}</div>
      <div class="tooltip-meta">
        <span class="tooltip-author">{{ ownerName }}</span>
        <span class="tooltip-views">
          <q-icon name="fa-regular fa-play-circle" size="10px" />
          {{ formattedViews }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { humanReadableNumber, secondsToDuration } from 'src/utils/convert';

interface VideoHit {
  bvid?: string;
  title?: string;
  pic?: string;
  duration?: number;
  owner?: { name?: string };
  stat?: { view?: number };
}

export default defineComponent({
  name: 'BiliVideoTooltip',
  props: {
    videoInfo: {
      type: Object as () => VideoHit | null,
      default: null,
    },
    visible: {
      type: Boolean,
      default: false,
    },
    anchorRect: {
      type: Object as () => DOMRect | null,
      default: null,
    },
    containerRect: {
      type: Object as () => DOMRect | null,
      default: null,
    },
  },
  emits: ['tooltip-enter', 'tooltip-leave'],
  setup(props, { emit }) {
    const tooltipStyle = computed(() => {
      if (!props.anchorRect || !props.containerRect) return {};
      const anchor = props.anchorRect;
      const container = props.containerRect;
      // Position below the anchor link, aligned to left
      const top = anchor.bottom - container.top + 6;
      let left = anchor.left - container.left;
      // Clamp to container width (tooltip is ~280px wide)
      const maxLeft = container.width - 288;
      if (left > maxLeft) left = Math.max(0, maxLeft);
      return {
        top: `${top}px`,
        left: `${left}px`,
      };
    });

    const coverUrl = computed(() => {
      const pic = props.videoInfo?.pic || '';
      if (pic.startsWith('//')) return 'https:' + pic;
      if (pic.startsWith('http://')) return pic.replace('http://', 'https://');
      return pic;
    });

    const formattedDuration = computed(() => {
      const d = props.videoInfo?.duration;
      return d ? secondsToDuration(d) : '';
    });

    const formattedViews = computed(() => {
      const v = props.videoInfo?.stat?.view;
      return v != null ? humanReadableNumber(v) : '';
    });

    const ownerName = computed(() => props.videoInfo?.owner?.name || '');

    const onTooltipEnter = () => emit('tooltip-enter');
    const onTooltipLeave = () => emit('tooltip-leave');

    return {
      tooltipStyle,
      coverUrl,
      formattedDuration,
      formattedViews,
      ownerName,
      onTooltipEnter,
      onTooltipLeave,
    };
  },
});
</script>

<style lang="scss" scoped>
.bili-video-tooltip {
  position: absolute;
  z-index: 9999;
  width: 280px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
  animation: tooltip-fade-in 0.15s ease-out;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltip-cover-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #111;
}

.tooltip-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tooltip-duration {
  position: absolute;
  bottom: 4px;
  right: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
}

.tooltip-info {
  padding: 8px 10px;
}

.tooltip-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tooltip-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.7;
}

.tooltip-views {
  display: flex;
  align-items: center;
  gap: 3px;
}

body.body--light {
  .bili-video-tooltip {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
  .tooltip-title {
    color: #333;
  }
  .tooltip-meta {
    color: #666;
  }
}

body.body--dark {
  .bili-video-tooltip {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .tooltip-title {
    color: #ddd;
  }
  .tooltip-meta {
    color: #aaa;
  }
}
</style>
