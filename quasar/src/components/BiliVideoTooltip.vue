<template>
  <Teleport to="body">
    <div
      v-if="visible && normalizedVideoInfo"
      class="bili-video-tooltip"
      :class="tooltipPlacementClass"
      :style="tooltipStyle"
      @mouseenter="onTooltipEnter"
      @mouseleave="onTooltipLeave"
      @wheel.prevent="onTooltipWheel"
    >
      <div class="tooltip-cover-wrapper">
        <span class="tooltip-top-bar"></span>
        <span class="tooltip-bottom-bar"></span>
        <img
          :src="cachedCoverUrl || coverUrl"
          class="tooltip-cover"
          referrerpolicy="no-referrer"
          loading="lazy"
        />
        <span v-if="regionName" class="tooltip-region-badge">{{
          regionName
        }}</span>
        <span v-if="formattedDuration" class="tooltip-duration-badge">{{
          formattedDuration
        }}</span>
        <span v-if="formattedViews" class="tooltip-view-badge">
          <q-icon name="fa-regular fa-play-circle" size="10px" />
          {{ formattedViews }}
        </span>
      </div>
      <div class="tooltip-info">
        <div class="tooltip-title">{{ normalizedVideoInfo.title }}</div>
        <div class="tooltip-footer">
          <span v-if="ownerName" class="tooltip-author">{{ ownerName }}</span>
          <span v-if="formattedPubdate" class="tooltip-pubdate">
            {{ formattedPubdate }}
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import {
  humanReadableNumber,
  secondsToDuration,
  tsToYmd,
} from 'src/utils/convert';
import {
  getDocumentZoom,
  getViewportCssHeight,
  getViewportCssWidth,
  viewportPxToCssPx,
} from 'src/utils/zoom';
import {
  normalizeVideoHit,
  normalizeVideoPicUrl,
  type VideoHitLike,
} from 'src/utils/videoHit';
import { useCachedImage } from 'src/composables/useCachedImage';
type VideoHit = VideoHitLike;

const TOOLTIP_ESTIMATED_HEIGHT = 260;
const TOOLTIP_WIDTH = 280;
const TOOLTIP_GAP = 6;
const VIEWPORT_MARGIN = 8;
const TOOLTIP_X_OFFSET = 22;

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
  emits: ['tooltip-enter', 'tooltip-leave', 'tooltip-wheel'],
  setup(props, { emit }) {
    const clamp = (value: number, min: number, max: number) => {
      return Math.min(Math.max(value, min), max);
    };

    const normalizedVideoInfo = computed(() => {
      return props.videoInfo ? normalizeVideoHit(props.videoInfo) : null;
    });

    const placement = computed(() => {
      if (!props.anchorRect) {
        return null;
      }

      const zoom = getDocumentZoom();
      const viewportW = getViewportCssWidth(zoom);
      const viewportH = getViewportCssHeight(zoom);
      const anchorLeft = viewportPxToCssPx(props.anchorRect.left, zoom);
      const anchorTop = viewportPxToCssPx(props.anchorRect.top, zoom);
      const anchorBottom = viewportPxToCssPx(props.anchorRect.bottom, zoom);
      const containerLeft = props.containerRect
        ? viewportPxToCssPx(props.containerRect.left, zoom)
        : VIEWPORT_MARGIN;
      const containerRight = props.containerRect
        ? viewportPxToCssPx(props.containerRect.right, zoom)
        : viewportW - VIEWPORT_MARGIN;
      const spaceAbove = anchorTop - TOOLTIP_GAP - VIEWPORT_MARGIN;
      const spaceBelow =
        viewportH - anchorBottom - TOOLTIP_GAP - VIEWPORT_MARGIN;
      const placeAbove =
        spaceBelow < TOOLTIP_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
      const minLeft = Math.min(
        Math.max(VIEWPORT_MARGIN, containerLeft + 8),
        viewportW - TOOLTIP_WIDTH - VIEWPORT_MARGIN
      );
      const maxLeft = Math.max(
        minLeft,
        Math.min(
          viewportW - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
          containerRight - TOOLTIP_WIDTH - VIEWPORT_MARGIN
        )
      );
      const left = clamp(anchorLeft + TOOLTIP_X_OFFSET, minLeft, maxLeft);
      const preferredTop = placeAbove
        ? anchorTop - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_GAP
        : anchorBottom + TOOLTIP_GAP;
      const maxTop = Math.max(
        VIEWPORT_MARGIN,
        viewportH - TOOLTIP_ESTIMATED_HEIGHT - VIEWPORT_MARGIN
      );
      const top = clamp(preferredTop, VIEWPORT_MARGIN, maxTop);

      return {
        left,
        top,
        placeAbove,
      };
    });

    const tooltipPlacementClass = computed(() =>
      placement.value?.placeAbove ? 'tooltip-above' : 'tooltip-below'
    );

    const tooltipStyle = computed(() => {
      if (!placement.value) return { display: 'none' };
      return {
        position: 'fixed' as const,
        left: `${placement.value.left}px`,
        top: `${placement.value.top}px`,
      };
    });

    const coverUrl = computed(() => {
      return normalizeVideoPicUrl(normalizedVideoInfo.value?.pic);
    });

    const { cachedSrc: cachedCoverUrl } = useCachedImage(() => coverUrl.value);

    const formattedDuration = computed(() => {
      const duration = normalizedVideoInfo.value?.duration;
      return duration ? secondsToDuration(duration) : '';
    });

    const formattedViews = computed(() => {
      const views = normalizedVideoInfo.value?.stat?.view;
      return views != null ? humanReadableNumber(views) : '';
    });

    const ownerName = computed(
      () => normalizedVideoInfo.value?.owner?.name || ''
    );

    const regionName = computed(
      () =>
        normalizedVideoInfo.value?.region_parent_name ||
        normalizedVideoInfo.value?.region_name ||
        ''
    );

    const formattedPubdate = computed(() => {
      const pubdate = normalizedVideoInfo.value?.pubdate;
      return pubdate ? tsToYmd(pubdate) : '';
    });

    const onTooltipEnter = () => emit('tooltip-enter');
    const onTooltipLeave = () => emit('tooltip-leave');
    const onTooltipWheel = (event: WheelEvent) => {
      emit('tooltip-wheel', event.deltaY);
    };

    return {
      normalizedVideoInfo,
      tooltipPlacementClass,
      tooltipStyle,
      coverUrl,
      cachedCoverUrl,
      formattedDuration,
      formattedViews,
      ownerName,
      regionName,
      formattedPubdate,
      onTooltipEnter,
      onTooltipLeave,
      onTooltipWheel,
    };
  },
});
</script>

<style lang="scss" scoped>
@use '../css/video-preview-card.scss' as preview;

.bili-video-tooltip {
  position: fixed;
  z-index: 9999;
  width: 280px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
}

.tooltip-below {
  animation: tooltip-fade-in-below 0.15s ease-out;
}

.tooltip-above {
  animation: tooltip-fade-in-above 0.15s ease-out;
}

@keyframes tooltip-fade-in-below {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes tooltip-fade-in-above {
  from {
    opacity: 0;
    transform: translateY(4px);
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

.tooltip-top-bar,
.tooltip-bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 1;
  @include preview.cover-bar;
  @include preview.cover-bar-visible;
}

.tooltip-top-bar {
  top: 0;
}

.tooltip-bottom-bar {
  bottom: 0;
}

.tooltip-cover {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tooltip-duration-badge,
.tooltip-region-badge,
.tooltip-view-badge {
  position: absolute;
  z-index: 2;
  @include preview.cover-badge;
}

.tooltip-duration-badge {
  top: calc(100% - 12px);
  right: 6px;
  transform: translateY(-50%);
}

.tooltip-region-badge {
  top: 4px;
  right: 6px;
}

.tooltip-view-badge {
  top: calc(100% - 12px);
  left: 6px;
  gap: 3px;
  transform: translateY(-50%);
}

.tooltip-view-badge :deep(.q-icon) {
  font-size: 10px;
  line-height: 1;
}

.tooltip-info {
  padding: 8px 10px 7px;
}

.tooltip-title {
  @include preview.title;
}

.tooltip-footer {
  margin-top: 2px;
  @include preview.bottom-row;
}

.tooltip-author {
  @include preview.owner;
}

.tooltip-pubdate {
  @include preview.pubdate;
  margin-left: 10px;
}

body.body--light {
  .bili-video-tooltip {
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
  .tooltip-title {
    color: #333;
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
}
</style>
