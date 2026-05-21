<template>
  <div ref="containerRef" class="tool-call-container" v-bind="rootAttrs">
    <div
      v-for="(call, idx) in visibleToolCalls"
      :key="`${call.type}-${idx}`"
      class="tool-call-item"
      :class="{
        'tool-call-pending': call.status === 'pending',
        'tool-call-streaming': call.status === 'streaming',
        'tool-call-completed': call.status === 'completed',
      }"
    >
      <div class="tool-call-header" @click="toggleExpand(idx)">
        <div class="tool-call-left">
          <q-icon
            v-if="isAborted && call.status === 'pending'"
            name="block"
            size="14px"
            class="tool-call-icon tool-call-aborted-icon"
          />
          <q-spinner-dots
            v-else-if="call.status === 'pending' || call.status === 'streaming'"
            size="14px"
            class="tool-call-spinner"
          />
          <q-icon
            v-else
            :name="getToolIcon(call.type)"
            size="14px"
            class="tool-call-icon"
          />
          <span class="tool-call-name">{{ getToolLabel(call.type) }}</span>
          <span
            v-if="!isCompactToolDisplay && call.type !== 'search_videos'"
            class="tool-call-args"
            >{{
            formatToolArgs(call)
          }}</span>
          <span
            v-else-if="
              !isCompactToolDisplay && getQueryList(call).length <= 1
            "
            class="tool-call-args-full"
          >
            {{ getQueryList(call)[0] || '' }}
          </span>
        </div>
        <div class="tool-call-right">
          <span
            v-if="isAborted && call.status === 'pending'"
            class="tool-call-status-aborted"
          >
            已中止
          </span>
          <span
            v-else-if="call.status === 'streaming'"
            class="tool-call-status-streaming"
          >
            {{ getStreamingStatusText(call) }}
          </span>
          <span
            v-else-if="call.status === 'pending'"
            class="tool-call-status-pending"
          >
            {{ getPendingStatusText(call) }}
          </span>
          <q-btn
            v-if="
              call.type === 'search_videos' &&
              call.status === 'completed' &&
              hasResults(call)
            "
            flat
            dense
            no-caps
            size="sm"
            icon="tab"
            :label="
              isCompactToolDisplay
                ? getResultCount(call)
                : `在新窗口中查看 ${getResultCount(call)}`
            "
            :title="`在新窗口中查看 ${getResultCount(call)}`"
            class="tool-view-all-btn"
            @click.stop="$emit('viewAllResults', call)"
          />
          <span
            v-else-if="
              call.status === 'completed' &&
              hasResults(call) &&
              call.type !== 'search_videos' &&
              !isAlwaysExpanded(call)
            "
            class="tool-call-status-completed"
          >
            {{ getResultCount(call) }}
          </span>
          <span
            v-else-if="call.status === 'completed' && isAlwaysExpanded(call)"
            class="tool-call-status-completed"
          >
            {{ getResultCount(call) }}
          </span>
          <q-icon
            v-if="isExpandable(call)"
            :name="expanded[idx] ? 'expand_less' : 'expand_more'"
            size="16px"
            class="tool-call-expand-icon"
          />
        </div>
      </div>

      <div
        v-if="
          !isCompactToolDisplay &&
          call.type === 'search_videos' &&
          getQueryList(call).length > 1
        "
        class="tool-query-list"
      >
        <div
          v-for="(query, qidx) in getQueryList(call)"
          :key="qidx"
          class="tool-query-item"
        >
          <q-icon name="search" size="12px" class="tool-query-icon" />
          <span class="tool-query-text">{{ query }}</span>
        </div>
      </div>

      <div
        v-if="shouldRenderToolDetails(call)"
        class="tool-call-results-wrapper"
        :class="getResultsWrapperClasses(call, idx)"
      >
        <div class="tool-call-results-inner">
          <div class="tool-call-results">
            <div v-if="getToolError(call)" class="tool-result-error">
              {{ getToolError(call) }}
            </div>

            <div v-else-if="call.type === 'search_videos'">
              <template v-if="getPerQueryResults(call).length > 1">
                <div
                  v-for="(qr, qridx) in getPerQueryResults(call)"
                  :key="qridx"
                  class="per-query-section"
                >
                  <div class="per-query-header">
                    <q-icon name="search" size="12px" class="per-query-icon" />
                    <span class="per-query-text">{{ qr.query }}</span>
                    <span class="per-query-count">{{ qr.hits.length }} 条</span>
                  </div>
                  <div class="tool-results-grid">
                    <div
                      v-for="(hit, hidx) in qr.hits"
                      :key="hit.bvid || hidx"
                      class="tool-result-item"
                      @click="openVideoPage(hit)"
                    >
                      <img
                        v-if="hit.pic"
                        :src="normalizePicUrl(hit.pic)"
                        class="tool-result-cover"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                      />
                      <div v-else class="tool-result-cover-placeholder">
                        <q-icon name="smart_display" size="20px" />
                      </div>
                      <div class="tool-result-info">
                        <span class="tool-result-title" :title="hit.title">{{
                          hit.title
                        }}</span>
                        <span class="tool-result-author">{{
                          hit.owner?.name || ''
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <div v-else class="tool-results-grid">
                <div
                  v-for="(hit, hidx) in getAllVideoHits(call)"
                  :key="hit.bvid || hidx"
                  class="tool-result-item"
                  @click="openVideoPage(hit)"
                >
                  <img
                    v-if="hit.pic"
                    :src="normalizePicUrl(hit.pic)"
                    class="tool-result-cover"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <div v-else class="tool-result-cover-placeholder">
                    <q-icon name="smart_display" size="20px" />
                  </div>
                  <div class="tool-result-info">
                    <span class="tool-result-title" :title="hit.title">{{
                      hit.title
                    }}</span>
                    <span class="tool-result-author">{{
                      hit.owner?.name || ''
                    }}</span>
                  </div>
                </div>
              </div>

              <div
                v-if="getAllVideoHits(call).length > 0"
                class="tool-result-collapse-bar"
                @click.stop="collapseAndScroll(idx)"
              >
                <q-icon
                  name="expand_less"
                  size="18px"
                  class="collapse-bar-icon"
                />
              </div>
            </div>

            <div
              v-else-if="call.type === 'check_author'"
              class="tool-result-author-info"
            >
              <div v-if="getAuthorResult(call).found" class="author-found">
                <span class="author-name">{{
                  getAuthorResult(call).name
                }}</span>
                <span class="author-mid"
                  >mid: {{ getAuthorResult(call).mid }}</span
                >
              </div>
              <div v-else class="author-not-found">未找到该作者</div>
            </div>

            <div
              v-else-if="call.type === 'get_video_transcript'"
              class="tool-text-results"
            >
              <div class="tool-transcript-text">
                {{ getTranscriptText(call) }}
              </div>
            </div>

            <div
              v-else-if="isSmallModelTextTool(call)"
              class="tool-text-results"
            >
              <div
                v-if="shouldRenderSmallTaskMarkdown(call)"
                class="tool-text-result tool-markdown-result"
                :class="getSmallTaskResultClasses(call)"
                @wheel="handleSmallTaskWheel($event, idx)"
                v-html="renderSmallTaskMarkdown(call, idx)"
              ></div>
              <pre
                v-else
                class="tool-text-result"
                :class="getSmallTaskResultClasses(call)"
                @wheel="handleSmallTaskWheel($event, idx)"
                >{{ getSmallTaskResultText(call, idx) }}</pre
              >
            </div>

            <div
              v-else-if="call.type === 'search_google'"
              class="tool-google-results"
            >
              <a
                v-for="(result, ridx) in getGoogleResults(call)"
                :key="result.link || ridx"
                class="tool-google-result"
                :href="result.link || '#'"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
              >
                <div class="tool-google-result-title">
                  {{ result.title || result.link }}
                </div>
                <div
                  v-if="getGoogleDisplayedUrl(result)"
                  class="tool-google-result-topline"
                >
                  <span class="tool-google-result-source">{{
                    getGoogleDisplayedUrl(result)
                  }}</span>
                  <q-icon
                    name="open_in_new"
                    size="12px"
                    class="tool-google-result-open"
                  />
                </div>
                <div
                  v-if="getGoogleSnippet(result)"
                  class="tool-google-result-snippet"
                >
                  {{ getGoogleSnippet(result) }}
                </div>
              </a>
            </div>

            <div
              v-else-if="call.type === 'search_owners'"
              class="tool-owner-groups"
            >
              <div
                v-for="group in getOwnerGroups(call)"
                :key="group.source"
                class="tool-owner-group"
              >
                <div class="tool-owner-group-header">
                  <span class="tool-owner-group-title">{{ group.label }}</span>
                  <span class="tool-owner-group-count"
                    >{{ group.total_owners }} 位</span
                  >
                </div>
                <div class="tool-owner-results">
                  <div
                    v-for="(owner, oidx) in group.owners"
                    :key="`${group.source}-${owner.mid || owner.name || 'owner'}-${oidx}`"
                    class="tool-owner-result"
                  >
                    <a
                      v-if="owner.mid"
                      class="tool-owner-mini-ref"
                      :href="getOwnerHref(owner.mid)"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click.stop
                    >
                      <span class="tool-owner-mini-meta">
                        <span class="tool-owner-mini-name">
                          {{ getOwnerDisplayName(owner) }}
                        </span>
                        <span class="tool-owner-mini-mid">
                          {{ getOwnerUidText(owner.mid) }}
                        </span>
                      </span>
                    </a>
                    <div
                      v-else
                      class="tool-owner-mini-ref tool-owner-mini-ref--disabled"
                    >
                      <span class="tool-owner-mini-meta">
                        <span class="tool-owner-mini-name">
                          {{ getOwnerDisplayName(owner, '未命名作者') }}
                        </span>
                        <span v-if="owner.mid" class="tool-owner-mini-mid">
                          {{ getOwnerUidText(owner.mid) }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  v-if="!group.owners.length && group.error"
                  class="tool-owner-group-error"
                >
                  {{ group.error }}
                </div>
              </div>
            </div>

            <div
              v-else-if="isVideoCommentsTool(call)"
              class="tool-comments-result"
            >
              <div class="tool-comments-toolbar">
                <div class="tool-comments-controls" @click.stop>
                  <label class="tool-comments-sort" aria-label="评论排序">
                    <select
                      :value="getCommentSortMode(idx, call)"
                      title="评论排序"
                      @change="handleCommentSortChange(idx, call, $event)"
                    >
                      <option value="default">默认排序</option>
                      <option value="hot">按热度</option>
                      <option value="time_asc">时间正序</option>
                      <option value="time_desc">时间逆序</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    class="tool-comments-chip tool-comments-chip--filter"
                    :class="{
                      'tool-comments-chip--active':
                        isCommentLikedFilterActive(idx, call),
                    }"
                    @click.stop="toggleCommentLikedFilter(idx, call)"
                  >
                    仅看有赞
                  </button>
                  <button
                    type="button"
                    class="tool-comments-chip tool-comments-chip--filter"
                    :class="{
                      'tool-comments-chip--active':
                        isCommentAuthorFilterActive(idx, call),
                    }"
                    @click.stop="toggleCommentAuthorFilter(idx, call)"
                  >
                    仅看视频作者回复
                  </button>
                  <button
                    type="button"
                    class="tool-comments-chip tool-comments-chip--fold"
                    :class="{
                      'tool-comments-chip--active':
                        getAllCommentRootsCollapseMode(idx, call) ===
                        'collapsed',
                    }"
                    @click.stop="setAllCommentRootsCollapsed(idx, call, true)"
                  >
                    折叠楼层
                  </button>
                  <button
                    type="button"
                    class="tool-comments-chip tool-comments-chip--expand"
                    :class="{
                      'tool-comments-chip--active':
                        getAllCommentRootsCollapseMode(idx, call) ===
                        'expanded',
                    }"
                    @click.stop="setAllCommentRootsCollapsed(idx, call, false)"
                  >
                    展开楼层
                  </button>
                </div>
                <div class="tool-comments-toolbar-actions">
                  <button
                    type="button"
                    class="tool-comments-download-json"
                    @click.stop="downloadCommentsJson(call)"
                  >
                    <q-icon name="download" size="13px" />
                    下载 JSON
                  </button>
                  <button
                    v-if="shouldShowToolbarCommentsLoadMore(call)"
                    type="button"
                    class="tool-comments-chip tool-comments-chip--load-more tool-comments-load-more-toolbar"
                    :disabled="isToolbarCommentsLoadMoreLoading(call)"
                    @click.stop="loadMoreCommentsFromToolbar(idx, call)"
                  >
                    {{ getToolbarCommentsLoadMoreText(call) }}
                  </button>
                  <button
                    type="button"
                    class="tool-comments-chip tool-comments-chip--top tool-comments-top-chip"
                    @click.stop="scrollCommentsToTop(idx)"
                  >
                    回到顶部
                  </button>
                </div>
              </div>

              <div
                class="tool-comments-visual"
                @scroll.passive="handleCommentsVisualScroll(idx, call, $event)"
              >
                <div
                  v-for="item in getVideoCommentItems(call)"
                  :key="item.bvid || 'comments'"
                  class="tool-comments-video"
                >
                  <div class="tool-comments-video-header">
                    <div class="tool-comments-video-title-block">
                      <span class="tool-comments-video-title">
                        {{ getVideoCommentTitle(item) }}
                      </span>
                      <span
                        v-if="getVideoCommentOwnerText(item)"
                        class="tool-comments-video-owner"
                      >
                        {{ getVideoCommentOwnerText(item) }}
                      </span>
                    </div>
                    <span class="tool-comments-video-meta">
                      {{ getVideoCommentItemMeta(item) }}
                    </span>
                  </div>
                  <div
                    v-if="getRenderedVisibleVideoCommentTree(idx, call, item).length"
                    class="tool-comments-tree"
                    :class="{
                      'tool-comments-tree--single-video':
                        isSingleVideoCommentsResult(call),
                    }"
                  >
                    <div
                      v-for="root in getRenderedVisibleVideoCommentTree(
                        idx,
                        call,
                        item
                      )"
                      :key="getCommentId(root)"
                      class="tool-comment-root"
                      :data-comment-id="getCommentId(root)"
                    >
                      <div
                        class="tool-comment-row"
                        :class="{
                          'tool-comment--highlighted':
                            isCommentHighlighted(idx, item, root),
                        }"
                      >
                        <div class="tool-comment-main">
                          <div class="tool-comment-header">
                            <a
                              v-if="getCommentAuthorHref(root)"
                              class="tool-comment-author"
                              :href="getCommentAuthorHref(root)"
                              target="_blank"
                              rel="noopener noreferrer"
                              @click.stop
                            >
                              {{ getCommentAuthor(root) }}
                            </a>
                            <span v-else class="tool-comment-author">
                              {{ getCommentAuthor(root) }}
                            </span>
                            <span
                              v-for="tag in getCommentAuthorTags(root, item)"
                              :key="tag"
                              class="tool-comment-author-tag"
                              :class="getCommentAuthorTagClass(tag)"
                            >
                              {{ tag }}
                            </span>
                            <span class="tool-comment-time">{{
                              getCommentTime(root)
                            }}</span>
                            <span
                              v-if="getCommentLikeValue(root) > 0"
                              class="tool-comment-like"
                            >
                              <q-icon name="thumb_up" size="12px" />
                              {{ getCommentLikeText(root) }}
                            </span>
                            <span
                              v-if="root.is_top"
                              class="tool-comment-badge"
                            >
                              置顶
                            </span>
                            <span
                              v-if="root.is_hot"
                              class="tool-comment-badge"
                            >
                              热门
                            </span>
                            <button
                              v-if="getReturnTargetForComment(idx, item, root)"
                              type="button"
                              class="tool-comment-jump-button"
                              @click.stop="
                                returnToCommentById(
                                  idx,
                                  item,
                                  getReturnTargetForComment(idx, item, root)
                                )
                              "
                            >
                              返回回复
                            </button>
                          </div>
                          <div class="tool-comment-content">
                            {{ getDisplayCommentMessage(root) }}
                          </div>
                          <button
                            v-if="shouldCollapseCommentMessage(root)"
                            type="button"
                            class="tool-comment-read-more"
                            @click.stop="toggleLongComment(root)"
                          >
                            {{
                              isLongCommentExpanded(root)
                                ? '收起全文'
                                : '查看全文'
                            }}
                          </button>
                          <div
                            v-if="getCommentPictures(root).length"
                            class="tool-comment-images"
                          >
                            <button
                              v-for="(picture, pidx) in getCommentPictures(root)"
                              :key="`${getCommentId(root)}-${pidx}`"
                              type="button"
                              class="tool-comment-image-thumb"
                              @click.stop="
                                openCommentImageViewer(idx, call, item, root, pidx)
                              "
                            >
                              <img
                                :src="getCommentPictureUrl(picture)"
                                :data-fallback-src="
                                  getCommentPictureFallbackUrl(picture)
                                "
                                :data-original-src="getCommentPictureUrl(picture)"
                                alt=""
                                loading="lazy"
                                decoding="async"
                                referrerpolicy="no-referrer"
                                @load="
                                  cacheCommentPictureUrl(getCommentPictureUrl(picture))
                                "
                                @error="handleCommentPictureError"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="root.replies.length"
                        class="tool-comment-replies"
                        :class="{
                          'tool-comment-replies--expanded':
                            !isCommentRootCollapsed(idx, item, root),
                        }"
                      >
                        <div
                          v-if="
                            shouldShowCommentRepliesActions(idx, item, root)
                          "
                          class="tool-comment-replies-actions"
                        >
                          <button
                            v-if="
                              shouldShowCommentRepliesToggle(idx, item, root)
                            "
                            type="button"
                            class="tool-comment-replies-toggle"
                            @click.stop="toggleCommentRoot(idx, call, item, root)"
                          >
                            <q-icon
                              class="tool-comment-replies-toggle-icon"
                              :name="
                                isCommentRootCollapsed(idx, item, root)
                                  ? 'chevron_right'
                                  : 'expand_more'
                              "
                              size="15px"
                            />
                            <span>
                              {{
                                isCommentRootCollapsed(idx, item, root)
                                  ? `展开 ${getVisibleCommentReplyCount(idx, root)} 条回复`
                                  : `收起 ${getVisibleCommentReplyCount(idx, root)} 条回复`
                              }}
                            </span>
                          </button>
                          <template
                            v-if="shouldShowCommentRepliesControls(idx, root)"
                          >
                            <label
                              class="tool-comments-sort tool-comments-sort--small"
                              aria-label="楼层回复排序"
                            >
                              <select
                                :value="getCommentLayerSortMode(idx, root)"
                                title="楼层回复排序"
                                @change="
                                  handleCommentLayerSortChange(idx, root, $event)
                                "
                              >
                                <option value="default">默认排序</option>
                                <option value="hot">热度</option>
                                <option value="time_asc">时间正序</option>
                                <option value="time_desc">时间逆序</option>
                              </select>
                            </label>
                            <button
                              type="button"
                              class="tool-comments-chip tool-comments-chip--filter tool-comments-chip--small"
                              :class="{
                                'tool-comments-chip--active':
                                  isCommentLayerLikedFilterActive(idx, root),
                              }"
                              @click.stop="
                                toggleCommentLayerLikedFilter(idx, call, item, root)
                              "
                            >
                              仅看有赞
                            </button>
                            <button
                              type="button"
                              class="tool-comments-chip tool-comments-chip--filter tool-comments-chip--small"
                              :class="{
                                'tool-comments-chip--active':
                                  isCommentLayerOwnerFilterActive(idx, root),
                              }"
                              @click.stop="
                                toggleCommentLayerOwnerFilter(idx, call, item, root)
                              "
                            >
                              仅看层主回复
                            </button>
                          </template>
                        </div>
                        <div
                          v-if="getRenderedCommentReplies(idx, item, root).length"
                          class="tool-comment-reply-list"
                          :class="{
                            'tool-comment-reply-list--preview':
                              isCommentRootCollapsed(idx, item, root),
                          }"
                        >
                          <div
                            v-for="reply in getRenderedCommentReplies(idx, item, root)"
                            :key="getCommentId(reply)"
                            class="tool-comment-reply"
                            :class="{
                              'tool-comment--highlighted':
                                isCommentHighlighted(idx, item, reply),
                              'tool-comment-reply--preview':
                                isCommentRootCollapsed(idx, item, root),
                            }"
                            :data-comment-id="getCommentId(reply)"
                          >
                            <div class="tool-comment-header">
                              <a
                                v-if="getCommentAuthorHref(reply)"
                                class="tool-comment-author"
                                :href="getCommentAuthorHref(reply)"
                                target="_blank"
                                rel="noopener noreferrer"
                                @click.stop
                              >
                                {{ getCommentAuthor(reply) }}
                              </a>
                              <span v-else class="tool-comment-author">
                                {{ getCommentAuthor(reply) }}
                              </span>
                              <span
                              v-for="tag in getCommentAuthorTags(reply, item, root)"
                              :key="tag"
                              class="tool-comment-author-tag"
                              :class="getCommentAuthorTagClass(tag)"
                            >
                              {{ tag }}
                            </span>
                              <span
                                v-if="shouldShowCommentReplyAction(reply)"
                                class="tool-comment-reply-target"
                              >
                                <button
                                  class="tool-comment-reply-word"
                                  type="button"
                                  @click.stop="
                                    toggleCommentReference(idx, item, reply)
                                  "
                                >
                                  {{ getCommentReplyActionText(reply, root) }}
                                </button>
                                <span v-if="getCommentReplyTarget(reply, root)">
                                  {{ getCommentReplyTarget(reply, root) }}
                                </span>
                              </span>
                              <span class="tool-comment-time">{{
                                getCommentTime(reply)
                              }}</span>
                              <span
                                v-if="getCommentLikeValue(reply) > 0"
                                class="tool-comment-like"
                              >
                                <q-icon name="thumb_up" size="12px" />
                                {{ getCommentLikeText(reply) }}
                              </span>
                              <span
                                v-if="reply.is_hot"
                                class="tool-comment-badge"
                              >
                                热门
                              </span>
                              <button
                                v-if="getReturnTargetForComment(idx, item, reply)"
                                type="button"
                                class="tool-comment-jump-button"
                                @click.stop="
                                  returnToCommentById(
                                    idx,
                                    item,
                                    getReturnTargetForComment(idx, item, reply)
                                  )
                                "
                              >
                                返回回复
                              </button>
                            </div>
                            <div class="tool-comment-content">
                              {{ getDisplayCommentMessage(reply) }}
                            </div>
                            <button
                              v-if="shouldCollapseCommentMessage(reply)"
                              type="button"
                              class="tool-comment-read-more"
                              @click.stop="toggleLongComment(reply)"
                            >
                              {{
                                isLongCommentExpanded(reply)
                                  ? '收起全文'
                                  : '查看全文'
                              }}
                            </button>
                            <div
                              v-if="getCommentPictures(reply).length"
                              class="tool-comment-images"
                            >
                              <button
                                v-for="(picture, pidx) in getCommentPictures(reply)"
                                :key="`${getCommentId(reply)}-${pidx}`"
                                type="button"
                                class="tool-comment-image-thumb"
                                @click.stop="
                                  openCommentImageViewer(idx, call, item, reply, pidx)
                                "
                              >
                                <img
                                  :src="getCommentPictureUrl(picture)"
                                  :data-fallback-src="
                                    getCommentPictureFallbackUrl(picture)
                                  "
                                  :data-original-src="getCommentPictureUrl(picture)"
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  referrerpolicy="no-referrer"
                                  @load="
                                    cacheCommentPictureUrl(getCommentPictureUrl(picture))
                                  "
                                  @error="handleCommentPictureError"
                                />
                              </button>
                            </div>
                            <div
                              v-if="
                                isCommentReferenceExpanded(idx, item, reply) &&
                                getReferencedComment(reply, root)
                              "
                              class="tool-comment-reference"
                            >
                              <div class="tool-comment-reference-header">
                                <span class="tool-comment-reference-author">
                                  {{
                                    getCommentAuthor(
                                      getReferencedComment(reply, root)
                                    )
                                  }}
                                </span>
                                <span class="tool-comment-reference-time">
                                  {{
                                    getCommentTime(
                                      getReferencedComment(reply, root)
                                    )
                                  }}
                                </span>
                                <span class="tool-comment-reference-like">
                                  赞
                                  {{
                                    getCommentLikeText(
                                      getReferencedComment(reply, root)
                                    )
                                  }}
                                </span>
                                <button
                                  type="button"
                                  class="tool-comment-jump-button"
                                  @click.stop="
                                    jumpToComment(
                                      idx,
                                      item,
                                      getReferencedComment(reply, root),
                                      reply
                                    )
                                  "
                                >
                                  跳到原文
                                </button>
                              </div>
                              <div class="tool-comment-reference-content">
                                {{
                                  getDisplayCommentMessage(
                                    getReferencedComment(reply, root)
                                  )
                                }}
                              </div>
                              <button
                                v-if="
                                  shouldCollapseCommentMessage(
                                    getReferencedComment(reply, root)
                                  )
                                "
                                type="button"
                                class="tool-comment-read-more tool-comment-read-more--reference"
                                @click.stop="
                                  toggleLongComment(
                                    getReferencedComment(reply, root)
                                  )
                                "
                              >
                                {{
                                  isLongCommentExpanded(
                                    getReferencedComment(reply, root)
                                  )
                                    ? '收起全文'
                                    : '查看全文'
                                }}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="shouldShowMoreRenderedCommentRoots(idx, call, item)"
                      class="tool-comments-render-more"
                    >
                      <button
                        type="button"
                        class="tool-comments-render-more-button"
                        @click.stop="showMoreRenderedCommentRoots(idx, call, item)"
                      >
                        {{
                          getRenderMoreCommentRootsText(idx, call, item)
                        }}
                      </button>
                    </div>
                  </div>
                  <div
                    v-else
                    class="tool-comments-empty"
                    :class="{
                      'tool-comments-empty--syncing':
                        isCommentItemQueuedOrRunning(call, item),
                    }"
                  >
                    {{
                      isCommentItemQueuedOrRunning(call, item)
                        ? '后台同步中，正在加载首批评论...'
                        : '当前没有可展示的评论。'
                    }}
                  </div>
                  <div
                    v-if="shouldShowCommentsLoadMore(call, item)"
                    class="tool-comments-load-more"
                  >
                    <button
                      type="button"
                      class="tool-comments-load-more-button"
                      :disabled="getCommentItemState(call, item).loading"
                      @click.stop="loadMoreComments(idx, call, item)"
                    >
                      {{ getCommentsLoadMoreText(call, item) }}
                    </button>
                    <span
                      v-if="getCommentItemState(call, item).error"
                      class="tool-comments-load-more-error"
                    >
                      {{ getCommentItemState(call, item).error }}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <div v-else class="tool-generic-result">
              <pre class="tool-generic-json">{{ formatGenericResult(call) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="commentImageViewer.open && getActiveCommentImage()"
    class="tool-comment-image-overlay"
    @click.self="closeCommentImageViewer"
  >
    <section
      class="tool-comment-image-shell"
      :style="getCommentImageShellStyle()"
      @click.stop
    >
      <div class="tool-comment-image-toolbar">
        <div class="tool-comment-image-toolbar-group">
          <button
            type="button"
            class="tool-comment-image-toolbar-button"
            @click.stop="showPreviousCommentImage"
          >
            上一张
          </button>
          <button
            type="button"
            class="tool-comment-image-toolbar-button"
            @click.stop="showNextCommentImage"
          >
            下一张
          </button>
        </div>
        <div class="tool-comment-image-toolbar-group tool-comment-image-zoom">
          <button
            type="button"
            class="tool-comment-image-toolbar-button tool-comment-image-zoom-out"
            @click.stop="zoomOutCommentImage"
          >
            缩小
          </button>
          <select
            class="tool-comment-image-scale-select"
            :value="String(commentImageViewer.scale)"
            aria-label="选择缩放比例"
            @change="setCommentImageScaleFromEvent"
            @click.stop
          >
            <option
              v-for="option in getCommentImageScaleOptions()"
              :key="option"
              :value="String(option)"
            >
              {{ formatCommentImageScaleOption(option) }}
            </option>
          </select>
          <button
            type="button"
            class="tool-comment-image-toolbar-button tool-comment-image-zoom-in"
            @click.stop="zoomInCommentImage"
          >
            放大
          </button>
          <button
            type="button"
            class="tool-comment-image-toolbar-button tool-comment-image-fit"
            :class="{
              'tool-comment-image-toolbar-button--active':
                commentImageViewer.fitMode === 'width',
            }"
            @click.stop="fitCommentImageWidth"
          >
            适配宽度
          </button>
          <button
            type="button"
            class="tool-comment-image-toolbar-button tool-comment-image-fit"
            :class="{
              'tool-comment-image-toolbar-button--active':
                commentImageViewer.fitMode === 'contain',
            }"
            @click.stop="fitCommentImageWindow"
          >
            适配窗口
          </button>
        </div>
        <button
          type="button"
          class="tool-comment-image-toolbar-button tool-comment-image-close"
          @click.stop="closeCommentImageViewer"
        >
          关闭
        </button>
      </div>
      <div class="tool-comment-image-body">
        <button
          type="button"
          class="tool-comment-image-side tool-comment-image-side--prev tool-comment-image-nav--prev"
          @click.stop="showPreviousCommentImage"
        >
          <span>‹</span>
        </button>
        <figure class="tool-comment-image-stage">
          <div
            ref="commentImageFrameRef"
            tabindex="0"
            class="tool-comment-image-frame"
            :class="{
              'tool-comment-image-frame--zoomed':
                isCommentImageZoomed(),
              'tool-comment-image-frame--panning':
                commentImagePan.active,
              'tool-comment-image-frame--long':
                isActiveCommentImageLong(),
              'tool-comment-image-frame--fit-width':
                commentImageViewer.fitMode === 'width',
            }"
            @pointerdown="startCommentImagePan"
            @pointermove="moveCommentImagePan"
            @pointerup="endCommentImagePan"
            @pointercancel="endCommentImagePan"
            @pointerleave="endCommentImagePan"
            @wheel="handleCommentImageWheel"
            @keydown="handleCommentImageFrameKeydown"
          >
            <div class="tool-comment-image-counter" aria-live="polite">
              <span>{{ commentImageViewer.index + 1 }} / {{ commentImageViewer.images.length }}</span>
              <span v-if="getActiveCommentImagePositionText()">
                {{ getActiveCommentImagePositionText() }}
              </span>
              <span v-if="isActiveCommentImageLong()">长图</span>
            </div>
            <img
              :key="getActiveCommentImageKey()"
              :src="getActiveCommentImageSrc()"
              :data-original-src="getActiveCommentImageSrc()"
              :style="getCommentImageScaleStyle()"
              alt=""
              draggable="false"
              decoding="async"
              referrerpolicy="no-referrer"
              @load="handleActiveCommentImageLoad"
              @click.stop
              @dragstart.prevent
            />
          </div>
        </figure>
        <button
          type="button"
          class="tool-comment-image-side tool-comment-image-side--next tool-comment-image-nav--next"
          @click.stop="showNextCommentImage"
        >
          <span>›</span>
        </button>
      </div>
      <footer class="tool-comment-image-info">
        <div class="tool-comment-image-meta">
          <span class="tool-comment-image-author">
            {{ getCommentAuthor(getActiveCommentImageComment()) }}
          </span>
          <span>{{ getCommentTime(getActiveCommentImageComment()) }}</span>
          <button
            type="button"
            class="tool-comment-image-jump"
            @click.stop="jumpToActiveCommentImageComment"
          >
            跳转到评论
          </button>
        </div>
        <div class="tool-comment-image-caption">
          {{ getCommentMessage(getActiveCommentImageComment()) }}
        </div>
      </footer>
    </section>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  PropType,
} from 'vue';
import type { ToolCall } from 'src/services/chatService';
import {
  getOwnerDisplayName,
  getOwnerHref,
  getOwnerUidText,
} from 'src/utils/ownerRichView';
import { getRenderableImageUrl, normalizeRemoteImageUrl } from 'src/utils/imageUrl';
import { normalizeVideoHit, normalizeVideoPicUrl } from 'src/utils/videoHit';
import { formatToolCallArgs } from 'src/utils/toolCall';
import { renderMarkdown } from 'src/utils/markdown';
import { warmBrowserImageCache } from 'src/services/imageCacheService';
import { getSmoothStreamingNextText } from 'src/composables/useSmoothStreamingText';
import {
  cacheService,
  EXPLORE_CACHE_TTL,
  STORE_NAMES,
} from 'src/services/cacheService';
import type { ExploreStepResult } from 'src/stores/resultStore';

/** Video hit from search result */
interface VideoHit {
  bvid?: string;
  pic?: string;
  title?: string;
  owner?: {
    name?: string;
    mid?: number;
  };
}

/** Author result from check_author */
interface AuthorResult {
  found?: boolean;
  name?: string;
  mid?: number;
}

interface GoogleResult {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_url?: string;
  display_link?: string;
  domain?: string;
}

interface OwnerResult {
  mid?: number;
  name?: string;
  score?: number;
  sample_title?: string;
  sample_bvid?: string;
  sample_pic?: string;
  sample_view?: number;
  sources?: string[];
  face?: string;
}

interface OwnerSourceGroup {
  source: string;
  label: string;
  total_owners: number;
  owners: OwnerResult[];
  error?: string;
}

interface TranscriptResult {
  title?: string;
  bvid?: string;
  requested_video_id?: string;
  selection?: {
    selected_text_length?: number;
    full_text_length?: number;
  };
  transcript?: {
    text?: string;
    text_length?: number;
    segment_count?: number;
  };
}

interface SmallTaskResult {
  task?: string;
  model?: string;
  model_name?: string;
  result?: string;
}

interface VideoComment {
  rpid?: string | number;
  ctime?: string | number;
  ctime_str?: string;
  parent?: string | number;
  root?: string | number;
  root_rpid?: string | number;
  is_root?: boolean;
  depth?: number;
  member?: {
    mid?: string | number;
    uname?: string;
  };
  content?: {
    message?: string;
    pictures?: VideoCommentPicture[];
    images?: VideoCommentPicture[];
  };
  like?: string | number;
  reply_count?: string | number;
  child_count?: string | number;
  is_hot?: boolean;
  is_top?: boolean;
  reply_to_name?: string;
  reply_to_rpid?: string;
  reply_to_comment?: VideoComment;
}

interface VideoCommentPicture {
  url?: string;
  src?: string;
  img_src?: string;
  width?: string | number;
  height?: string | number;
  size?: string | number;
}

interface VideoCommentNode extends VideoComment {
  replies: VideoComment[];
  reply_to_name?: string;
  reply_to_rpid?: string;
  reply_to_comment?: VideoComment;
}

interface VideoCommentsItem {
  bvid?: string;
  title?: string;
  owner?: {
    mid?: string | number;
    name?: string;
    uname?: string;
  };
  mode?: string;
  status?: string;
  refresh_status?: string;
  summary?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
  comments?: VideoComment[];
  groups?: Record<string, VideoComment[]>;
}

interface LoadedCommentItemState {
  comments?: VideoComment[];
  summary?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
  status?: string;
  refresh_status?: string;
  loading?: boolean;
  error?: string;
  nextPn?: number;
  requestedStoredPages?: Record<string, boolean>;
  queuedOrRunning?: boolean;
}

type CommentSortMode = 'default' | 'hot' | 'time_asc' | 'time_desc';

interface CommentFilterState {
  likedOnly: boolean;
  authorOnly: boolean;
}

interface CommentLayerFilterState {
  ownerOnly: boolean;
  likedOnly: boolean;
  sortMode: CommentSortMode;
}

type CommentRootCollapseMode = 'collapsed' | 'expanded' | 'mixed';

interface CommentImageEntry {
  url: string;
  comment: VideoComment;
  item: VideoCommentsItem;
  callIndex: number;
  bvid: string;
  pictureIndex: number;
  commentPictureCount: number;
  width?: number;
  height?: number;
}

interface CommentImageViewerState {
  open: boolean;
  images: CommentImageEntry[];
  index: number;
  scale: number;
  fitMode: CommentImageFitMode;
}

interface CommentImagePanState {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

type CommentImageFitMode = 'contain' | 'width' | 'manual';

const DISPLAYABLE_INTERNAL_TOOLS = new Set(['run_small_llm_task']);
const SMALL_MODEL_TEXT_TOOLS = new Set([
  'ask_transcript',
  'run_small_llm_task',
  'summarize_transcript',
]);
const COMPACT_TOOL_DISPLAY_QUERY = '(max-width: 620px), (pointer: coarse)';

/** 工具名称中英对照 */
const TOOL_LABELS: Record<string, string> = {
  search_videos: '搜索视频',
  search_owners: '搜索作者',
  check_author: '搜索作者',
  search_google: '搜索网页',
  get_video_transcript: '读取转写',
  ask_transcript: '提问',
  run_small_llm_task: '小模型',
  summarize_transcript: '视频总结',
  video_comments: '视频评论',
  video_comments_full: '完整评论',
  related_tokens_by_tokens: '相关词补全',
  related_owners_by_tokens: '相关作者',
  related_videos_by_videos: '相关视频',
  related_owners_by_videos: '相关作者',
  related_videos_by_owners: '作者相关视频',
  related_owners_by_owners: '相关作者',
  read_spec: '阅读文档',
};

/** 工具图标 */
const TOOL_ICONS: Record<string, string> = {
  search_videos: 'search',
  search_owners: 'person_search',
  check_author: 'person_search',
  search_google: 'travel_explore',
  get_video_transcript: 'subtitles',
  ask_transcript: 'smart_toy',
  run_small_llm_task: 'smart_toy',
  summarize_transcript: 'summarize',
  video_comments: 'forum',
  video_comments_full: 'rate_review',
  related_tokens_by_tokens: 'token',
  related_owners_by_tokens: 'group',
  related_videos_by_videos: 'linked_camera',
  related_owners_by_videos: 'group_work',
  related_videos_by_owners: 'video_library',
  related_owners_by_owners: 'groups',
  read_spec: 'description',
};

const TOOL_RUNNING_STATUS_TEXTS: Record<string, string> = {
  explore: '探索中...',
  search_videos: '搜索中...',
  search_owners: '搜索中...',
  check_author: '确认中...',
  search_google: '搜索中...',
  get_video_transcript: '读取中...',
  ask_transcript: '提问中...',
  run_small_llm_task: '生成中...',
  summarize_transcript: '总结中...',
  video_comments: '读取中...',
  video_comments_full: '读取中...',
};

const COMMENT_IMAGE_SCALE_MIN = 0.1;
const COMMENT_IMAGE_SCALE_MAX = 2.5;
const COMMENT_IMAGE_SCALE_STEP = 0.1;
const COMMENT_IMAGE_SCALE_DEFAULT = 1;
const COMMENT_IMAGE_FIT_GUTTER_PX = 2;
const COMMENT_IMAGE_SCALE_OPTIONS = [
  0.1,
  0.2,
  0.25,
  0.3,
  0.4,
  0.5,
  0.6,
  0.7,
  0.75,
  0.8,
  0.9,
  1,
  1.1,
  1.2,
  1.25,
  1.3,
  1.4,
  1.5,
  1.6,
  1.7,
  1.75,
  1.8,
  1.9,
  2,
  2.1,
  2.2,
  2.25,
  2.3,
  2.4,
  2.5,
];

export default defineComponent({
  name: 'ToolCallDisplay',
  inheritAttrs: false,
  props: {
    toolCalls: {
      type: Array as PropType<ToolCall[]>,
      required: true,
    },
    /** Whether this is displaying historical tool calls (from past conversation turns) */
    isHistorical: {
      type: Boolean,
      default: false,
    },
    /** Whether the current request has been aborted by the user */
    isAborted: {
      type: Boolean,
      default: false,
    },
    forceExpanded: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['viewAllResults'],
  setup(props, { attrs }) {
    const containerRef = ref<HTMLElement | null>(null);
    const commentImageFrameRef = ref<HTMLElement | null>(null);
    const expanded = ref<Record<number, boolean>>({});
    const commentSortModes = ref<Record<string, CommentSortMode>>({});
    const commentFilters = ref<Record<string, CommentFilterState>>({});
    const commentLayerFilters = ref<Record<string, CommentLayerFilterState>>({});
    const collapsedCommentRoots = ref<Record<string, boolean>>({});
    const commentRootCollapseModes = ref<Record<string, CommentRootCollapseMode>>(
      {}
    );
    const commentRootRenderLimits = ref<Record<string, number>>({});
    const loadedCommentItems = ref<Record<string, LoadedCommentItemState>>({});
    const expandedCommentReferences = ref<Record<string, boolean>>({});
    const expandedLongComments = ref<Record<string, boolean>>({});
    const commentReturnTargets = ref<Record<string, string>>({});
    const highlightedComments = ref<Record<string, boolean>>({});
    const commentImageViewer = ref<CommentImageViewerState>({
      open: false,
      images: [],
      index: 0,
      scale: COMMENT_IMAGE_SCALE_DEFAULT,
      fitMode: 'contain',
    });
    const cachedCommentImageUrls = ref<Record<string, string>>({});
    const commentImageNaturalSizes = ref<
      Record<string, { width: number; height: number }>
    >({});
    const commentImagePan = ref<CommentImagePanState>({
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0,
    });
    const commentImageViewport = ref({
      width: 0,
      height: 0,
      rootZoom: 1,
    });
    const commentImageFrameSize = ref({
      width: 0,
      height: 0,
    });
    const previousStatuses = ref<Record<number, string | undefined>>({});
    const isCompactToolDisplay = ref(false);
    const smoothSmallTaskTexts = ref<Record<string, string>>({});
    let compactMediaQuery: MediaQueryList | null = null;
    const commentAutoRefreshTimers = new Map<string, number>();
    const commentAutoRefreshAttempts = new Map<string, number>();
    const smoothSmallTaskTargets = new Map<string, string>();
    let smoothSmallTaskFrameId: number | null = null;
    const commentTreeCache = new WeakMap<
      VideoComment[],
      { length: number; roots: VideoCommentNode[] }
    >();
    const COMMENT_ROOT_INITIAL_RENDER_LIMIT = 160;
    const COMMENT_ROOT_RENDER_STEP = 160;
    let previousBodyOverflow = '';
    let commentImageFrameResizeObserver: ResizeObserver | null = null;
    const visibleToolCalls = computed(() =>
      props.toolCalls.filter(
        (call) =>
          call.visibility !== 'internal' ||
          DISPLAYABLE_INTERNAL_TOOLS.has(call.type)
      )
    );

    // ── Helper functions (must be declared BEFORE the watch to avoid TDZ) ──

    const getToolLabel = (type: string) => TOOL_LABELS[type] || type;
    const getToolIcon = (type: string) => TOOL_ICONS[type] || 'build';
    const isSmallModelTextTool = (call: ToolCall): boolean =>
      SMALL_MODEL_TEXT_TOOLS.has(call.type);
    const isVideoCommentsTool = (call: ToolCall): boolean =>
      call.type === 'video_comments' || call.type === 'video_comments_full';

    const getCommentModeKey = (idx: number, call: ToolCall): string =>
      `${idx}:${call.type}:${call.result_id || ''}`;

    const getCommentSortMode = (
      idx: number,
      call: ToolCall
    ): CommentSortMode =>
      commentSortModes.value[getCommentModeKey(idx, call)] || 'default';

    const setCommentSortMode = (
      idx: number,
      call: ToolCall,
      mode: CommentSortMode
    ) => {
      commentSortModes.value[getCommentModeKey(idx, call)] = mode;
    };

    const handleCommentSortChange = (
      idx: number,
      call: ToolCall,
      event: Event
    ) => {
      const value = (event.target as HTMLSelectElement | null)?.value;
      if (
        value === 'default' ||
        value === 'hot' ||
        value === 'time_asc' ||
        value === 'time_desc'
      ) {
        setCommentSortMode(idx, call, value);
      }
    };

    const getCommentFilters = (
      idx: number,
      call: ToolCall
    ): CommentFilterState => {
      const key = getCommentModeKey(idx, call);
      if (!commentFilters.value[key]) {
        commentFilters.value[key] = { likedOnly: false, authorOnly: false };
      }
      return commentFilters.value[key];
    };

    const isCommentLikedFilterActive = (idx: number, call: ToolCall): boolean =>
      getCommentFilters(idx, call).likedOnly;

    const isCommentAuthorFilterActive = (idx: number, call: ToolCall): boolean =>
      getCommentFilters(idx, call).authorOnly;

    const toggleCommentLikedFilter = (idx: number, call: ToolCall) => {
      const filters = getCommentFilters(idx, call);
      filters.likedOnly = !filters.likedOnly;
    };

    const toggleCommentAuthorFilter = (idx: number, call: ToolCall) => {
      const filters = getCommentFilters(idx, call);
      filters.authorOnly = !filters.authorOnly;
    };

    const getCommentLayerKey = (
      idx: number,
      root: VideoComment
    ): string => `${idx}:layer:${getCommentId(root)}`;

    const getCommentLayerFilters = (
      idx: number,
      root: VideoComment
    ): CommentLayerFilterState => {
      const key = getCommentLayerKey(idx, root);
      if (!commentLayerFilters.value[key]) {
        commentLayerFilters.value[key] = {
          ownerOnly: false,
          likedOnly: false,
          sortMode: 'default',
        };
      }
      return commentLayerFilters.value[key];
    };

    const isCommentLayerOwnerFilterActive = (
      idx: number,
      root: VideoComment
    ): boolean => getCommentLayerFilters(idx, root).ownerOnly;

    const isCommentLayerLikedFilterActive = (
      idx: number,
      root: VideoComment
    ): boolean => getCommentLayerFilters(idx, root).likedOnly;

    const toggleCommentLayerOwnerFilter = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem,
      root: VideoComment
    ) => {
      const filters = getCommentLayerFilters(idx, root);
      filters.ownerOnly = !filters.ownerOnly;
      collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] = false;
      markCommentRootsCollapseModeMixed(idx, call);
    };

    const toggleCommentLayerLikedFilter = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem,
      root: VideoComment
    ) => {
      const filters = getCommentLayerFilters(idx, root);
      filters.likedOnly = !filters.likedOnly;
      collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] = false;
      markCommentRootsCollapseModeMixed(idx, call);
    };

    const getCommentLayerSortMode = (
      idx: number,
      root: VideoComment
    ): CommentSortMode => getCommentLayerFilters(idx, root).sortMode;

    const setCommentLayerSortMode = (
      idx: number,
      root: VideoComment,
      mode: CommentSortMode
    ) => {
      getCommentLayerFilters(idx, root).sortMode = mode;
    };

    const handleCommentLayerSortChange = (
      idx: number,
      root: VideoComment,
      event: Event
    ) => {
      const value = (event.target as HTMLSelectElement | null)?.value;
      if (
        value === 'default' ||
        value === 'hot' ||
        value === 'time_asc' ||
        value === 'time_desc'
      ) {
        setCommentLayerSortMode(idx, root, value);
      }
    };

    const buildLookupQueryLabels = (call: ToolCall): string[] => {
      const labels: string[] = [];
      const bvids = [
        call.args?.bv,
        call.args?.bvid,
        ...(Array.isArray(call.args?.bvids)
          ? (call.args?.bvids as unknown[])
          : []),
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      const mids = [
        call.args?.mid,
        call.args?.uid,
        ...(Array.isArray(call.args?.mids)
          ? (call.args?.mids as unknown[])
          : []),
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      const dateWindow = String(call.args?.date_window || '').trim();

      bvids.forEach((bvid) => {
        if (!labels.includes(bvid)) {
          labels.push(bvid);
        }
      });
      mids.forEach((mid) => {
        const label = dateWindow
          ? `:uid=${mid} :date<=${dateWindow}`
          : `:uid=${mid}`;
        if (!labels.includes(label)) {
          labels.push(label);
        }
      });
      return labels;
    };

    /** Extract query list from search_videos tool call args */
    const getQueryList = (call: ToolCall): string[] => {
      if (call.type !== 'search_videos') return [];
      const queries = call.args?.queries as string[] | undefined;
      if (queries && Array.isArray(queries) && queries.length > 0) {
        return queries;
      }
      return buildLookupQueryLabels(call);
    };

    const formatToolArgs = (call: ToolCall) => formatToolCallArgs(call);

    const getToolError = (call: ToolCall): string => {
      const result = call.result as Record<string, unknown> | undefined;
      if (result && typeof result === 'object' && result.error) {
        return String(result.error);
      }
      return '';
    };

    const isAlwaysExpanded = (call: ToolCall): boolean =>
      props.forceExpanded && hasResults(call);

    /** Check if a tool call has displayable results */
    const hasResults = (call: ToolCall): boolean => {
      if (!call.result) return false;
      if (getToolError(call)) return true;
      if (call.type === 'search_videos') {
        const result = call.result as Record<string, unknown>;
        // Single query format: {hits: [...]}
        if (
          Array.isArray(result?.hits) &&
          (result.hits as unknown[]).length > 0
        )
          return true;
        // Multi-query format: {results: [{hits: [...]}, ...]}
        if (Array.isArray(result?.results)) {
          return (result.results as Array<Record<string, unknown>>).some(
            (r) => Array.isArray(r.hits) && (r.hits as unknown[]).length > 0
          );
        }
        if (
          Array.isArray(result?.videos) &&
          (result.videos as unknown[]).length > 0
        ) {
          return true;
        }
        return false;
      }
      if (call.type === 'check_author') {
        return true; // Always show author result
      }
      if (call.type === 'search_google') {
        const result = call.result as Record<string, unknown>;
        return Array.isArray(result?.results) && result.results.length > 0;
      }
      if (call.type === 'search_owners') {
        const result = call.result as Record<string, unknown>;
        return (
          (Array.isArray(result?.owners) && result.owners.length > 0) ||
          (Array.isArray(result?.source_groups) &&
            result.source_groups.length > 0)
        );
      }
      if (call.type === 'get_video_transcript') {
        const result = call.result as TranscriptResult;
        return !!(result?.transcript?.text || result?.title || result?.bvid);
      }
      if (isSmallModelTextTool(call)) {
        const result = call.result as SmallTaskResult;
        return (
          call.status === 'streaming' ||
          (typeof result?.result === 'string' && result.result.length > 0)
        );
      }
      if (isVideoCommentsTool(call)) {
        const result = call.result as Record<string, unknown>;
        return (
          Array.isArray(result?.items) ||
          Array.isArray(result?.comments) ||
          !!result?.status
        );
      }
      return Object.keys((call.result as Record<string, unknown>) || {}).length > 0;
    };

    const canShowResults = (call: ToolCall): boolean =>
      hasResults(call) &&
      (call.status === 'streaming' || call.status === 'completed');

    const isExpandable = (call: ToolCall): boolean =>
      canShowResults(call) &&
      !isAlwaysExpanded(call);

    const shouldRenderToolDetails = (call: ToolCall): boolean =>
      canShowResults(call);

    const getResultsWrapperClasses = (call: ToolCall, idx: number) => ({
      expanded: expanded.value[idx] || isAlwaysExpanded(call),
      'tool-call-results-wrapper--small-task':
        isSmallModelTextTool(call),
    });

    /** 获取所有视频结果（合并所有 query 的结果） */
    const getAllVideoHits = (call: ToolCall): VideoHit[] => {
      if (call.type !== 'search_videos' || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      // Single query format
      if (Array.isArray(result.hits)) {
        return (result.hits as VideoHit[]).map((hit) => normalizeVideoHit(hit));
      }
      if (Array.isArray(result.videos)) {
        return (result.videos as VideoHit[]).map((hit) =>
          normalizeVideoHit(hit)
        );
      }
      // Multi-query format: merge all hits
      if (Array.isArray(result.results)) {
        const allHits: VideoHit[] = [];
        for (const r of result.results as Array<Record<string, unknown>>) {
          if (Array.isArray(r.hits)) {
            allHits.push(
              ...(r.hits as VideoHit[]).map((hit) => normalizeVideoHit(hit))
            );
          }
        }
        return allHits;
      }
      return [];
    };

    /** 获取按 query 分组的搜索结果 */
    const getPerQueryResults = (
      call: ToolCall
    ): Array<{ query: string; hits: VideoHit[] }> => {
      if (call.type !== 'search_videos' || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      // Multi-query format
      if (Array.isArray(result.results)) {
        return (result.results as Array<Record<string, unknown>>).map((r) => ({
          query: String(r.query || ''),
          hits: Array.isArray(r.hits)
            ? (r.hits as VideoHit[]).map((hit) => normalizeVideoHit(hit))
            : [],
        }));
      }
      // Single query format
      if (Array.isArray(result.hits)) {
        return [
          {
            query: String(result.query || ''),
            hits: (result.hits as VideoHit[]).map((hit) =>
              normalizeVideoHit(hit)
            ),
          },
        ];
      }
      return [];
    };

    const getResultCount = (call: ToolCall) => {
      if (call.type === 'search_videos') {
        const total = getAllVideoHits(call).length;
        return `${total} 条结果`;
      }
      if (call.type === 'search_google') {
        const result = call.result as Record<string, unknown>;
        const visible = getGoogleResults(call).length;
        const total = visible || Number(result?.result_count || 0);
        return `${total} 条结果`;
      }
      if (call.type === 'search_owners') {
        const result = call.result as Record<string, unknown>;
        const total = Number(
          result?.total_owners || getOwnerResults(call).length || 0
        );
        return `${total} 位作者`;
      }
      if (call.type === 'get_video_transcript') {
        const result = call.result as TranscriptResult;
        const selected = Number(
          result?.selection?.selected_text_length ||
            result?.transcript?.text_length ||
            0
        );
        const segments = Number(result?.transcript?.segment_count || 0);
        if (segments && selected) {
          return `${segments} 段 / ${selected} 字`;
        }
        if (selected) {
          return `${selected} 字`;
        }
        return '已读取';
      }
      if (isSmallModelTextTool(call)) {
        return call.status === 'streaming' ? '输出中' : '已生成';
      }
      if (isVideoCommentsTool(call)) {
        const text = getVideoCommentsAggregateText(call);
        if (text) return text;
        const result = (call.result as Record<string, unknown>) || {};
        return String(result?.status || '已读取');
      }
      if (call.type === 'check_author') {
        const found = (call.result as Record<string, unknown>)?.found;
        return found ? '已找到' : '未找到';
      }
      return '';
    };

    const getVideoHits = (call: ToolCall): VideoHit[] => {
      if (call.type !== 'search_videos') return [];
      const hits = (call.result as Record<string, unknown>)?.hits;
      return Array.isArray(hits) ? (hits as VideoHit[]) : [];
    };

    const getAuthorResult = (call: ToolCall): AuthorResult => {
      if (call.type !== 'check_author') return {};
      return (call.result as AuthorResult) || {};
    };

    const getGoogleResults = (call: ToolCall): GoogleResult[] => {
      if (call.type !== 'search_google' || !call.result) return [];
      const results = (call.result as Record<string, unknown>)?.results;
      return Array.isArray(results) ? (results as GoogleResult[]) : [];
    };

    const getGoogleDisplayedUrl = (result: GoogleResult): string => {
      const explicit =
        result.displayed_url || result.display_link || result.domain || '';
      if (explicit) return explicit;
      if (!result.link) return '';
      try {
        return new URL(result.link).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const getGoogleSnippet = (result: GoogleResult): string => {
      const snippet = (result.snippet || '').trim();
      if (!snippet) return '';
      if (snippet.endsWith('...') || snippet.endsWith('…')) return snippet;
      return `${snippet}...`;
    };

    const getOwnerResults = (call: ToolCall): OwnerResult[] => {
      if (call.type !== 'search_owners' || !call.result) return [];
      const owners = (call.result as Record<string, unknown>)?.owners;
      return Array.isArray(owners) ? (owners as OwnerResult[]) : [];
    };

    const getOwnerGroups = (call: ToolCall): OwnerSourceGroup[] => {
      if (call.type !== 'search_owners' || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      const groups: OwnerSourceGroup[] = [];
      const aggregateOwners = getOwnerResults(call);
      if (aggregateOwners.length) {
        groups.push({
          source: 'aggregate',
          label: '综合',
          total_owners: Number(result.total_owners || aggregateOwners.length),
          owners: aggregateOwners,
        });
      }

      const sourceGroups = result.source_groups;
      if (Array.isArray(sourceGroups)) {
        for (const group of sourceGroups as Array<Record<string, unknown>>) {
          const owners = Array.isArray(group.owners)
            ? (group.owners as OwnerResult[])
            : [];
          const source = String(group.source || group.label || 'source');
          if (source === 'related_tokens') continue;
          if (!owners.length && !group.error) continue;
          groups.push({
            source,
            label: String(group.label || source),
            total_owners: Number(group.total_owners || owners.length || 0),
            owners,
            error: group.error ? String(group.error) : undefined,
          });
        }
      }

      return groups;
    };

    const getTranscriptResult = (call: ToolCall): TranscriptResult => {
      if (call.type !== 'get_video_transcript' || !call.result) return {};
      return (call.result as TranscriptResult) || {};
    };

    const getTranscriptVideoId = (call: ToolCall): string => {
      const result = getTranscriptResult(call);
      return result.bvid || result.requested_video_id || '';
    };

    const getTranscriptText = (call: ToolCall): string => {
      const result = getTranscriptResult(call) as TranscriptResult & {
        text?: string;
        content?: string;
      };
      const text = String(
        result?.transcript?.text || result?.text || result?.content || ''
      ).trim();
      if (!text) return '当前没有可展示的转写内容。';
      return text;
    };

    const getSmallTaskResult = (call: ToolCall): SmallTaskResult => {
      if (!isSmallModelTextTool(call) || !call.result) return {};
      return (call.result as SmallTaskResult) || {};
    };

    const getSmallTaskDisplayKey = (call: ToolCall, idx: number): string =>
      `${idx}:${call.type}:${call.result_id || JSON.stringify(call.args || {})}`;

    const getSmallTaskResultRawText = (call: ToolCall): string => {
      const resultText = String(getSmallTaskResult(call)?.result || '').trim();
      if (resultText) {
        return resultText;
      }
      if (call.status === 'streaming') {
        return '小模型已开始处理，等待首批内容...';
      }
      return '';
    };

    const getSmallTaskResultText = (call: ToolCall, idx = 0): string => {
      const key = getSmallTaskDisplayKey(call, idx);
      return smoothSmallTaskTexts.value[key] ?? getSmallTaskResultRawText(call);
    };

    const shouldRenderSmallTaskMarkdown = (call: ToolCall): boolean =>
      call.type === 'summarize_transcript' || call.type === 'ask_transcript';

    const renderSmallTaskMarkdown = (call: ToolCall, idx = 0): string =>
      renderMarkdown(getSmallTaskResultText(call, idx));

    const getStreamingStatusText = (call: ToolCall): string =>
      TOOL_RUNNING_STATUS_TEXTS[call.type] || '执行中...';

    const getPendingStatusText = (call: ToolCall): string =>
      TOOL_RUNNING_STATUS_TEXTS[call.type] || '执行中...';

    const getSmallTaskResultClasses = (call: ToolCall) => ({
      'tool-text-result--small-task': true,
      'tool-text-result--summary':
        call.type === 'summarize_transcript' || call.type === 'ask_transcript',
      'tool-text-result--small-task-streaming':
        call.status === 'streaming',
    });

    const formatGenericResult = (call: ToolCall): string => {
      try {
        return JSON.stringify(call.result ?? {}, null, 2);
      } catch {
        return String(call.result ?? '');
      }
    };

    const getCommentItemStateKey = (
      call: ToolCall,
      item: VideoCommentsItem
    ): string =>
      `${call.result_id || call.type}:${String(item.bvid || call.args?.bvid || '')}:${
        item.mode || call.args?.mode || ''
      }`;

    const mergeLoadedCommentItem = (
      call: ToolCall,
      item: VideoCommentsItem
    ): VideoCommentsItem => {
      const state = loadedCommentItems.value[getCommentItemStateKey(call, item)];
      if (!state) return item;
      return {
        ...item,
        comments: state.comments || item.comments,
        summary: state.summary || item.summary,
        pagination: state.pagination || item.pagination,
        status: state.status || item.status,
        refresh_status: state.refresh_status,
      } as VideoCommentsItem;
    };

    const getVideoCommentItems = (call: ToolCall): VideoCommentsItem[] => {
      if (!isVideoCommentsTool(call) || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      if (Array.isArray(result.items)) {
        return (result.items as VideoCommentsItem[]).map((item) =>
          mergeLoadedCommentItem(call, item)
        );
      }
      if (Array.isArray(result.comments)) {
        return [
          {
            bvid: String(call.args?.bvid || ''),
            title: String(result.title || ''),
            mode: String(call.args?.mode || ''),
            comments: result.comments as VideoComment[],
            pagination: result.pagination as Record<string, unknown>,
            summary: result.summary as Record<string, unknown>,
          },
        ].map((item) => mergeLoadedCommentItem(call, item));
      }
      return [];
    };

    const getCommentId = (comment: VideoComment): string =>
      String(comment.rpid || `${comment.ctime || ''}:${getCommentMessage(comment)}`);

    const stripOfficialReplyPrefix = (message: string): string =>
      message.replace(/^回复\s*@[^:：]+?\s*[:：]\s*/, '').trim();

    const getCommentMessage = (comment: VideoComment): string =>
      stripOfficialReplyPrefix(String(comment.content?.message || '').trim());

    const LONG_COMMENT_MAX_NEWLINES = 8;
    const LONG_COMMENT_MAX_CHARS = 1000;

    const getLongCommentKey = (comment: VideoComment): string =>
      `comment:${getCommentId(comment)}`;

    const getCommentNewlineCount = (message: string): number =>
      (message.match(/\r\n|\r|\n/g) || []).length;

    const shouldCollapseCommentMessage = (comment: VideoComment): boolean => {
      const message = getCommentMessage(comment);
      return (
        getCommentNewlineCount(message) > LONG_COMMENT_MAX_NEWLINES ||
        Array.from(message).length > LONG_COMMENT_MAX_CHARS
      );
    };

    const isLongCommentExpanded = (comment: VideoComment): boolean =>
      expandedLongComments.value[getLongCommentKey(comment)] === true;

    const getCollapsedCommentMessage = (message: string): string => {
      let preview = message;
      if (getCommentNewlineCount(preview) > LONG_COMMENT_MAX_NEWLINES) {
        preview = preview.split(/\r\n|\r|\n/).slice(0, 8).join('\n');
      }
      const chars = Array.from(preview);
      if (chars.length > LONG_COMMENT_MAX_CHARS) {
        preview = chars.slice(0, LONG_COMMENT_MAX_CHARS).join('');
      }
      return `${preview.trimEnd()}...`;
    };

    const getDisplayCommentMessage = (comment: VideoComment): string => {
      const message = getCommentMessage(comment);
      if (
        !shouldCollapseCommentMessage(comment) ||
        isLongCommentExpanded(comment)
      ) {
        return message;
      }
      return getCollapsedCommentMessage(message);
    };

    const toggleLongComment = (comment: VideoComment) => {
      const key = getLongCommentKey(comment);
      expandedLongComments.value[key] = !expandedLongComments.value[key];
    };

    const getCommentAuthor = (comment: VideoComment): string => {
      const uname = String(comment.member?.uname || '').trim();
      return uname || '未知用户';
    };

    const getCommentAuthorHref = (comment: VideoComment): string => {
      const mid = String(comment.member?.mid || '').trim();
      return mid ? `https://space.bilibili.com/${mid}` : '';
    };

    const getCommentLikeText = (comment: VideoComment | undefined): string => {
      const value = Number(comment?.like || 0);
      if (value >= 10000) {
        const text = (value / 10000).toFixed(value >= 100000 ? 0 : 1);
        return `${text.replace(/\\.0$/, '')}万`;
      }
      return String(Math.max(value, 0));
    };

    const getCommentLikeValue = (comment: VideoComment | undefined): number =>
      Math.max(Number(comment?.like || 0), 0);

    const padDateUnit = (value: number): string => String(value).padStart(2, '0');

    const getCommentTime = (comment: VideoComment): string => {
      const ctime = Number(comment.ctime || 0);
      let date: Date | null = ctime ? new Date(ctime * 1000) : null;
      if (!date && comment.ctime_str) {
        const parsed = new Date(comment.ctime_str.replace(' ', 'T'));
        date = Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      if (!date) return String(comment.ctime_str || '');
      const monthDay = `${padDateUnit(date.getMonth() + 1)}-${padDateUnit(
        date.getDate()
      )}`;
      const time = `${padDateUnit(date.getHours())}:${padDateUnit(
        date.getMinutes()
      )}`;
      return date.getFullYear() === new Date().getFullYear()
        ? `${monthDay} ${time}`
        : `${date.getFullYear()}-${monthDay} ${time}`;
    };

    const getCommentPictures = (comment: VideoComment): VideoCommentPicture[] => {
      const pictures = comment.content?.pictures || comment.content?.images || [];
      if (!Array.isArray(pictures)) return [];
      return pictures.filter((picture) =>
        Boolean(picture?.url || picture?.src || picture?.img_src)
      );
    };

    const getCommentPictureUrl = (picture: VideoCommentPicture): string =>
      normalizeRemoteImageUrl(
        String(picture.url || picture.src || picture.img_src || '').trim()
      );

    const getCommentPictureFallbackUrl = (
      picture: VideoCommentPicture
    ): string =>
      getRenderableImageUrl(
        String(picture.url || picture.src || picture.img_src || '').trim()
      );

    const handleCommentPictureError = (event: Event) => {
      const image = event.target as HTMLImageElement | null;
      if (!image) return;
      const fallback = image.dataset.fallbackSrc || '';
      if (fallback && image.src !== fallback) {
        image.src = fallback;
        return;
      }
      image.closest('.tool-comment-image-thumb')?.classList.add(
        'tool-comment-image-thumb--failed'
      );
    };

    const getVideoOwnerMid = (item: VideoCommentsItem): string =>
      String(item.owner?.mid || '').trim();

    const getVideoCommentTitle = (item: VideoCommentsItem): string => {
      const title = String(item.title || '').trim();
      return title || item.bvid || '视频评论';
    };

    const getVideoCommentOwnerText = (item: VideoCommentsItem): string => {
      const owner = item.owner || {};
      return String(owner.name || owner.uname || '').trim();
    };

    const isVideoOwnerComment = (
      comment: VideoComment,
      item: VideoCommentsItem
    ): boolean => {
      const ownerMid = getVideoOwnerMid(item);
      const commentMid = String(comment.member?.mid || '').trim();
      return Boolean(ownerMid && commentMid && ownerMid === commentMid);
    };

    const isLayerOwnerComment = (
      comment: VideoComment,
      root?: VideoCommentNode
    ): boolean => {
      if (!root || getCommentId(comment) === getCommentId(root)) return false;
      const rootMid = String(root.member?.mid || '').trim();
      const commentMid = String(comment.member?.mid || '').trim();
      return Boolean(rootMid && commentMid && rootMid === commentMid);
    };

    const getCommentAuthorTags = (
      comment: VideoComment,
      item: VideoCommentsItem,
      root?: VideoCommentNode
    ): string[] => {
      const tags: string[] = [];
      if (isLayerOwnerComment(comment, root)) {
        tags.push('层主');
      }
      if (isVideoOwnerComment(comment, item)) {
        tags.push('视频作者');
      }
      return tags;
    };

    const getCommentAuthorTagClass = (tag: string): Record<string, boolean> => ({
      'tool-comment-author-tag--layer-owner': tag === '层主',
      'tool-comment-author-tag--video-owner': tag === '视频作者',
    });

    const getItemComments = (item: VideoCommentsItem): VideoComment[] => {
      if (Array.isArray(item.comments) && item.comments.length) {
        return item.comments;
      }
      const seen = new Set<string>();
      const comments: VideoComment[] = [];
      Object.values(item.groups || {}).forEach((group) => {
        if (!Array.isArray(group)) return;
        group.forEach((comment) => {
          const id = getCommentId(comment);
          if (seen.has(id)) return;
          seen.add(id);
          comments.push(comment);
        });
      });
      return comments;
    };

    const getVideoCommentLoadedCount = (item: VideoCommentsItem): number => {
      const pagination = item.pagination || {};
      const comments = getItemComments(item).length;
      return Math.max(
        Number(pagination.loaded || 0),
        Number(pagination.returned || 0),
        comments
      );
    };

    const getVideoCommentTotalCount = (item: VideoCommentsItem): number => {
      const summary = item.summary || {};
      const pagination = item.pagination || {};
      return Math.max(
        Number(summary.estimated_total || 0),
        Number(summary.comment_count || 0),
        Number(summary.stored_count || 0),
        Number(summary.root_count || 0),
        Number(pagination.loaded || 0),
        Number(pagination.returned || 0),
        getItemComments(item).length
      );
    };

    const formatVideoCommentCountText = (
      loaded: number,
      total: number
    ): string => {
      if (!loaded && !total) return '';
      if (total > loaded) return `${loaded}/${total} 条评论`;
      return `${loaded || total} 条评论`;
    };

    const getVideoCommentsAggregateText = (call: ToolCall): string => {
      const items = getVideoCommentItems(call);
      if (!items.length) return '';
      const loaded = items.reduce(
        (sum, item) => sum + getVideoCommentLoadedCount(item),
        0
      );
      const total = items.reduce(
        (sum, item) => sum + getVideoCommentTotalCount(item),
        0
      );
      const countText = formatVideoCommentCountText(loaded, total);
      if (!countText) return '';
      return items.length === 1 ? countText : `${items.length} 个视频 · ${countText}`;
    };

    const isRootComment = (comment: VideoComment): boolean => {
      const rpid = getCommentId(comment);
      const root = String(comment.root || '');
      const rootRpid = String(comment.root_rpid || '');
      return (
        comment.is_root === true ||
        !root ||
        root === '0' ||
        root === rpid ||
        rootRpid === rpid
      );
    };

    const getVideoCommentTree = (item: VideoCommentsItem): VideoCommentNode[] => {
      const comments = getItemComments(item);
      const cached = commentTreeCache.get(comments);
      if (cached && cached.length === comments.length) {
        return cached.roots;
      }
      const byId = new Map<string, VideoComment>();
      comments.forEach((comment) => byId.set(getCommentId(comment), comment));

      const roots: VideoCommentNode[] = [];
      const rootById = new Map<string, VideoCommentNode>();
      comments.forEach((comment) => {
        if (!isRootComment(comment)) return;
        const node: VideoCommentNode = { ...comment, replies: [] };
        roots.push(node);
        rootById.set(getCommentId(comment), node);
      });

      comments.forEach((comment) => {
        if (isRootComment(comment)) return;
        const rootId = String(comment.root_rpid || comment.root || '');
        const root = rootById.get(rootId);
        if (!root) {
          const node: VideoCommentNode = { ...comment, replies: [] };
          roots.push(node);
          rootById.set(getCommentId(comment), node);
          return;
        }
        const parentId = String(comment.parent || '');
        const parent = parentId && parentId !== rootId ? byId.get(parentId) : null;
        root.replies.push({
          ...comment,
          reply_to_name: parent ? getCommentAuthor(parent) : undefined,
          reply_to_rpid: parentId && parentId !== rootId ? parentId : undefined,
          reply_to_comment: parent || root,
        });
      });

      commentTreeCache.set(comments, { length: comments.length, roots });
      return roots;
    };

    const getCommentReplies = (
      comment: VideoCommentNode | VideoComment
    ): VideoComment[] => (comment as VideoCommentNode).replies || [];

    const getCommentReplyCount = (
      comment: VideoCommentNode | VideoComment
    ): number =>
      Math.max(
        getCommentReplies(comment).length,
        Number(comment.reply_count || 0),
        Number(comment.child_count || 0)
      );

    const getCommentReplyLikeTotal = (
      comment: VideoCommentNode | VideoComment
    ): number =>
      getCommentReplies(comment).reduce(
        (sum, reply) => sum + getCommentLikeValue(reply),
        0
      );

    const getCommentReplyParticipantCount = (
      comment: VideoCommentNode | VideoComment
    ): number => {
      const mids = new Set<string>();
      getCommentReplies(comment).forEach((reply) => {
        const mid = String(reply.member?.mid || '').trim();
        if (mid) mids.add(mid);
      });
      return mids.size;
    };

    const commentHeatScore = (comment: VideoCommentNode | VideoComment): number =>
      (comment.is_top ? 1_000_000_000_000 : 0) +
      (comment.is_hot ? 1_000_000_000 : 0) +
      getCommentLikeValue(comment) * 1_000_000 +
      getCommentReplyLikeTotal(comment) * 180_000 +
      getCommentReplyParticipantCount(comment) * 50_000 +
      getCommentReplyCount(comment) * 8_000 +
      Number(comment.ctime || 0) / 10_000;

    const getHybridDefaultCommentScore = <T extends VideoComment>(
      comment: T,
      stats: {
        minCtime: number;
        maxCtime: number;
        maxLike: number;
        maxReplyLikeTotal: number;
        maxReplyParticipantCount: number;
        maxReplyCount: number;
      }
    ): number => {
      const ctime = Number(comment.ctime || 0);
      const range = stats.maxCtime - stats.minCtime;
      const recencyScore =
        range > 0 ? (ctime - stats.minCtime) / range : ctime > 0 ? 0.5 : 0;
      const likeScore = stats.maxLike
        ? Math.log1p(getCommentLikeValue(comment)) / Math.log1p(stats.maxLike)
        : 0;
      const replyLikeScore = stats.maxReplyLikeTotal
        ? Math.log1p(getCommentReplyLikeTotal(comment)) /
          Math.log1p(stats.maxReplyLikeTotal)
        : 0;
      const participantScore = stats.maxReplyParticipantCount
        ? Math.log1p(getCommentReplyParticipantCount(comment)) /
          Math.log1p(stats.maxReplyParticipantCount)
        : 0;
      const replyScore = stats.maxReplyCount
        ? Math.log1p(getCommentReplyCount(comment)) /
          Math.log1p(stats.maxReplyCount)
        : 0;
      const markerScore = (comment.is_top ? 0.16 : 0) + (comment.is_hot ? 0.1 : 0);
      const heatScore = Math.min(
        1,
        likeScore * 0.6 +
          replyLikeScore * 0.18 +
          participantScore * 0.08 +
          replyScore * 0.07 +
          markerScore
      );
      return heatScore * 0.78 + recencyScore * 0.22;
    };

    const sortComments = <T extends VideoComment>(
      comments: T[],
      mode: CommentSortMode
    ): T[] => {
      if (comments.length <= 1) return comments;
      const sorted = [...comments];
      if (mode === 'hot') {
        return sorted.sort((a, b) => commentHeatScore(b) - commentHeatScore(a));
      }
      if (mode === 'default') {
        const stats = sorted.reduce(
          (acc, comment) => {
            const ctime = Number(comment.ctime || 0);
            return {
              minCtime: ctime > 0 ? Math.min(acc.minCtime, ctime) : acc.minCtime,
              maxCtime: Math.max(acc.maxCtime, ctime),
              maxLike: Math.max(acc.maxLike, getCommentLikeValue(comment)),
              maxReplyLikeTotal: Math.max(
                acc.maxReplyLikeTotal,
                getCommentReplyLikeTotal(comment)
              ),
              maxReplyParticipantCount: Math.max(
                acc.maxReplyParticipantCount,
                getCommentReplyParticipantCount(comment)
              ),
              maxReplyCount: Math.max(acc.maxReplyCount, getCommentReplyCount(comment)),
            };
          },
          {
            minCtime: Number.POSITIVE_INFINITY,
            maxCtime: 0,
            maxLike: 0,
            maxReplyLikeTotal: 0,
            maxReplyParticipantCount: 0,
            maxReplyCount: 0,
          }
        );
        if (!Number.isFinite(stats.minCtime)) {
          stats.minCtime = 0;
        }
        return sorted
          .map((comment, index) => ({ comment, index }))
          .sort((a, b) => {
            if (a.comment.is_top !== b.comment.is_top) {
              return a.comment.is_top ? -1 : 1;
            }
            const delta =
              getHybridDefaultCommentScore(b.comment, stats) -
              getHybridDefaultCommentScore(a.comment, stats);
            if (Math.abs(delta) > 0.000001) return delta;
            return a.index - b.index;
          })
          .map((entry) => entry.comment);
      }
      return sorted.sort((a, b) => {
        const delta = Number(a.ctime || 0) - Number(b.ctime || 0);
        return mode === 'time_asc' ? delta : -delta;
      });
    };

    const getVisibleVideoCommentTree = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): VideoCommentNode[] => {
      const filters = getCommentFilters(idx, call);
      const matchesGlobalFilters = (comment: VideoComment): boolean => {
        if (filters.likedOnly && getCommentLikeValue(comment) <= 0) {
          return false;
        }
        if (filters.authorOnly && !isVideoOwnerComment(comment, item)) {
          return false;
        }
        return true;
      };
      const roots = getVideoCommentTree(item)
        .map((root) => {
          const replies = root.replies.filter(matchesGlobalFilters);
          return { ...root, replies };
        })
        .filter((root) => matchesGlobalFilters(root) || root.replies.length > 0);
      const mode = getCommentSortMode(idx, call);
      return sortComments(roots, mode).map((root) => ({
        ...root,
        replies: root.replies,
      }));
    };

    const getCommentRootRenderKey = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): string => {
      const filters = getCommentFilters(idx, call);
      return [
        getCommentItemStateKey(call, item),
        getCommentSortMode(idx, call),
        filters.likedOnly ? 'liked' : 'all',
        filters.authorOnly ? 'author' : 'any-author',
      ].join(':');
    };

    const getCommentRootRenderLimit = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): number =>
      commentRootRenderLimits.value[getCommentRootRenderKey(idx, call, item)] ||
      COMMENT_ROOT_INITIAL_RENDER_LIMIT;

    const getRenderedVisibleVideoCommentTree = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): VideoCommentNode[] =>
      getVisibleVideoCommentTree(idx, call, item).slice(
        0,
        getCommentRootRenderLimit(idx, call, item)
      );

    const getHiddenRenderedCommentRootCount = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): number =>
      Math.max(
        0,
        getVisibleVideoCommentTree(idx, call, item).length -
          getCommentRootRenderLimit(idx, call, item)
      );

    const shouldShowMoreRenderedCommentRoots = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): boolean => getHiddenRenderedCommentRootCount(idx, call, item) > 0;

    const showMoreRenderedCommentRoots = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ) => {
      const key = getCommentRootRenderKey(idx, call, item);
      const current = getCommentRootRenderLimit(idx, call, item);
      const total = getVisibleVideoCommentTree(idx, call, item).length;
      commentRootRenderLimits.value[key] = Math.min(
        total,
        current + COMMENT_ROOT_RENDER_STEP
      );
    };

    const ensureCommentRootRenderedById = (
      idx: number,
      item: VideoCommentsItem,
      commentId: string
    ) => {
      const call = props.toolCalls[idx];
      if (!call) return;
      const root = findCommentRootForId(item, commentId);
      if (!root) return;
      const rootId = getCommentId(root);
      const visibleRoots = getVisibleVideoCommentTree(idx, call, item);
      const rootIndex = visibleRoots.findIndex(
        (candidate) => getCommentId(candidate) === rootId
      );
      if (rootIndex < 0) return;
      const key = getCommentRootRenderKey(idx, call, item);
      const current = getCommentRootRenderLimit(idx, call, item);
      if (rootIndex < current) return;
      commentRootRenderLimits.value[key] = Math.min(
        visibleRoots.length,
        rootIndex + 1
      );
    };

    const getRenderMoreCommentRootsText = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ): string => {
      const hidden = getHiddenRenderedCommentRootCount(idx, call, item);
      const next = Math.min(hidden, COMMENT_ROOT_RENDER_STEP);
      return `继续显示 ${next} 个楼层`;
    };

    const handleCommentsVisualScroll = (
      idx: number,
      call: ToolCall,
      event: Event
    ) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const distanceToBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceToBottom > 360) return;
      getVideoCommentItems(call).forEach((item) => {
        if (shouldShowMoreRenderedCommentRoots(idx, call, item)) {
          showMoreRenderedCommentRoots(idx, call, item);
        }
      });
    };

    const getCommentRootKey = (
      idx: number,
      item: VideoCommentsItem,
      root: VideoComment
    ): string => `${idx}:${item.bvid || ''}:${getCommentId(root)}`;

    const getCommentDomKey = (
      idx: number,
      item: VideoCommentsItem,
      commentOrId: VideoComment | string
    ): string => {
      const commentId =
        typeof commentOrId === 'string'
          ? commentOrId
          : getCommentId(commentOrId);
      return `${idx}:${item.bvid || ''}:comment:${commentId}`;
    };

    const isSingleVideoCommentsResult = (call: ToolCall): boolean =>
      getVideoCommentItems(call).length === 1;

    const isCommentHighlighted = (
      idx: number,
      item: VideoCommentsItem,
      comment: VideoComment
    ): boolean => highlightedComments.value[getCommentDomKey(idx, item, comment)];

    const isCommentRootCollapsed = (
      idx: number,
      item: VideoCommentsItem,
      root: VideoCommentNode
    ): boolean =>
      collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] ?? true;

    const getAllCommentRootsCollapseMode = (
      idx: number,
      call: ToolCall
    ): CommentRootCollapseMode =>
      commentRootCollapseModes.value[getCommentModeKey(idx, call)] ??
      'collapsed';

    const markCommentRootsCollapseModeMixed = (idx: number, call: ToolCall) => {
      commentRootCollapseModes.value[getCommentModeKey(idx, call)] = 'mixed';
    };

    const toggleCommentRoot = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem,
      root: VideoCommentNode
    ) => {
      const key = getCommentRootKey(idx, item, root);
      collapsedCommentRoots.value[key] = !isCommentRootCollapsed(idx, item, root);
      markCommentRootsCollapseModeMixed(idx, call);
    };

    const getFilteredCommentReplies = (
      idx: number,
      root: VideoCommentNode
    ): VideoComment[] => {
      const filters = getCommentLayerFilters(idx, root);
      const rootMid = String(root.member?.mid || '').trim();
      return root.replies.filter((reply) => {
        if (filters.likedOnly && getCommentLikeValue(reply) <= 0) {
          return false;
        }
        if (
          filters.ownerOnly &&
          (!rootMid || String(reply.member?.mid || '').trim() !== rootMid)
        ) {
          return false;
        }
        return true;
      });
    };

    const getVisibleCommentReplyCount = (
      idx: number,
      root: VideoCommentNode
    ): number => getFilteredCommentReplies(idx, root).length;

    const getVisibleCommentReplies = (
      idx: number,
      root: VideoCommentNode
    ): VideoComment[] => {
      const filters = getCommentLayerFilters(idx, root);
      return sortComments(getFilteredCommentReplies(idx, root), filters.sortMode);
    };

    const getCollapsedHotReply = (
      root: VideoCommentNode
    ): VideoComment | null => {
      let bestReply: VideoComment | null = null;
      let bestLike = 0;
      let bestTime = 0;
      root.replies.forEach((reply) => {
        const like = getCommentLikeValue(reply);
        if (like < 2) return;
        const ctime = Number(reply.ctime || 0);
        if (like > bestLike || (like === bestLike && ctime > bestTime)) {
          bestReply = reply;
          bestLike = like;
          bestTime = ctime;
        }
      });
      return bestReply;
    };

    const shouldShowCommentRepliesActions = (
      idx: number,
      item: VideoCommentsItem,
      root: VideoCommentNode
    ): boolean =>
      shouldShowCommentRepliesToggle(idx, item, root) ||
      shouldShowCommentRepliesControls(idx, root);

    const shouldShowCommentRepliesToggle = (
      idx: number,
      item: VideoCommentsItem,
      root: VideoCommentNode
    ): boolean => {
      const visibleCount = getVisibleCommentReplyCount(idx, root);
      if (visibleCount <= 0) return false;
      if (!isCommentRootCollapsed(idx, item, root)) return true;
      return !(visibleCount === 1 && getCollapsedHotReply(root));
    };

    const shouldShowCommentRepliesControls = (
      idx: number,
      root: VideoCommentNode
    ): boolean => root.replies.length > 1;

    const getRenderedCommentReplies = (
      idx: number,
      item: VideoCommentsItem,
      root: VideoCommentNode
    ): VideoComment[] => {
      if (!isCommentRootCollapsed(idx, item, root)) {
        return getVisibleCommentReplies(idx, root);
      }
      const hotReply = getCollapsedHotReply(root);
      return hotReply ? [hotReply] : [];
    };

    const setAllCommentRootsCollapsed = (
      idx: number,
      call: ToolCall,
      collapsed: boolean
    ) => {
      getVideoCommentItems(call).forEach((item) => {
        getVisibleVideoCommentTree(idx, call, item).forEach((root) => {
          collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] =
            collapsed;
        });
      });
      commentRootCollapseModes.value[getCommentModeKey(idx, call)] = collapsed
        ? 'collapsed'
        : 'expanded';
    };

    const findCommentRootForId = (
      item: VideoCommentsItem,
      commentId: string
    ): VideoCommentNode | null => {
      for (const root of getVideoCommentTree(item)) {
        if (getCommentId(root) === commentId) return root;
        if (root.replies.some((reply) => getCommentId(reply) === commentId)) {
          return root;
        }
      }
      return null;
    };

    const getCommentElement = (
      idx: number,
      item: VideoCommentsItem,
      commentId: string
    ): HTMLElement | null => {
      const itemEl = getToolItemElement(idx);
      const nodes = itemEl?.querySelectorAll<HTMLElement>('[data-comment-id]');
      return (
        Array.from(nodes || []).find(
          (node) => node.dataset.commentId === commentId
        ) || null
      );
    };

    const getCommentScrollContainer = (
      idx: number,
      item: VideoCommentsItem,
      commentId: string
    ): HTMLElement | null => {
      const element = getCommentElement(idx, item, commentId);
      return (
        (element?.closest('.tool-comments-visual') as HTMLElement | null) ||
        ((getToolItemElement(idx)?.querySelector(
          '.tool-comments-visual'
        ) as HTMLElement | null) ?? null)
      );
    };

    const getCommentAnchorElement = (element: HTMLElement): HTMLElement =>
      (element.classList.contains('tool-comment-root')
        ? (element.querySelector('.tool-comment-row') as HTMLElement | null)
        : null) || element;

    const getVisibleCenterInCommentContainer = (
      container: HTMLElement
    ): number => {
      const containerRect = container.getBoundingClientRect();
      let visibleTop = containerRect.top;
      let visibleBottom = containerRect.bottom;
      const scrollLayout = container.closest(
        '.tool-results-layout'
      ) as HTMLElement | null;
      if (scrollLayout) {
        const layoutRect = scrollLayout.getBoundingClientRect();
        visibleTop = Math.max(visibleTop, layoutRect.top);
        visibleBottom = Math.min(visibleBottom, layoutRect.bottom);
      }

      const toolItem = container.closest('.tool-call-item');
      const stickySelectors = ['.tool-call-header', '.tool-comments-toolbar'];
      stickySelectors.forEach((selector) => {
        const sticky = toolItem?.querySelector(selector) as HTMLElement | null;
        if (!sticky) return;
        const stickyRect = sticky.getBoundingClientRect();
        if (stickyRect.bottom > visibleTop && stickyRect.top < visibleBottom) {
          visibleTop = Math.max(visibleTop, stickyRect.bottom);
        }
      });

      if (visibleBottom <= visibleTop) {
        return container.clientHeight / 2;
      }
      return (visibleTop + visibleBottom) / 2 - containerRect.top;
    };

    const getElementTopInCommentContainer = (
      element: HTMLElement,
      container: HTMLElement
    ): number => {
      if (
        element.offsetParent &&
        element.offsetParent === container.offsetParent
      ) {
        return element.offsetTop - container.offsetTop;
      }

      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return container.scrollTop + elementRect.top - containerRect.top;
    };

    const clampScrollTop = (container: HTMLElement, top: number): number =>
      Math.min(
        Math.max(top, 0),
        Math.max(0, container.scrollHeight - container.clientHeight)
      );

    const getCommentCenterDelta = (
      element: HTMLElement,
      container: HTMLElement
    ): number => {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const visibleCenter =
        containerRect.top + getVisibleCenterInCommentContainer(container);
      return elementRect.top + elementRect.height / 2 - visibleCenter;
    };

    const scrollCommentElementToCenter = (
      element: HTMLElement,
      container: HTMLElement
    ) => {
      const anchorElement = getCommentAnchorElement(element);
      const elementTop = getElementTopInCommentContainer(
        anchorElement,
        container
      );
      const visibleCenter = getVisibleCenterInCommentContainer(container);
      const targetTop =
        elementTop - visibleCenter + anchorElement.offsetHeight / 2;
      container.scrollTo({
        top: clampScrollTop(container, targetTop),
        behavior: 'auto',
      });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const correction = getCommentCenterDelta(anchorElement, container);
          if (Math.abs(correction) < 8) return;
          container.scrollTo({
            top: clampScrollTop(container, container.scrollTop + correction),
            behavior: 'smooth',
          });
        });
      });
    };

    const markCommentHighlighted = (
      idx: number,
      item: VideoCommentsItem,
      commentId: string
    ) => {
      const key = getCommentDomKey(idx, item, commentId);
      highlightedComments.value[key] = true;
      window.setTimeout(() => {
        delete highlightedComments.value[key];
      }, 1600);
    };

    const jumpToCommentById = (
      idx: number,
      item: VideoCommentsItem,
      commentId: string
    ) => {
      ensureCommentRootRenderedById(idx, item, commentId);
      const root = findCommentRootForId(item, commentId);
      if (root) {
        collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] = false;
      }
      nextTick(() => {
        const element = getCommentElement(idx, item, commentId);
        const container = getCommentScrollContainer(idx, item, commentId);
        if (element && container) {
          scrollCommentElementToCenter(element, container);
          element.setAttribute('tabindex', '-1');
          element.focus({ preventScroll: true });
          markCommentHighlighted(idx, item, commentId);
        } else if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.setAttribute('tabindex', '-1');
          element.focus({ preventScroll: true });
          markCommentHighlighted(idx, item, commentId);
        }
      });
    };

    const returnToCommentById = (
      idx: number,
      item: VideoCommentsItem,
      commentId: string
    ) => {
      commentReturnTargets.value = {};
      jumpToCommentById(idx, item, commentId);
    };

    const jumpToComment = (
      idx: number,
      item: VideoCommentsItem,
      target: VideoComment,
      from?: VideoComment
    ) => {
      const targetId = getCommentId(target);
      if (from) {
        commentReturnTargets.value = {
          [getCommentDomKey(idx, item, targetId)]: getCommentId(from),
        };
      }
      jumpToCommentById(idx, item, targetId);
    };

    const getReturnTargetForComment = (
      idx: number,
      item: VideoCommentsItem,
      comment: VideoComment
    ): string => commentReturnTargets.value[getCommentDomKey(idx, item, comment)] || '';

    const getCommentReferenceKey = (
      idx: number,
      item: VideoCommentsItem,
      comment: VideoComment
    ): string => `${idx}:${item.bvid || ''}:ref:${getCommentId(comment)}`;

    const isCommentReferenceExpanded = (
      idx: number,
      item: VideoCommentsItem,
      comment: VideoComment
    ): boolean =>
      expandedCommentReferences.value[getCommentReferenceKey(idx, item, comment)] ||
      false;

    const toggleCommentReference = (
      idx: number,
      item: VideoCommentsItem,
      comment: VideoComment
    ) => {
      const key = getCommentReferenceKey(idx, item, comment);
      expandedCommentReferences.value[key] = !expandedCommentReferences.value[key];
    };

    const getReferencedComment = (
      reply: VideoComment,
      root: VideoCommentNode
    ): VideoComment => reply.reply_to_comment || root;

    const shouldShowCommentReplyAction = (reply: VideoComment): boolean => {
      const parentId = String(reply.parent || '');
      return Boolean(parentId && parentId !== '0');
    };

    const getCommentReplyActionText = (
      reply: VideoComment,
      root: VideoCommentNode
    ): string => {
      const parentId = String(reply.parent || '');
      return parentId && parentId === getCommentId(root) ? '评论' : '回复';
    };

    const getCommentReplyTarget = (
      reply: VideoCommentNode | VideoComment,
      root: VideoCommentNode
    ): string => {
      const node = reply as VideoCommentNode;
      const parentId = String(reply.parent || '');
      const rootId = getCommentId(root);
      if (parentId && parentId === rootId) {
        return '';
      }
      if (node.reply_to_name) return node.reply_to_name;
      if (parentId && parentId !== '0' && parentId !== rootId) {
        return `#${parentId}`;
      }
      return '';
    };

    const getCommentPictureDimension = (
      picture: VideoCommentPicture,
      field: 'width' | 'height'
    ): number | undefined => {
      const value = Number(picture[field] || 0);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    };

    const collectCommentImages = (
      idx: number,
      call: ToolCall
    ): CommentImageEntry[] => {
      const images: CommentImageEntry[] = [];
      getVideoCommentItems(call).forEach((item) => {
        getVideoCommentTree(item).forEach((root) => {
          [root, ...root.replies].forEach((comment) => {
            const pictures = getCommentPictures(comment);
            pictures.forEach((picture, pictureIndex) => {
              const url = getCommentPictureUrl(picture);
              if (!url) return;
              images.push({
                url,
                comment,
                item,
                callIndex: idx,
                bvid: String(item.bvid || ''),
                pictureIndex,
                commentPictureCount: pictures.length,
                width: getCommentPictureDimension(picture, 'width'),
                height: getCommentPictureDimension(picture, 'height'),
              });
            });
          });
        });
      });
      return images;
    };

    const clampCommentImageScale = (value: number): number =>
      Math.min(
        COMMENT_IMAGE_SCALE_MAX,
        Math.max(COMMENT_IMAGE_SCALE_MIN, Number(value.toFixed(4)))
      );

    const setCommentImageScaleValue = (value: number) => {
      commentImageViewer.value.scale = clampCommentImageScale(value);
    };

    const setCommentImageScale = (value: number) => {
      setCommentImageScaleValue(value);
      commentImageViewer.value.fitMode = 'manual';
    };

    const setCommentImageScaleFromEvent = (event: Event) => {
      const input = event.target as HTMLInputElement | HTMLSelectElement | null;
      setCommentImageScale(Number(input?.value || COMMENT_IMAGE_SCALE_DEFAULT));
    };

    const resetCommentImageScale = () => {
      commentImageViewer.value.fitMode = 'contain';
      syncCommentImageFitScale();
    };

    const fitCommentImageWindow = () => {
      commentImageViewer.value.fitMode = 'contain';
      syncCommentImageFitScale();
    };

    const fitCommentImageWidth = () => {
      commentImageViewer.value.fitMode = 'width';
      syncCommentImageFitScale();
    };

    const zoomOutCommentImage = () => {
      setCommentImageScale(
        commentImageViewer.value.scale - COMMENT_IMAGE_SCALE_STEP
      );
    };

    const zoomInCommentImage = () => {
      setCommentImageScale(
        commentImageViewer.value.scale + COMMENT_IMAGE_SCALE_STEP
      );
    };

    const getCommentImageScalePercent = (): string =>
      `${Math.round(commentImageViewer.value.scale * 100)}%`;

    const formatCommentImageScaleOption = (value: number): string =>
      `${Math.round(value * 100)}%`;

    const getCommentImageScaleOptions = (): number[] => {
      const currentScale = clampCommentImageScale(commentImageViewer.value.scale);
      const currentPercent = Math.round(currentScale * 100);
      return Array.from(
        new Set([
          ...COMMENT_IMAGE_SCALE_OPTIONS.filter(
            (option) =>
              Math.round(option * 100) !== currentPercent ||
              Math.abs(option - currentScale) < 0.0001
          ),
          currentScale,
        ])
      ).sort((a, b) => a - b);
    };

    const getCommentImageFitWindowScaleForSize = (
      naturalSize: { width?: number; height?: number }
    ): number => {
      const naturalWidth = naturalSize.width || 0;
      const naturalHeight = naturalSize.height || 0;
      if (!naturalWidth || !naturalHeight) return COMMENT_IMAGE_SCALE_DEFAULT;
      const frameWidth = commentImageFrameSize.value.width;
      const frameHeight = commentImageFrameSize.value.height;
      if (!frameWidth || !frameHeight) return COMMENT_IMAGE_SCALE_DEFAULT;
      const safeFrameWidth = Math.max(1, frameWidth - COMMENT_IMAGE_FIT_GUTTER_PX);
      const safeFrameHeight = Math.max(
        1,
        frameHeight - COMMENT_IMAGE_FIT_GUTTER_PX
      );
      return clampCommentImageScale(
        Math.min(
          COMMENT_IMAGE_SCALE_DEFAULT,
          safeFrameWidth / naturalWidth,
          safeFrameHeight / naturalHeight
        )
      );
    };

    const getCommentImageFitWidthScaleForSize = (
      naturalSize: { width?: number; height?: number }
    ): number => {
      const naturalWidth = naturalSize.width || 0;
      if (!naturalWidth) return COMMENT_IMAGE_SCALE_DEFAULT;
      const frameWidth = commentImageFrameSize.value.width;
      if (!frameWidth) return COMMENT_IMAGE_SCALE_DEFAULT;
      const safeFrameWidth = Math.max(1, frameWidth - COMMENT_IMAGE_FIT_GUTTER_PX);
      return clampCommentImageScale(safeFrameWidth / naturalWidth);
    };

    const getCommentImageTargetScale = (): number => {
      const image = getActiveCommentImage();
      const naturalSize = getCommentImageNaturalSize(image);
      if (commentImageViewer.value.fitMode === 'contain') {
        return getCommentImageFitWindowScaleForSize(naturalSize);
      }
      if (commentImageViewer.value.fitMode === 'width') {
        return getCommentImageFitWidthScaleForSize(naturalSize);
      }
      return clampCommentImageScale(commentImageViewer.value.scale);
    };

    const syncCommentImageFitScale = () => {
      if (commentImageViewer.value.fitMode === 'manual') return;
      const nextScale = getCommentImageTargetScale();
      if (Math.abs(nextScale - commentImageViewer.value.scale) < 0.005) return;
      setCommentImageScaleValue(nextScale);
    };

    const getCommentImageScaleStyle = () => {
      const image = getActiveCommentImage();
      const naturalSize = getCommentImageNaturalSize(image);
      const naturalWidth = naturalSize.width || 0;
      const hasMeasuredFrame = Boolean(
        commentImageFrameSize.value.width && commentImageFrameSize.value.height
      );
      if (!hasMeasuredFrame && commentImageViewer.value.fitMode === 'contain') {
        return {
          width: 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          transform: 'none',
        };
      }
      if (!hasMeasuredFrame && commentImageViewer.value.fitMode === 'width') {
        return {
          width: '100%',
          maxWidth: '100%',
          maxHeight: 'none',
          transform: 'none',
        };
      }
      if (!naturalWidth) {
        return {
          width: 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          transform: 'none',
        };
      }
      const scale = getCommentImageTargetScale();
      return {
        width: `${Math.max(1, Math.floor(naturalWidth * scale))}px`,
        maxWidth: 'none',
        maxHeight: 'none',
        transform: 'none',
      };
    };

    const getActiveCommentImageSrc = (): string => {
      const image = getActiveCommentImage();
      if (!image) return '';
      return image.url;
    };

    const cacheCommentImageUrls = async (urls: string[]) => {
      if (typeof indexedDB === 'undefined') return;
      const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
      for (const url of uniqueUrls) {
        if (cachedCommentImageUrls.value[url]) continue;
        cachedCommentImageUrls.value[url] = url;
        try {
          await warmBrowserImageCache(url);
        } catch {
          cachedCommentImageUrls.value[url] = url;
        }
      }
    };

    const cacheCommentPictureUrl = (url: string) => {
      if (!url) return;
      void cacheCommentImageUrls([url]);
    };

    const cacheActiveCommentImageNeighborhood = () => {
      const viewer = commentImageViewer.value;
      if (!viewer.open || !viewer.images.length) return;
      const length = viewer.images.length;
      const offsets = [0, 1, -1, 2, -2];
      const nearUrls = offsets
        .map((offset) => viewer.images[(viewer.index + offset + length) % length]?.url)
        .filter(Boolean);
      cacheCommentImageUrls(nearUrls);
    };

    const cacheAllCommentViewerImages = () => {
      const urls = commentImageViewer.value.images.map((image) => image.url);
      cacheCommentImageUrls(urls);
    };

    const getRootZoom = (): number => {
      if (typeof document === 'undefined') return 1;
      const zoom = Number(getComputedStyle(document.documentElement).zoom || 1);
      return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    };

    const updateCommentImageViewport = () => {
      if (typeof window === 'undefined') return;
      commentImageViewport.value = {
        width: window.innerWidth,
        height: window.innerHeight,
        rootZoom: getRootZoom(),
      };
    };

    const updateCommentImageFrameSize = () => {
      const frame = commentImageFrameRef.value;
      if (!frame) {
        commentImageFrameSize.value = { width: 0, height: 0 };
        return;
      }
      const rootZoom = getRootZoom();
      const rect = frame.getBoundingClientRect();
      commentImageFrameSize.value = {
        width: rect.width / rootZoom,
        height: rect.height / rootZoom,
      };
      syncCommentImageFitScale();
    };

    const observeCommentImageFrame = () => {
      commentImageFrameResizeObserver?.disconnect();
      commentImageFrameResizeObserver = null;
      const frame = commentImageFrameRef.value;
      updateCommentImageFrameSize();
      if (!frame || typeof ResizeObserver === 'undefined') return;
      commentImageFrameResizeObserver = new ResizeObserver(() => {
        updateCommentImageFrameSize();
      });
      commentImageFrameResizeObserver.observe(frame);
    };

    const getCommentImageShellStyle = () => {
      const viewport = commentImageViewport.value;
      const rootZoom = viewport.rootZoom || 1;
      const viewportHeight = viewport.height || 0;
      if (!viewportHeight) return {};
      const margin = isCompactToolDisplay.value ? 20 : 48;
      const maxHeight = Math.max(
        260,
        Math.min(920, viewportHeight / rootZoom - margin)
      );
      return {
        height: `${maxHeight}px`,
        maxHeight: `${maxHeight}px`,
      };
    };

    const openCommentImageViewer = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem,
      comment: VideoComment,
      pictureIndex: number
    ) => {
      const currentPictures = getCommentPictures(comment);
      const currentUrl = getCommentPictureUrl(currentPictures[pictureIndex] || {});
      const images = collectCommentImages(idx, call);
      if (!currentUrl && !images.length) return;
      const currentCommentId = getCommentId(comment);
      const index = Math.max(
        images.findIndex(
          (entry) =>
            getCommentId(entry.comment) === currentCommentId &&
            entry.url === currentUrl &&
            entry.pictureIndex === pictureIndex
        ),
        0
      );
      commentImageViewer.value = {
        open: true,
        images: images.length
          ? images
          : currentUrl
          ? [
              {
                url: currentUrl,
                comment,
                item,
                callIndex: idx,
                bvid: '',
                pictureIndex,
                commentPictureCount: currentPictures.length,
                width: getCommentPictureDimension(
                  currentPictures[pictureIndex] || {},
                  'width'
                ),
                height: getCommentPictureDimension(
                  currentPictures[pictureIndex] || {},
                  'height'
                ),
              },
            ]
          : [],
        index,
        scale: COMMENT_IMAGE_SCALE_DEFAULT,
        fitMode: 'contain',
      };
      updateCommentImageViewport();
      nextTick(() => {
        observeCommentImageFrame();
        resetCommentImageFrameScroll();
        focusCommentImageFrame();
      });
      cacheActiveCommentImageNeighborhood();
      window.setTimeout(cacheAllCommentViewerImages, 800);
    };

    const getActiveCommentImage = (): CommentImageEntry | null => {
      if (!commentImageViewer.value.open) return null;
      return commentImageViewer.value.images[commentImageViewer.value.index] || null;
    };

    const getActiveCommentImageComment = (): VideoComment =>
      getActiveCommentImage()?.comment || {};

    const getActiveCommentImageKey = (): string => {
      const image = getActiveCommentImage();
      if (!image) return '';
      return `${getCommentId(image.comment)}-${image.pictureIndex}-${image.url}`;
    };

    const getCommentImageNaturalSize = (
      image: CommentImageEntry | null
    ): { width?: number; height?: number } => {
      if (!image) return {};
      return commentImageNaturalSizes.value[image.url] || {
        width: image.width,
        height: image.height,
      };
    };

    const isCommentImageZoomed = (): boolean => {
      const image = getActiveCommentImage();
      const naturalSize = getCommentImageNaturalSize(image);
      const naturalWidth = naturalSize.width || 0;
      const naturalHeight = naturalSize.height || 0;
      if (!naturalWidth || !naturalHeight) return false;
      const scale = getCommentImageTargetScale();
      const frameWidth = commentImageFrameSize.value.width || 0;
      const frameHeight = commentImageFrameSize.value.height || 0;
      if (!frameWidth || !frameHeight) {
        return (
          commentImageViewer.value.fitMode === 'width' ||
          scale > COMMENT_IMAGE_SCALE_DEFAULT
        );
      }
      return (
        naturalWidth * scale > frameWidth + 1 ||
        naturalHeight * scale > frameHeight + 1
      );
    };

    const isActiveCommentImageLong = (): boolean => {
      const image = getActiveCommentImage();
      const naturalSize = getCommentImageNaturalSize(image);
      if (!naturalSize.width || !naturalSize.height) return false;
      return naturalSize.height / naturalSize.width >= 1.85;
    };

    const handleActiveCommentImageLoad = (event: Event) => {
      const image = getActiveCommentImage();
      const element = event.target as HTMLImageElement | null;
      if (!image || !element) return;
      const width = element.naturalWidth;
      const height = element.naturalHeight;
      if (width > 0 && height > 0) {
        commentImageNaturalSizes.value = {
          ...commentImageNaturalSizes.value,
          [image.url]: { width, height },
        };
        syncCommentImageFitScale();
      }
    };

    const closeCommentImageViewer = () => {
      commentImageViewer.value = {
        open: false,
        images: [],
        index: 0,
        scale: COMMENT_IMAGE_SCALE_DEFAULT,
        fitMode: 'contain',
      };
      commentImagePan.value = {
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
      };
      commentImageFrameResizeObserver?.disconnect();
      commentImageFrameResizeObserver = null;
      commentImageFrameSize.value = { width: 0, height: 0 };
    };

    const resetCommentImageFrameScroll = () => {
      const frame = commentImageFrameRef.value;
      if (!frame) return;
      frame.scrollLeft = 0;
      frame.scrollTop = 0;
    };

    const focusCommentImageFrame = () => {
      const frame = commentImageFrameRef.value;
      frame?.focus({ preventScroll: true });
    };

    const showPreviousCommentImage = () => {
      const length = commentImageViewer.value.images.length;
      if (!length) return;
      commentImageViewer.value.index =
        (commentImageViewer.value.index - 1 + length) % length;
      resetCommentImageScale();
      nextTick(() => {
        observeCommentImageFrame();
        resetCommentImageFrameScroll();
        focusCommentImageFrame();
      });
      cacheActiveCommentImageNeighborhood();
    };

    const showNextCommentImage = () => {
      const length = commentImageViewer.value.images.length;
      if (!length) return;
      commentImageViewer.value.index = (commentImageViewer.value.index + 1) % length;
      resetCommentImageScale();
      nextTick(() => {
        observeCommentImageFrame();
        resetCommentImageFrameScroll();
        focusCommentImageFrame();
      });
      cacheActiveCommentImageNeighborhood();
    };

    const getActiveCommentImagePositionText = (): string => {
      const image = getActiveCommentImage();
      if (!image || image.commentPictureCount <= 1) return '';
      return `本评论 ${image.pictureIndex + 1} / ${image.commentPictureCount}`;
    };

    const startCommentImagePan = (event: PointerEvent) => {
      const frame = event.currentTarget as HTMLElement | null;
      if (!frame) return;
      const canPan =
        frame.scrollWidth > frame.clientWidth + 1 ||
        frame.scrollHeight > frame.clientHeight + 1;
      if (!isCommentImageZoomed() && !canPan) return;
      event.preventDefault();
      frame.setPointerCapture?.(event.pointerId);
      commentImagePan.value = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: frame.scrollLeft,
        scrollTop: frame.scrollTop,
      };
    };

    const moveCommentImagePan = (event: PointerEvent) => {
      const pan = commentImagePan.value;
      if (!pan.active || pan.pointerId !== event.pointerId) return;
      const frame = event.currentTarget as HTMLElement | null;
      if (!frame) return;
      event.preventDefault();
      frame.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
      frame.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
    };

    const handleCommentImageWheel = (event: WheelEvent) => {
      const frame = event.currentTarget as HTMLElement | null;
      if (!frame) return;
      const canScroll =
        frame.scrollHeight > frame.clientHeight + 1 ||
        frame.scrollWidth > frame.clientWidth + 1;
      if (canScroll) {
        event.stopPropagation();
      }
    };

    const scrollCommentImageFrameByKey = (
      event: KeyboardEvent,
      frame: HTMLElement | null = commentImageFrameRef.value
    ): boolean => {
      if (!frame || frame.scrollHeight <= frame.clientHeight + 1) {
        return false;
      }
      const lineStep = 84;
      const pageStep = Math.max(120, frame.clientHeight * 0.85);
      let delta = 0;
      if (event.key === 'ArrowDown') {
        delta = lineStep;
      } else if (event.key === 'ArrowUp') {
        delta = -lineStep;
      } else if (event.key === 'PageDown') {
        delta = pageStep;
      } else if (event.key === 'PageUp') {
        delta = -pageStep;
      } else {
        return false;
      }
      const nextTop = Math.min(
        Math.max(0, frame.scrollTop + delta),
        Math.max(0, frame.scrollHeight - frame.clientHeight)
      );
      if (nextTop === frame.scrollTop) return false;
      event.preventDefault();
      event.stopPropagation();
      frame.scrollTop = nextTop;
      return true;
    };

    const handleCommentImageFrameKeydown = (event: KeyboardEvent) => {
      scrollCommentImageFrameByKey(
        event,
        event.currentTarget as HTMLElement | null
      );
    };

    const endCommentImagePan = (event: PointerEvent) => {
      const pan = commentImagePan.value;
      if (!pan.active || pan.pointerId !== event.pointerId) return;
      const frame = event.currentTarget as HTMLElement | null;
      frame?.releasePointerCapture?.(event.pointerId);
      commentImagePan.value = {
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
      };
    };

    const jumpToActiveCommentImageComment = () => {
      const image = getActiveCommentImage();
      if (!image) return;
      const commentId = getCommentId(image.comment);
      closeCommentImageViewer();
      nextTick(() => {
        ensureCommentRootRenderedById(image.callIndex, image.item, commentId);
        jumpToCommentById(image.callIndex, image.item, commentId);
      });
    };

    const syncCommentImageViewerBodyLock = (open: boolean) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      if (open) {
        if (!body.dataset.toolCommentImageLocked) {
          previousBodyOverflow = body.style.overflow;
          body.dataset.toolCommentImageLocked = 'true';
        }
        body.style.overflow = 'hidden';
        return;
      }
      if (body.dataset.toolCommentImageLocked) {
        body.style.overflow = previousBodyOverflow;
        delete body.dataset.toolCommentImageLocked;
        previousBodyOverflow = '';
      }
    };

    const handleCommentImageViewerKeydown = (event: KeyboardEvent) => {
      if (!commentImageViewer.value.open) return;
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCommentImageViewer();
        return;
      }
      if (isEditableTarget) return;
      if (scrollCommentImageFrameByKey(event)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPreviousCommentImage();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNextCommentImage();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomInCommentImage();
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomOutCommentImage();
      }
    };

    const getVideoCommentItemMeta = (item: VideoCommentsItem): string => {
      const summary = item.summary || {};
      const loaded = getVideoCommentLoadedCount(item);
      const estimated = Number(summary.estimated_total || 0);
      const stored = Math.max(
        Number(summary.comment_count || 0),
        Number(summary.stored_count || 0),
        loaded
      );
      const total = Math.max(estimated, stored, loaded);
      const running = isCommentItemActivelySyncing(item);
      const incomplete =
        !running &&
        item.mode === 'full' &&
        summary.is_complete === false &&
        total > stored;
      const suffix = running ? ' · 后台同步中' : incomplete ? ' · 未完整' : '';
      return `加载 ${loaded} / 存储 ${stored} / 总计 ${total}${suffix}`;
    };

    const downloadCommentsJson = (call: ToolCall) => {
      const items = getVideoCommentItems(call);
      const bvids = items
        .map((item) => String(item.bvid || '').trim())
        .filter(Boolean);
      const payload = {
        tool: call.type,
        args: call.args || {},
        count: items.reduce(
          (sum, item) => sum + getItemComments(item).length,
          0
        ),
        items,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const name =
        bvids.length === 1
          ? `comments-${bvids[0]}.json`
          : `comments-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const getCommentItemState = (
      call: ToolCall,
      item: VideoCommentsItem
    ): LoadedCommentItemState =>
      loadedCommentItems.value[getCommentItemStateKey(call, item)] || {};

    const getCommentPageSize = (
      call: ToolCall,
      item: VideoCommentsItem
    ): number => {
      const pagination = item.pagination || {};
      const raw = Number(
        pagination.ps || pagination.limit || call.args?.ps || call.args?.limit || 1000
      );
      return Math.min(Math.max(raw || 1000, 1), 1000);
    };

    const getCommentDesiredLoadedCount = (
      call: ToolCall,
      item: VideoCommentsItem
    ): number => {
      const summary = item.summary || {};
      const requested = Number(call.args?.limit || call.args?.ps || 1000);
      const target = Math.min(Math.max(requested || 1000, 1), 1000);
      const estimated = Number(summary.estimated_total || 0);
      return estimated > 0 ? Math.min(target, estimated) : target;
    };

    const getCommentLoadMoreTargetCount = (
      call: ToolCall,
      item: VideoCommentsItem,
      startCount: number,
      pageSize: number
    ): number => {
      const summary = item.summary || {};
      const stored = Number(summary.comment_count || summary.stored_count || 0);
      const desired = getCommentDesiredLoadedCount(call, item);
      const oneWindowTarget = startCount + pageSize;
      const availableTarget =
        stored > startCount
          ? Math.min(oneWindowTarget, stored)
          : Math.min(oneWindowTarget, Math.max(desired, startCount));
      return Math.max(startCount, availableTarget);
    };

    const hasMoreStoredComments = (item: VideoCommentsItem): boolean => {
      const pagination = item.pagination || {};
      const summary = item.summary || {};
      const loaded = Number(
        pagination.loaded || getItemComments(item).length || pagination.returned || 0
      );
      const stored = Number(summary.comment_count || summary.stored_count || 0);
      const estimated = Number(summary.estimated_total || 0);
      const incompleteMoreEstimated =
        item.mode === 'full' &&
        summary.is_complete === false &&
        estimated > loaded;
      return (
        (Boolean(pagination.has_more_stored) &&
          (!stored || loaded < stored || incompleteMoreEstimated)) ||
        (stored > 0 && loaded < stored)
      );
    };

    const isCommentItemQueuedOrRunning = (
      call: ToolCall,
      item: VideoCommentsItem
    ): boolean => {
      const summary = item.summary || {};
      const loaded = getVideoCommentLoadedCount(item);
      const stored = Number(summary.comment_count || summary.stored_count || 0);
      const estimated = Number(summary.estimated_total || 0);
      if (item.mode === 'full' && loaded >= Math.max(stored, estimated, 1)) {
        return false;
      }
      const state = getCommentItemState(call, item);
      if (state.queuedOrRunning !== undefined) {
        return state.queuedOrRunning;
      }
      if (item.status === 'running' || item.refresh_status === 'running') {
        return true;
      }
      if (
        summary.is_complete === true ||
        summary.complete_exhausted === true
      ) {
        return false;
      }
      const result = (call.result as Record<string, unknown>) || {};
      const bvid = String(item.bvid || call.args?.bvid || '').trim();
      const scheduled = Array.isArray(result.scheduled)
        ? result.scheduled.map((value) => String(value))
        : [];
      const running = Array.isArray(result.running)
        ? result.running.map((value) => String(value))
        : [];
      if (bvid && (scheduled.includes(bvid) || running.includes(bvid))) {
        return true;
      }
      return item.status === 'running';
    };

    const needsMoreCommentSync = (item: VideoCommentsItem): boolean => {
      const summary = item.summary || {};
      const pagination = item.pagination || {};
      const loaded = Number(
        pagination.loaded || getItemComments(item).length || pagination.returned || 0
      );
      const estimated = Number(summary.estimated_total || 0);
      const stored = Number(summary.comment_count || summary.stored_count || 0);
      return (
        item.mode === 'full' &&
        summary.is_complete === false &&
        summary.complete_exhausted !== true &&
        estimated > Math.max(loaded, stored)
      );
    };

    const needsMoreInitialComments = (
      call: ToolCall,
      item: VideoCommentsItem
    ): boolean => {
      if (item.mode !== 'full') return false;
      const summary = item.summary || {};
      if (summary.is_complete === true || summary.complete_exhausted === true) {
        return false;
      }
      const loaded = getVideoCommentLoadedCount(item);
      const desired = getCommentDesiredLoadedCount(call, item);
      if (loaded >= desired) return false;
      const estimated = Number(summary.estimated_total || 0);
      const stored = Number(summary.comment_count || summary.stored_count || 0);
      return (
        estimated > loaded ||
        stored > loaded ||
        summary.is_complete === false ||
        isCommentItemQueuedOrRunning(call, item)
      );
    };

    const isCommentItemActivelySyncing = (item: VideoCommentsItem): boolean =>
      item.mode === 'full' &&
      (item.status === 'running' || item.refresh_status === 'running') &&
      (needsMoreCommentSync(item) || getVideoCommentLoadedCount(item) === 0);

    const shouldShowCommentsLoadMore = (
      call: ToolCall,
      item: VideoCommentsItem
    ): boolean => {
      const state = getCommentItemState(call, item);
      return (
        item.mode === 'full' &&
        (Boolean(state.loading) ||
          hasMoreStoredComments(item) ||
          needsMoreCommentSync(item) ||
          needsMoreInitialComments(call, item) ||
          isCommentItemQueuedOrRunning(call, item))
      );
    };

    const getCommentsLoadMoreText = (
      call: ToolCall,
      item: VideoCommentsItem
    ): string => {
      const state = getCommentItemState(call, item);
      if (state.loading) return '加载中...';
      if (hasMoreStoredComments(item)) return '加载更多评论';
      if (needsMoreInitialComments(call, item)) return '继续加载评论';
      if (needsMoreCommentSync(item)) return '继续同步评论';
      if (isCommentItemActivelySyncing(item)) {
        return '刷新已下载评论';
      }
      return '加载更多评论';
    };

    const getToolbarLoadMoreItem = (
      call: ToolCall
    ): VideoCommentsItem | undefined =>
      getVideoCommentItems(call).find((item) =>
        shouldShowCommentsLoadMore(call, item)
      );

    const shouldShowToolbarCommentsLoadMore = (call: ToolCall): boolean =>
      Boolean(getToolbarLoadMoreItem(call));

    const isToolbarCommentsLoadMoreLoading = (call: ToolCall): boolean => {
      const item = getToolbarLoadMoreItem(call);
      return item ? Boolean(getCommentItemState(call, item).loading) : false;
    };

    const getToolbarCommentsLoadMoreText = (call: ToolCall): string => {
      const item = getToolbarLoadMoreItem(call);
      return item ? getCommentsLoadMoreText(call, item) : '加载更多';
    };

    const getStoredCommentsNextPn = (
      state: LoadedCommentItemState,
      item: VideoCommentsItem,
      currentCount: number,
      pageSize: number,
      currentAttemptPages: Record<string, boolean> = {}
    ): number => {
      const currentPages = new Set(
        Object.entries(currentAttemptPages)
          .filter(([, attempted]) => attempted)
          .map(([page]) => Number(page))
          .filter((page) => Number.isFinite(page) && page > 0)
      );
      const summary = item.summary || {};
      const stored = Number(summary.comment_count || summary.stored_count || 0);
      const maxStoredPage = stored > 0 ? Math.ceil(stored / pageSize) : 0;
      const derivedNext = Math.max(Math.floor(currentCount / pageSize) + 1, 1);
      const upperBound = Math.max(maxStoredPage || 0, derivedNext);
      for (let page = derivedNext; page <= upperBound; page += 1) {
        if (!currentPages.has(page)) return page;
      }
      for (let page = 1; page <= upperBound; page += 1) {
        if (!currentPages.has(page)) return page;
      }

      const stateNext = Number(state.nextPn || 0);
      if (stateNext > 1 && !currentPages.has(stateNext)) return stateNext;
      const pagination = item.pagination || {};
      const itemNext = Number(pagination.next_pn || 0);
      if (itemNext > 1 && !currentPages.has(itemNext)) return itemNext;
      return Math.max(derivedNext, stateNext, itemNext, 1);
    };

    const getBackendCommentOrder = (
      mode: CommentSortMode
    ): 'default' | 'hot' | 'latest' | 'oldest' => {
      if (mode === 'hot') return 'hot';
      if (mode === 'time_asc') return 'oldest';
      if (mode === 'time_desc') return 'latest';
      return 'hot';
    };

    const mergeCommentsById = (
      current: VideoComment[],
      incoming: VideoComment[]
    ): VideoComment[] => {
      const seen = new Set<string>();
      const result: VideoComment[] = [];
      [...current, ...incoming].forEach((comment) => {
        const id = getCommentId(comment);
        if (seen.has(id)) return;
        seen.add(id);
        result.push(comment);
      });
      return result;
    };

    const isSameVideoCommentItem = (
      left: VideoCommentsItem,
      right: VideoCommentsItem
    ): boolean =>
      String(left.bvid || '') === String(right.bvid || '') &&
      String(left.mode || '') === String(right.mode || '');

    const buildCachedUtilityStepResults = (
      toolCall: ToolCall | null
    ): ExploreStepResult[] => {
      if (!toolCall) return [];
      const hasError =
        toolCall.result &&
        typeof toolCall.result === 'object' &&
        'error' in (toolCall.result as Record<string, unknown>);
      const status = hasError
        ? 'failed'
        : toolCall.status === 'pending' || toolCall.status === 'streaming'
        ? 'running'
        : 'finished';
      return [
        {
          step: 1,
          name: toolCall.type,
          name_zh:
            toolCall.type === 'video_comments'
              ? '视频评论'
              : toolCall.type === 'video_comments_full'
              ? '完整评论'
              : toolCall.type,
          status,
          input: toolCall.args,
          output: { tool_result: toolCall.result || {} },
          output_type: 'tool_result',
          comment: '',
        },
      ];
    };

    const getCurrentUtilitySessionId = (): string => {
      if (typeof window === 'undefined') return '';
      const match = window.location.pathname.match(/^\/chat\/([^/?#]+)/);
      return match ? decodeURIComponent(match[1] || '') : '';
    };

    const cacheUtilitySessionToolCallSnapshot = async (
      toolCall: ToolCall,
      stepResults: ExploreStepResult[]
    ) => {
      const sessionId = getCurrentUtilitySessionId();
      if (!sessionId) return;
      const payload = JSON.parse(
        JSON.stringify({
          stepResults,
          toolCall,
        })
      );
      await cacheService.set(
        STORE_NAMES.DATA,
        `utility-session:${sessionId}`,
        payload,
        {
          ttl: EXPLORE_CACHE_TTL,
          namespace: 'utility-results',
        }
      );
    };

    const persistMergedVideoCommentToolCall = (
      call: ToolCall,
      originalItem: VideoCommentsItem,
      mergedItem: VideoCommentsItem,
      payload?: Record<string, unknown>
    ) => {
      const activeCall = call;
      const result = (activeCall.result as Record<string, unknown>) || {};
      const items = Array.isArray(result.items)
        ? (result.items as VideoCommentsItem[]).map((candidate) =>
            isSameVideoCommentItem(candidate, originalItem) ? mergedItem : candidate
          )
        : [mergedItem];
      const updatedCall: ToolCall = {
        ...activeCall,
        status: activeCall.status === 'pending' ? 'streaming' : activeCall.status,
        result: {
          ...result,
          status: payload?.status || result.status,
          scheduled: Array.isArray(payload?.scheduled)
            ? payload?.scheduled
            : result.scheduled,
          running: Array.isArray(payload?.running) ? payload?.running : result.running,
          items,
        },
      };
      const stepResults = buildCachedUtilityStepResults(updatedCall);
      void cacheUtilitySessionToolCallSnapshot(updatedCall, stepResults);
    };

    const loadMoreComments = async (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem,
      options: { wait?: boolean; force?: boolean } = {}
    ) => {
      const key = getCommentItemStateKey(call, item);
      const state = getCommentItemState(call, item);
      if (state.loading || !item.bvid) return;
      const currentComments = getItemComments(item);
      const shouldFetchStored = hasMoreStoredComments(item);
      const shouldSyncMore = needsMoreCommentSync(item);
      const shouldLoadInitialMore = needsMoreInitialComments(call, item);
      const shouldPollRunning = isCommentItemQueuedOrRunning(call, item);
      if (
        !shouldFetchStored &&
        !shouldSyncMore &&
        !shouldLoadInitialMore &&
        !shouldPollRunning
      ) {
        return;
      }
      const pageSize = getCommentPageSize(call, item);
      const nextPn = shouldFetchStored
        ? getStoredCommentsNextPn(state, item, currentComments.length, pageSize)
        : 1;
      const shouldWait =
        options.wait ??
        ((shouldSyncMore || shouldLoadInitialMore) && currentComments.length === 0);
      const shouldForce =
        options.force ??
        ((shouldSyncMore || shouldLoadInitialMore) &&
          !shouldFetchStored &&
          !shouldPollRunning);
      loadedCommentItems.value[key] = { ...state, loading: true, error: '' };
      try {
        let requestPn = nextPn;
        let comments = currentComments;
        let latestItem: VideoCommentsItem | undefined;
        let latestPayload: Record<string, unknown> | undefined;
        const requestedStoredPages = { ...(state.requestedStoredPages || {}) };
        const currentAttemptPages: Record<string, boolean> = {};
        const startCount = currentComments.length;
        let targetLoadedCount = getCommentLoadMoreTargetCount(
          call,
          item,
          startCount,
          pageSize
        );
        const maxStoredPageAttempts = shouldFetchStored ? 8 : 1;

        for (let attempt = 0; attempt < maxStoredPageAttempts; attempt += 1) {
          if (shouldFetchStored) {
            requestedStoredPages[String(requestPn)] = true;
            currentAttemptPages[String(requestPn)] = true;
          }
          const response = await fetch('/api/video_comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bvid: item.bvid,
              mode: item.mode || call.args?.mode || 'full',
              pn: requestPn,
              ps: pageSize,
              order: getBackendCommentOrder(getCommentSortMode(idx, call)),
              wait: shouldWait,
              timeout_seconds: currentComments.length === 0 ? 60 : 180,
              complete: true,
              force: shouldForce,
              max_depth: 2,
              max_child_count: 1000,
            }),
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const payload = (await response.json()) as Record<string, unknown>;
          const nextItem = Array.isArray(payload.items)
            ? (payload.items[0] as VideoCommentsItem | undefined)
            : undefined;
          if (!nextItem) {
            throw new Error('评论服务没有返回视频评论数据');
          }

          comments = mergeCommentsById(comments, getItemComments(nextItem));
          latestItem = nextItem;
          latestPayload = payload;

          const pagination = nextItem.pagination || {};
          const backendNextPn = Number(pagination.next_pn || requestPn + 1);
          const nextSummary = nextItem.summary || item.summary || {};
          const storedCount = Number(
            nextSummary.comment_count || nextSummary.stored_count || 0
          );
          targetLoadedCount = Math.max(
            targetLoadedCount,
            getCommentLoadMoreTargetCount(
              call,
              { ...item, summary: nextSummary },
              startCount,
              pageSize
            )
          );
          const nextCandidatePn = getStoredCommentsNextPn(
            {
              ...state,
              nextPn: backendNextPn,
              requestedStoredPages,
            },
            {
              ...item,
              summary: nextSummary,
              pagination,
            },
            comments.length,
            pageSize,
            currentAttemptPages
          );
          if (
            !shouldFetchStored ||
            comments.length >= targetLoadedCount ||
            (storedCount > 0 && comments.length >= storedCount) ||
            !nextCandidatePn ||
            Boolean(currentAttemptPages[String(nextCandidatePn)])
          ) {
            break;
          }
          requestPn = nextCandidatePn;
        }

        if (!latestItem || !latestPayload) {
          throw new Error('评论服务没有返回视频评论数据');
        }
        const runningBvids = Array.isArray(latestPayload.running)
          ? latestPayload.running.map((value) => String(value))
          : [];
        const scheduledBvids = Array.isArray(latestPayload.scheduled)
          ? latestPayload.scheduled.map((value) => String(value))
          : [];
        const isQueuedOrRunning =
          runningBvids.includes(String(item.bvid)) ||
          scheduledBvids.includes(String(item.bvid));
        const nextStatus =
          latestItem.status === 'running' && !runningBvids.includes(String(item.bvid))
            ? 'completed'
            : latestItem.status;
        const nextPagination = latestItem.pagination || {};
        const followingPn = Number(nextPagination.next_pn || requestPn + 1);
        loadedCommentItems.value[key] = {
          comments,
          summary: latestItem.summary || item.summary,
          pagination: {
            ...nextPagination,
            loaded: comments.length,
            returned: comments.length,
          },
          status: nextStatus,
          refresh_status:
            nextStatus === 'running' ? latestItem.refresh_status : undefined,
          loading: false,
          error: '',
          nextPn: followingPn > 1 ? followingPn : undefined,
          requestedStoredPages,
          queuedOrRunning: isQueuedOrRunning,
        };
        persistMergedVideoCommentToolCall(call, item, {
          ...latestItem,
          comments,
          summary: latestItem.summary || item.summary,
          pagination: {
            ...nextPagination,
            loaded: comments.length,
            returned: comments.length,
          },
          status: nextStatus,
          refresh_status:
            nextStatus === 'running' ? latestItem.refresh_status : undefined,
        }, latestPayload);
      } catch (error) {
        loadedCommentItems.value[key] = {
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    };

    const loadMoreCommentsFromToolbar = async (idx: number, call: ToolCall) => {
      const item = getToolbarLoadMoreItem(call);
      if (!item) return;
      await loadMoreComments(idx, call, item);
    };

    const clearCommentAutoRefreshTimer = (key: string) => {
      const timer = commentAutoRefreshTimers.get(key);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        commentAutoRefreshTimers.delete(key);
      }
    };

    const clearAllCommentAutoRefreshTimers = () => {
      Array.from(commentAutoRefreshTimers.keys()).forEach((key) =>
        clearCommentAutoRefreshTimer(key)
      );
      commentAutoRefreshAttempts.clear();
    };

    const shouldAutoRefreshCommentItem = (
      call: ToolCall,
      item: VideoCommentsItem
    ): boolean => {
      if (item.mode !== 'full' || getCommentItemState(call, item).loading) {
        return false;
      }
      const loaded = getVideoCommentLoadedCount(item);
      const desired = getCommentDesiredLoadedCount(call, item);
      if (loaded >= desired) {
        return false;
      }
      if (hasMoreStoredComments(item)) {
        return true;
      }
      if (needsMoreInitialComments(call, item)) {
        return true;
      }
      if (needsMoreCommentSync(item)) {
        return true;
      }
      return (
        isCommentItemQueuedOrRunning(call, item) && getItemComments(item).length === 0
      );
    };

    const scheduleCommentAutoRefresh = (
      idx: number,
      call: ToolCall,
      item: VideoCommentsItem
    ) => {
      const key = getCommentItemStateKey(call, item);
      if (!shouldAutoRefreshCommentItem(call, item)) {
        clearCommentAutoRefreshTimer(key);
        return;
      }
      if (commentAutoRefreshTimers.has(key)) return;
      const attempts = commentAutoRefreshAttempts.get(key) || 0;
      if (attempts >= 30) return;
      const delay = attempts < 3 ? 1800 : 3500;
      const timer = window.setTimeout(() => {
        commentAutoRefreshTimers.delete(key);
        commentAutoRefreshAttempts.set(key, attempts + 1);
        void loadMoreComments(idx, call, item, { wait: false });
      }, delay);
      commentAutoRefreshTimers.set(key, timer);
    };

    const syncCommentAutoRefresh = () => {
      const activeKeys = new Set<string>();
      visibleToolCalls.value.forEach((call, idx) => {
        if (!isVideoCommentsTool(call)) return;
        getVideoCommentItems(call).forEach((item) => {
          const key = getCommentItemStateKey(call, item);
          activeKeys.add(key);
          scheduleCommentAutoRefresh(idx, call, item);
        });
      });
      Array.from(commentAutoRefreshTimers.keys()).forEach((key) => {
        if (!activeKeys.has(key)) {
          clearCommentAutoRefreshTimer(key);
        }
      });
    };

    /** Normalize bilibili pic URL to include https: protocol */
    const normalizePicUrl = (pic: string): string => {
      return normalizeVideoPicUrl(pic);
    };

    /** Open video page on bilibili in new tab */
    const openVideoPage = (hit: VideoHit) => {
      if (hit.bvid) {
        window.open(
          `https://www.bilibili.com/video/${hit.bvid}`,
          '_blank',
          'noopener'
        );
      }
    };

    type ScrollAnchor = {
      itemEl: HTMLElement;
      scrollEl: HTMLElement;
      itemBottom: number;
      scrollTop: number;
    };

    const getToolItemElement = (idx: number): HTMLElement | null => {
      const items = containerRef.value?.querySelectorAll('.tool-call-item');
      return (items?.[idx] as HTMLElement | undefined) || null;
    };

    const scrollCommentsToTop = (idx: number) => {
      const itemEl = getToolItemElement(idx);
      const scrollEl = itemEl?.querySelector(
        '.tool-comments-visual'
      ) as HTMLElement | null;
      scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getScrollableAncestor = (element: HTMLElement | null) => {
      let current = element?.parentElement || null;
      while (current) {
        if (current.classList.contains('chat-results-container')) {
          return current;
        }
        const style = window.getComputedStyle(current);
        if (
          /(auto|scroll)/.test(style.overflowY || '') &&
          current.scrollHeight > current.clientHeight
        ) {
          return current;
        }
        current = current.parentElement;
      }
      return document.scrollingElement as HTMLElement | null;
    };

    const captureScrollAnchor = (idx: number): ScrollAnchor | null => {
      const itemEl = getToolItemElement(idx);
      if (!itemEl) {
        return null;
      }
      const scrollEl = getScrollableAncestor(itemEl);
      if (!scrollEl) {
        return null;
      }
      return {
        itemEl,
        scrollEl,
        itemBottom: itemEl.getBoundingClientRect().bottom,
        scrollTop: scrollEl.scrollTop,
      };
    };

    const restoreScrollAnchors = (anchors: Array<ScrollAnchor | null>) => {
      const validAnchors = anchors.filter(
        (anchor): anchor is ScrollAnchor => !!anchor
      );
      if (validAnchors.length === 0) {
        return;
      }
      nextTick(() => {
        validAnchors.forEach((anchor) => {
          if (!anchor.itemEl.isConnected) {
            return;
          }
          const delta =
            anchor.itemEl.getBoundingClientRect().bottom - anchor.itemBottom;
          if (Math.abs(delta) > 1) {
            anchor.scrollEl.scrollTop = anchor.scrollTop + delta;
          }
        });
      });
    };

    const setExpandedWithAnchor = (idx: number, value: boolean) => {
      const anchor = captureScrollAnchor(idx);
      expanded.value[idx] = value;
      restoreScrollAnchors([anchor]);
    };

    const syncStreamingSmallTaskScrollPositions = () => {
      nextTick(() => {
        visibleToolCalls.value.forEach((call, idx) => {
          if (
            !isSmallModelTextTool(call) ||
            call.status !== 'streaming'
          ) {
            return;
          }
          const itemEl = getToolItemElement(idx);
          const resultEl = itemEl?.querySelector(
            '.tool-text-result--small-task'
          ) as HTMLElement | null;
          if (!resultEl) {
            return;
          }

          if (call.type === 'summarize_transcript') {
            const scrollEl = getScrollableAncestor(itemEl);
            if (scrollEl) {
              scrollEl.scrollTop = scrollEl.scrollHeight;
            }
          } else {
            resultEl.scrollTop = resultEl.scrollHeight;
          }
        });
      });
    };

    const cancelSmoothSmallTaskFrame = () => {
      if (
        smoothSmallTaskFrameId != null &&
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(smoothSmallTaskFrameId);
      }
      smoothSmallTaskFrameId = null;
    };

    const stepSmoothSmallTaskTexts = () => {
      smoothSmallTaskFrameId = null;
      let hasChanged = false;
      let needsNextFrame = false;
      const nextTexts = { ...smoothSmallTaskTexts.value };

      smoothSmallTaskTargets.forEach((target, key) => {
        const current = nextTexts[key] || '';
        if (current === target) {
          return;
        }
        const next = getSmoothStreamingNextText(current, target, {
          frameMs: 20,
          minCharsPerFrame: 2,
          maxCharsPerFrame: 34,
          growthRatio: 0.24,
        });
        if (next !== current) {
          nextTexts[key] = next;
          hasChanged = true;
        }
        if (next !== target) {
          needsNextFrame = true;
        }
      });

      if (hasChanged) {
        smoothSmallTaskTexts.value = nextTexts;
        syncStreamingSmallTaskScrollPositions();
      }
      if (needsNextFrame) {
        scheduleSmoothSmallTaskFrame();
      }
    };

    const scheduleSmoothSmallTaskFrame = () => {
      if (smoothSmallTaskFrameId != null) {
        return;
      }
      if (
        typeof window === 'undefined' ||
        typeof window.requestAnimationFrame !== 'function'
      ) {
        smoothSmallTaskTexts.value = Object.fromEntries(smoothSmallTaskTargets);
        return;
      }
      smoothSmallTaskFrameId = window.requestAnimationFrame(
        stepSmoothSmallTaskTexts
      );
    };

    const syncSmoothSmallTaskTexts = () => {
      const activeKeys = new Set<string>();
      const nextTexts = { ...smoothSmallTaskTexts.value };
      let hasChanged = false;
      let shouldAnimate = false;

      visibleToolCalls.value.forEach((call, idx) => {
        if (!isSmallModelTextTool(call)) {
          return;
        }
        const key = getSmallTaskDisplayKey(call, idx);
        const target = getSmallTaskResultRawText(call);
        const current = nextTexts[key];
        activeKeys.add(key);
        smoothSmallTaskTargets.set(key, target);

        const canSmooth =
          call.status === 'streaming' &&
          typeof current === 'string' &&
          target.startsWith(current) &&
          target.length > current.length;

        if (current === undefined || !canSmooth) {
          if (current !== target) {
            nextTexts[key] = target;
            hasChanged = true;
          }
          return;
        }
        shouldAnimate = true;
      });

      Object.keys(nextTexts).forEach((key) => {
        if (!activeKeys.has(key)) {
          delete nextTexts[key];
          smoothSmallTaskTargets.delete(key);
          hasChanged = true;
        }
      });
      Array.from(smoothSmallTaskTargets.keys()).forEach((key) => {
        if (!activeKeys.has(key)) {
          smoothSmallTaskTargets.delete(key);
        }
      });

      if (hasChanged) {
        smoothSmallTaskTexts.value = nextTexts;
        syncStreamingSmallTaskScrollPositions();
      }
      if (shouldAnimate) {
        scheduleSmoothSmallTaskFrame();
      }
    };

    const handleSmallTaskWheel = (event: WheelEvent, idx: number) => {
      const targetEl = event.currentTarget as HTMLElement | null;
      if (targetEl) {
        const canScroll = targetEl.scrollHeight > targetEl.clientHeight + 1;
        const atTop = targetEl.scrollTop <= 0;
        const atBottom =
          targetEl.scrollTop + targetEl.clientHeight >=
          targetEl.scrollHeight - 1;
        const shouldUseInnerScroll =
          canScroll &&
          ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom));

        if (shouldUseInnerScroll) {
          return;
        }
      }

      const itemEl = getToolItemElement(idx);
      if (!itemEl) {
        return;
      }
      const scrollEl = getScrollableAncestor(itemEl);
      if (!scrollEl || scrollEl === targetEl) {
        return;
      }
      event.preventDefault();
      scrollEl.scrollTop += event.deltaY;
    };

    watch(
      () =>
        visibleToolCalls.value.map((call, idx) => {
          if (!isSmallModelTextTool(call)) {
            return `${idx}:${call.type}:${call.status}`;
          }
          return `${getSmallTaskDisplayKey(call, idx)}:${call.status}:${getSmallTaskResultRawText(
            call
          )}`;
        }),
      syncSmoothSmallTaskTexts,
      { immediate: true }
    );

    // ── Watch: Auto-expand completed search_videos calls with animation ──
    // 先设置为 false（确保 DOM 渲染出 0fr 状态），再通过 nextTick 延迟设为 true
    // 使 CSS grid-template-rows 过渡动画生效
    watch(
      () =>
        visibleToolCalls.value.map((call) => {
          const smallTaskResult =
            isSmallModelTextTool(call)
              ? getSmallTaskResultRawText(call)
              : '';
          return `${call.type}::${call.status}::${
            call.visibility || ''
          }::${smallTaskResult}`;
        }),
      () => {
        const calls = visibleToolCalls.value;
        const nextExpanded: Record<number, boolean> = {};
        const nextStatuses: Record<number, string | undefined> = {};
        const anchorsToRestore: Array<ScrollAnchor | null> = [];

        calls.forEach((call, idx) => {
          const previousExpanded = expanded.value[idx];
          const previousStatus = previousStatuses.value[idx];
          nextStatuses[idx] = call.status;

          if (isSmallModelTextTool(call)) {
            if (call.status === 'streaming' && previousStatus !== 'streaming') {
              if (previousExpanded !== true) {
                anchorsToRestore.push(captureScrollAnchor(idx));
              }
              nextExpanded[idx] = true;
              return;
            }
            if (
              call.status === 'completed' &&
              previousStatus !== 'completed' &&
              hasResults(call)
            ) {
              if (previousExpanded !== false) {
                anchorsToRestore.push(captureScrollAnchor(idx));
              }
              nextExpanded[idx] = false;
              return;
            }
            if (previousExpanded !== undefined) {
              nextExpanded[idx] = previousExpanded;
              return;
            }
            if (call.status === 'completed' && hasResults(call)) {
              nextExpanded[idx] = false;
            }
            return;
          }

          if (previousExpanded !== undefined) {
            nextExpanded[idx] = previousExpanded;
            return;
          }
          if (
            call.status === 'completed' &&
            hasResults(call) &&
            nextExpanded[idx] === undefined
          ) {
            nextExpanded[idx] = false;
          }
        });

        expanded.value = nextExpanded;
        previousStatuses.value = nextStatuses;
        restoreScrollAnchors(anchorsToRestore);
        syncStreamingSmallTaskScrollPositions();
      },
      { immediate: true }
    );

    watch(
      [visibleToolCalls, loadedCommentItems],
      () => {
        syncCommentAutoRefresh();
      },
      { deep: true, immediate: true }
    );

    watch(
      () => commentImageViewer.value.open,
      (open) => {
        syncCommentImageViewerBodyLock(open);
        if (open) {
          nextTick(() => {
            updateCommentImageViewport();
            observeCommentImageFrame();
          });
        }
      }
    );

    const toggleExpand = (idx: number) => {
      const call = visibleToolCalls.value[idx];
      if (call && isExpandable(call)) {
        setExpandedWithAnchor(idx, !expanded.value[idx]);
      }
    };

    /**
     * 收起结果，保持底部 bar 正下方在视口中的位置不变。
     * 锚点：tool-call-item 底部（即收起栏的正下方）。
     * 收起前记录该锚点在视口中的 Y 坐标，收起后调整 scrollTop
     * 使锚点恢复到完全相同的视口位置，实现零跳动。
     */
    const collapseAndScroll = (idx: number) => {
      setExpandedWithAnchor(idx, false);
    };

    const updateCompactToolDisplay = () => {
      isCompactToolDisplay.value = !!compactMediaQuery?.matches;
    };

    onMounted(() => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia) {
        compactMediaQuery = window.matchMedia(COMPACT_TOOL_DISPLAY_QUERY);
        updateCompactToolDisplay();
        compactMediaQuery.addEventListener?.('change', updateCompactToolDisplay);
      }
      updateCommentImageViewport();
      window.addEventListener('resize', updateCommentImageViewport);
      document.addEventListener('keydown', handleCommentImageViewerKeydown);
    });

    onBeforeUnmount(() => {
      cancelSmoothSmallTaskFrame();
      clearAllCommentAutoRefreshTimers();
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleCommentImageViewerKeydown);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateCommentImageViewport);
      }
      commentImageFrameResizeObserver?.disconnect();
      commentImageFrameResizeObserver = null;
      syncCommentImageViewerBodyLock(false);
      compactMediaQuery?.removeEventListener?.(
        'change',
        updateCompactToolDisplay
      );
      compactMediaQuery = null;
    });

    return {
      rootAttrs: attrs,
      containerRef,
      commentImageFrameRef,
      expanded,
      isCompactToolDisplay,
      visibleToolCalls,
      toggleExpand,
      collapseAndScroll,
      getToolLabel,
      getToolIcon,
      isSmallModelTextTool,
      isVideoCommentsTool,
      getCommentSortMode,
      handleCommentSortChange,
      isCommentLikedFilterActive,
      isCommentAuthorFilterActive,
      toggleCommentLikedFilter,
      toggleCommentAuthorFilter,
      getVideoCommentItems,
      getVideoCommentTree,
      getVisibleVideoCommentTree,
      getRenderedVisibleVideoCommentTree,
      shouldShowMoreRenderedCommentRoots,
      showMoreRenderedCommentRoots,
      getRenderMoreCommentRootsText,
      handleCommentsVisualScroll,
      getVisibleCommentReplies,
      getVisibleCommentReplyCount,
      getVideoCommentTitle,
      getVideoCommentOwnerText,
      getVideoCommentItemMeta,
      downloadCommentsJson,
      getCommentItemState,
      isCommentItemQueuedOrRunning,
      shouldShowCommentsLoadMore,
      getCommentsLoadMoreText,
      loadMoreComments,
      getCommentId,
      getCommentAuthor,
      getCommentAuthorTags,
      getCommentAuthorTagClass,
      getCommentAuthorHref,
      getCommentTime,
      getCommentLikeValue,
      getCommentLikeText,
      getCommentMessage,
      getDisplayCommentMessage,
      shouldCollapseCommentMessage,
      isLongCommentExpanded,
      toggleLongComment,
      getCommentPictures,
      getCommentPictureUrl,
      getCommentPictureFallbackUrl,
      cacheCommentPictureUrl,
      handleCommentPictureError,
      shouldShowCommentReplyAction,
      getCommentReplyActionText,
      getCommentReplyTarget,
      getReferencedComment,
      isSingleVideoCommentsResult,
      isCommentHighlighted,
      jumpToComment,
      jumpToCommentById,
      returnToCommentById,
      getReturnTargetForComment,
      isCommentRootCollapsed,
      getAllCommentRootsCollapseMode,
      toggleCommentRoot,
      setAllCommentRootsCollapsed,
      shouldShowCommentRepliesActions,
      shouldShowCommentRepliesToggle,
      shouldShowCommentRepliesControls,
      getRenderedCommentReplies,
      isCommentLayerOwnerFilterActive,
      isCommentLayerLikedFilterActive,
      toggleCommentLayerOwnerFilter,
      toggleCommentLayerLikedFilter,
      getCommentLayerSortMode,
      handleCommentLayerSortChange,
      shouldShowToolbarCommentsLoadMore,
      isToolbarCommentsLoadMoreLoading,
      getToolbarCommentsLoadMoreText,
      loadMoreCommentsFromToolbar,
      isCommentReferenceExpanded,
      toggleCommentReference,
      scrollCommentsToTop,
      commentImageViewer,
      commentImagePan,
      COMMENT_IMAGE_SCALE_MIN,
      COMMENT_IMAGE_SCALE_MAX,
      COMMENT_IMAGE_SCALE_STEP,
      COMMENT_IMAGE_SCALE_DEFAULT,
      COMMENT_IMAGE_SCALE_OPTIONS,
      openCommentImageViewer,
      getActiveCommentImage,
      getActiveCommentImageComment,
      getActiveCommentImageKey,
      getActiveCommentImageSrc,
      closeCommentImageViewer,
      showPreviousCommentImage,
      showNextCommentImage,
      zoomOutCommentImage,
      zoomInCommentImage,
      resetCommentImageScale,
      fitCommentImageWindow,
      fitCommentImageWidth,
      setCommentImageScaleFromEvent,
      getCommentImageScalePercent,
      getCommentImageScaleOptions,
      formatCommentImageScaleOption,
      getCommentImageScaleStyle,
      getCommentImageShellStyle,
      isCommentImageZoomed,
      isActiveCommentImageLong,
      handleActiveCommentImageLoad,
      getActiveCommentImagePositionText,
      startCommentImagePan,
      moveCommentImagePan,
      endCommentImagePan,
      handleCommentImageWheel,
      handleCommentImageFrameKeydown,
      jumpToActiveCommentImageComment,
      getToolError,
      getQueryList,
      formatToolArgs,
      hasResults,
      canShowResults,
      shouldRenderToolDetails,
      isExpandable,
      isAlwaysExpanded,
      getResultsWrapperClasses,
      getResultCount,
      getVideoHits,
      getAllVideoHits,
      getPerQueryResults,
      getAuthorResult,
      getGoogleResults,
      getGoogleDisplayedUrl,
      getGoogleSnippet,
      getOwnerResults,
      getOwnerGroups,
      getTranscriptResult,
      getTranscriptVideoId,
      getTranscriptText,
      getSmallTaskResultClasses,
      getSmallTaskResultText,
      shouldRenderSmallTaskMarkdown,
      renderSmallTaskMarkdown,
      getStreamingStatusText,
      getPendingStatusText,
      formatGenericResult,
      getOwnerDisplayName,
      getOwnerHref,
      getOwnerUidText,
      handleSmallTaskWheel,
      normalizePicUrl,
      openVideoPage,
    };
  },
});
</script>

<style lang="scss" scoped>
.tool-call-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 6px 0;
}

.tool-call-item {
  border-radius: 8px;
  overflow: visible;
  transition: background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease;
}

.tool-call-pending {
  background: rgba(128, 128, 128, 0.028);
  border: 1px dashed rgba(128, 128, 128, 0.12);
}

.tool-call-streaming {
  background: rgba(64, 144, 255, 0.04);
  border: 1px solid rgba(64, 144, 255, 0.14);
}

.tool-call-completed {
  background: rgba(128, 128, 128, 0.022);
  border: 1px solid rgba(128, 128, 128, 0.08);
}

.tool-call-header {
  position: sticky;
  top: 0;
  z-index: 18;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(250, 251, 253, 0.96);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
  opacity: 0.78;

  &:hover {
    background: rgba(128, 128, 128, 0.04);
    opacity: 0.88;
  }
}

.tool-call-left {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tool-call-spinner {
  opacity: 0.42;
  color: currentColor;
}

.tool-call-icon {
  opacity: 0.48;
}

.tool-call-name {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.72;
  flex: 0 0 auto;
  white-space: nowrap;
  word-break: keep-all;
}

.tool-call-args {
  font-size: 11px;
  opacity: 0.42;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.tool-call-args-full {
  font-size: 11px;
  opacity: 0.42;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多 query 子列表 */
.tool-query-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 1px 10px 5px 30px;
}

.tool-query-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-query-icon {
  opacity: 0.35;
  flex-shrink: 0;
}

.tool-query-text {
  font-size: 11px;
  opacity: 0.48;
  line-height: 1.4;
  word-break: break-word;
}

.tool-call-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  flex: 0 0 auto;
}

.tool-call-status-pending {
  font-size: 11px;
  color: inherit;
  opacity: 0.48;
}

.tool-call-status-streaming {
  font-size: 11px;
  color: rgba(64, 144, 255, 0.9);
}

.tool-call-status-aborted {
  font-size: 11px;
  opacity: 0.42;
  color: inherit;
}

.tool-call-aborted-icon {
  opacity: 0.45;
}

.tool-call-status-completed {
  font-size: 11px;
  opacity: 0.42;
}

.tool-call-expand-icon {
  opacity: 0.32;
}

/* 搜索结果折叠动画 */
.tool-call-results-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-call-results-wrapper.expanded {
  grid-template-rows: 1fr;
}

.tool-call-results-inner {
  overflow: hidden;
  min-height: 0;
}

.tool-call-results-wrapper.expanded .tool-call-results-inner {
  overflow: visible;
}

/* 搜索结果预览 */
.tool-call-results {
  padding: 6px 10px 10px;
  border-top: 1px solid rgba(128, 128, 128, 0.06);
}

/* 按 query 分组的搜索结果 */
.per-query-section {
  margin-bottom: 10px;
  &:last-child {
    margin-bottom: 0;
  }
}

.per-query-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  padding: 2px 0;
}

.per-query-icon {
  opacity: 0.4;
  flex-shrink: 0;
}

.per-query-text {
  font-size: 11px;
  opacity: 0.52;
  font-weight: 500;
}

.per-query-count {
  font-size: 11px;
  opacity: 0.36;
  margin-left: 4px;
}

.tool-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.tool-result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;
  cursor: pointer;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
  }
}

.tool-result-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 4px;
}

.tool-result-cover-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(128, 128, 128, 0.35);
}

.tool-result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 2px;
}

.tool-result-title {
  font-size: 11px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.85;
}

.tool-result-author {
  font-size: 10px;
  opacity: 0.45;
}

.tool-google-results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-owner-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-comments-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.tool-comments-toolbar {
  position: sticky;
  top: 31px;
  z-index: 16;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
  margin: -6px -10px 0;
  padding: 6px 10px 8px;
  background: rgba(250, 251, 253, 0.96);
  border-bottom: 1px solid rgba(128, 128, 128, 0.08);
  backdrop-filter: blur(10px);
}

.tool-comments-toolbar-meta {
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.56;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-comments-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 0;
}

.tool-comments-toolbar-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 6px;
  margin-left: auto;
  white-space: nowrap;
}

.tool-comments-sort {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: rgba(92, 107, 125, 0.72);
}

.tool-comments-sort select {
  height: 24px;
  min-width: 78px;
  max-width: 88px;
  padding: 0 18px 0 7px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.84);
  color: rgba(35, 45, 58, 0.82);
  font-size: 11px;
  line-height: 22px;
  color-scheme: light;
  outline: none;

  &:hover {
    border-color: rgba(25, 118, 210, 0.22);
    background-color: rgba(255, 255, 255, 0.96);
  }

  &:focus {
    border-color: rgba(25, 118, 210, 0.36);
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.08);
  }
}

.tool-comments-chip {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(128, 128, 128, 0.14);
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.045);
  color: rgba(65, 78, 94, 0.72);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(25, 118, 210, 0.08);
    border-color: rgba(25, 118, 210, 0.16);
    color: rgba(25, 118, 210, 0.9);
  }
}

.tool-comments-chip--fold {
  background: rgba(128, 128, 128, 0.045);
  border-color: rgba(128, 128, 128, 0.14);
  color: rgba(65, 78, 94, 0.72);
}

.tool-comments-chip--expand {
  background: rgba(128, 128, 128, 0.045);
  border-color: rgba(128, 128, 128, 0.14);
  color: rgba(65, 78, 94, 0.72);
}

.tool-comments-chip--top {
  background: rgba(245, 124, 0, 0.07);
  border-color: rgba(245, 124, 0, 0.14);
  color: rgba(173, 92, 17, 0.76);
}

.tool-comments-chip--load-more {
  background: rgba(25, 118, 210, 0.075);
  border-color: rgba(25, 118, 210, 0.16);
  color: rgba(25, 118, 210, 0.86);
}

.tool-comments-chip:disabled,
.tool-comments-load-more-toolbar:disabled {
  cursor: default;
  opacity: 0.58;
}

.tool-comments-chip--active {
  background: rgba(25, 118, 210, 0.12);
  border-color: rgba(25, 118, 210, 0.22);
  color: rgba(25, 118, 210, 0.92);
}

.tool-comments-chip.tool-comments-chip--filter.tool-comments-chip--active {
  background: rgba(25, 118, 210, 0.12);
  border-color: rgba(25, 118, 210, 0.22);
  color: rgba(25, 118, 210, 0.92);
}

.tool-comments-chip--fold.tool-comments-chip--active,
.tool-comments-chip--expand.tool-comments-chip--active {
  background: rgba(0, 150, 136, 0.12);
  border-color: rgba(0, 150, 136, 0.24);
  color: rgba(0, 121, 107, 0.92);
}

.tool-comments-chip--small {
  min-height: 21px;
  padding: 0 7px;
  font-size: 10.5px;
}

.tool-comments-top-chip {
  margin-left: 0;
  min-width: 66px;
}

.tool-comments-load-more-toolbar {
  min-width: 74px;
}

.tool-comments-download-json {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  min-height: 24px;
  min-width: 82px;
  padding: 0 8px 0 7px;
  border: 1px solid rgba(25, 118, 210, 0.16);
  border-radius: 6px;
  background: rgba(25, 118, 210, 0.08);
  color: rgba(25, 118, 210, 0.9);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(25, 118, 210, 0.13);
    border-color: rgba(25, 118, 210, 0.24);
  }
}

.tool-comments-download-json :deep(.q-icon) {
  width: 12px;
  min-width: 12px;
  margin-left: -1px;
  line-height: 1;
}

.tool-comments-visual {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(62vh, 680px);
  overflow: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  contain: layout paint style;
}

.tool-call-container * {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.22) transparent;
}

.tool-call-container *::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.tool-call-container *::-webkit-scrollbar-track {
  background: transparent;
}

.tool-call-container *::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.22);
  background-clip: padding-box;
}

.tool-comments-video {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.tool-comments-video-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  border-radius: 6px;
  background:
    linear-gradient(90deg, rgba(25, 118, 210, 0.075), rgba(25, 118, 210, 0.018)),
    rgba(128, 128, 128, 0.025);
}

.tool-comments-video-title-block {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  min-width: 0;
  gap: 6px;
}

.tool-comments-video-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(32, 91, 154, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(520px, 52vw);
}

.tool-comments-video-owner {
  font-size: 11px;
  color: rgba(92, 107, 125, 0.68);
}

.tool-comments-video-meta {
  font-size: 11px;
  opacity: 0.48;
}

.tool-comments-tree {
  display: flex;
  flex-direction: column;
  gap: 10px;
  contain: layout paint style;
}

.tool-comment-root {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 0 0 10px;
  border-left: 2px solid rgba(128, 128, 128, 0.13);
  border-radius: 6px;
  contain: layout paint style;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.tool-comments-tree--single-video .tool-comment-root {
  padding-left: 0;
  border-left: 0;
}

.tool-comment--highlighted {
  background: rgba(25, 118, 210, 0.08);
  box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.08);
}

.tool-comment-row,
.tool-comment-reply {
  min-width: 0;
  border-radius: 6px;
}

.tool-comment-main,
.tool-comment-reply {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-comment-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.tool-comment-author {
  font-size: 12px;
  line-height: 1.35;
  font-weight: 700;
  color: #1e6bb8;
  opacity: 0.92;
  text-decoration: none;
}

a.tool-comment-author:hover {
  text-decoration: underline;
}

.tool-comment-time {
  font-size: 11px;
  line-height: 1.35;
  color: rgba(92, 107, 125, 0.78);
}

.tool-comment-like {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 3px;
  height: 14px;
  font-size: 11px;
  line-height: 14px;
  color: rgba(214, 72, 122, 0.86);
}

.tool-comment-like :deep(.q-icon) {
  line-height: 1;
  transform: translateY(1px);
}

.tool-comment-author-tag {
  display: inline-flex;
  align-items: center;
  align-self: center;
  height: 16px;
  padding: 0 5px;
  border: 1px solid rgba(109, 120, 133, 0.13);
  border-radius: 4px;
  background: rgba(109, 120, 133, 0.075);
  color: rgba(72, 84, 98, 0.78);
  font-size: 10px;
  line-height: 16px;
  font-weight: 650;
}

.tool-comment-author-tag--layer-owner {
  background: rgba(0, 150, 136, 0.09);
  border-color: rgba(0, 150, 136, 0.16);
  color: rgba(0, 121, 107, 0.82);
}

.tool-comment-author-tag--video-owner {
  background: rgba(245, 124, 0, 0.09);
  border-color: rgba(245, 124, 0, 0.16);
  color: rgba(173, 92, 17, 0.86);
}

.tool-comment-reply-target {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  line-height: 1.35;
  color: rgba(85, 99, 116, 0.72);
}

.tool-comment-reply-word {
  appearance: none;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: #1976d2;
  font: inherit;
  font-weight: 650;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.tool-comment-badge {
  font-size: 10px;
  line-height: 1.3;
  padding: 1px 5px;
  border-radius: 999px;
  color: #1976d2;
  background: rgba(25, 118, 210, 0.1);
}

.tool-comment-jump-button {
  appearance: none;
  min-height: 18px;
  padding: 0 6px;
  border: 1px solid rgba(25, 118, 210, 0.16);
  border-radius: 999px;
  background: rgba(25, 118, 210, 0.06);
  color: rgba(25, 118, 210, 0.9);
  font-size: 10.5px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: rgba(25, 118, 210, 0.12);
    border-color: rgba(25, 118, 210, 0.24);
  }
}

.tool-comment-content {
  font-size: 13px;
  line-height: 1.55;
  opacity: 0.86;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-comment-read-more {
  appearance: none;
  align-self: flex-start;
  margin-top: -1px;
  padding: 1px 6px;
  border: 1px solid rgba(109, 120, 133, 0.12);
  border-radius: 999px;
  background: rgba(109, 120, 133, 0.045);
  color: rgba(92, 107, 125, 0.7);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;

  &:hover {
    background: rgba(25, 118, 210, 0.055);
    border-color: rgba(25, 118, 210, 0.12);
    color: rgba(25, 118, 210, 0.68);
  }
}

.tool-comment-read-more--reference {
  font-size: 11px;
}

.tool-comment-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.tool-comment-image-thumb {
  appearance: none;
  width: 74px;
  height: 74px;
  padding: 0;
  border: 1px solid rgba(128, 128, 128, 0.14);
  border-radius: 6px;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.05);
  cursor: zoom-in;
  transition: border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: rgba(25, 118, 210, 0.3);
    transform: translateY(-1px);
  }
}

.tool-comment-image-thumb--failed {
  cursor: default;
  background:
    linear-gradient(135deg, rgba(128, 128, 128, 0.08), rgba(128, 128, 128, 0.14));
}

.tool-comment-image-thumb--failed::after {
  content: "图片加载失败";
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 6px;
  color: rgba(92, 107, 125, 0.62);
  font-size: 10px;
  line-height: 1.25;
  text-align: center;
}

.tool-comment-image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tool-comment-image-thumb--failed img {
  display: none;
}

.tool-comment-reference {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 3px;
  padding: 7px 9px;
  border-left: 3px solid rgba(25, 118, 210, 0.22);
  border-radius: 6px;
  background: rgba(25, 118, 210, 0.045);
}

.tool-comment-reference-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-comment-reference-author {
  font-size: 11px;
  font-weight: 700;
  color: #1e6bb8;
}

.tool-comment-reference-time,
.tool-comment-reference-like {
  font-size: 10.5px;
  color: rgba(92, 107, 125, 0.72);
}

.tool-comment-reference-content {
  font-size: 12px;
  line-height: 1.48;
  color: rgba(50, 62, 76, 0.82);
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-comment-replies {
  --reply-indent: 16px;
  --reply-line-x: 6px;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 7px;
  padding-left: var(--reply-indent);
}

.tool-comment-replies--expanded::before {
  content: "";
  position: absolute;
  left: var(--reply-line-x);
  top: 22px;
  bottom: 0;
  border-left: 1px dashed rgba(128, 128, 128, 0.16);
  pointer-events: none;
}

.tool-comment-replies-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.tool-comment-replies-toggle {
  appearance: none;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 2px;
  min-width: 0;
  min-height: 22px;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 11px;
  line-height: 1;
  opacity: 0.58;
  cursor: pointer;
}

.tool-comment-replies-toggle:hover {
  opacity: 0.82;
}

.tool-comment-replies-toggle-icon {
  width: 14px;
  min-width: 14px;
  height: 15px;
  margin-left: calc(var(--reply-line-x) - var(--reply-indent) - 7px);
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 15px !important;
  line-height: 15px;
  transform: translateY(-1px);
}

.tool-comments-render-more {
  display: flex;
  justify-content: center;
  padding: 4px 0 2px;
}

.tool-comments-render-more-button {
  appearance: none;
  min-height: 26px;
  padding: 0 12px;
  border: 1px solid rgba(128, 128, 128, 0.14);
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.045);
  color: rgba(65, 78, 94, 0.68);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(25, 118, 210, 0.075);
    border-color: rgba(25, 118, 210, 0.16);
    color: rgba(25, 118, 210, 0.82);
  }
}

.tool-comments-sort--small select {
  height: 21px;
  min-width: 74px;
  max-width: 78px;
  padding-left: 6px;
  font-size: 10.5px;
}

.tool-comment-reply-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-comment-reply-list--preview {
  margin-top: -2px;
}

.tool-comment-reply--preview {
  opacity: 0.88;
}

body.body--dark .tool-comment-author,
body.body--dark .tool-comment-reference-author {
  color: #90caf9;
}

body.body--dark .tool-call-header,
body.body--dark .tool-comments-toolbar {
  background: rgba(18, 22, 28, 0.96);
}

body.body--dark .tool-call-container * {
  scrollbar-color: rgba(144, 202, 249, 0.24) rgba(18, 22, 28, 0.28);
}

body.body--dark .tool-call-container *::-webkit-scrollbar-track {
  background: rgba(18, 22, 28, 0.28);
}

body.body--dark .tool-call-container *::-webkit-scrollbar-thumb {
  border-color: rgba(18, 22, 28, 0.28);
  background: rgba(144, 202, 249, 0.24);
  background-clip: padding-box;
}

body.body--dark .tool-call-container *::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 202, 249, 0.34);
  background-clip: padding-box;
}

body.body--dark .tool-comments-video-owner {
  color: rgba(209, 217, 224, 0.58);
}

body.body--dark .tool-comments-video-header {
  background:
    linear-gradient(90deg, rgba(144, 202, 249, 0.11), rgba(144, 202, 249, 0.025)),
    rgba(255, 255, 255, 0.035);
}

body.body--dark .tool-comments-video-title {
  color: rgba(144, 202, 249, 0.96);
}

body.body--dark .tool-comment-time,
body.body--dark .tool-comment-reply-target,
body.body--dark .tool-comment-reference-time,
body.body--dark .tool-comment-reference-like {
  color: rgba(209, 217, 224, 0.58);
}

body.body--dark .tool-comment-like {
  color: rgba(244, 143, 177, 0.82);
}

body.body--dark .tool-comment-author-tag {
  background: rgba(209, 217, 224, 0.075);
  border-color: rgba(209, 217, 224, 0.12);
  color: rgba(209, 217, 224, 0.68);
}

body.body--dark .tool-comment-author-tag--layer-owner {
  background: rgba(77, 182, 172, 0.12);
  border-color: rgba(77, 182, 172, 0.18);
  color: rgba(128, 218, 208, 0.82);
}

body.body--dark .tool-comment-author-tag--video-owner {
  background: rgba(255, 183, 77, 0.12);
  border-color: rgba(255, 183, 77, 0.18);
  color: rgba(255, 202, 119, 0.82);
}

body.body--dark .tool-comment-jump-button {
  background: rgba(144, 202, 249, 0.09);
  border-color: rgba(144, 202, 249, 0.18);
  color: #90caf9;
}

body.body--dark .tool-comment-read-more {
  background: rgba(209, 217, 224, 0.05);
  border-color: rgba(209, 217, 224, 0.1);
  color: rgba(209, 217, 224, 0.62);

  &:hover {
    background: rgba(144, 202, 249, 0.08);
    border-color: rgba(144, 202, 249, 0.14);
    color: rgba(144, 202, 249, 0.76);
  }
}

body.body--dark .tool-comment--highlighted {
  background: rgba(144, 202, 249, 0.1);
  box-shadow: 0 0 0 4px rgba(144, 202, 249, 0.08);
}

body.body--dark .tool-comment-reference {
  border-left-color: rgba(144, 202, 249, 0.25);
  background: rgba(144, 202, 249, 0.07);
}

body.body--dark .tool-comment-reference-content {
  color: rgba(235, 238, 242, 0.78);
}

body.body--dark .tool-comments-sort,
body.body--dark .tool-comments-chip,
body.body--dark .tool-comments-render-more-button,
body.body--dark .tool-comments-download-json {
  color: rgba(209, 217, 224, 0.7);
}

body.body--dark .tool-comments-sort select,
body.body--dark .tool-comments-chip,
body.body--dark .tool-comments-render-more-button,
body.body--dark .tool-comments-download-json {
  border-color: rgba(255, 255, 255, 0.11);
}

body.body--dark .tool-comments-sort select {
  background-color: rgba(30, 35, 43, 0.96);
  color: rgba(235, 238, 242, 0.9);
  border-color: rgba(144, 202, 249, 0.18);
  color-scheme: dark;

  &:hover {
    background-color: rgba(38, 44, 54, 0.98);
    border-color: rgba(144, 202, 249, 0.28);
  }

  &:focus {
    border-color: rgba(144, 202, 249, 0.4);
    box-shadow: 0 0 0 2px rgba(144, 202, 249, 0.1);
  }
}

body.body--dark .tool-comments-sort select option {
  background: #202630;
  color: rgba(235, 238, 242, 0.92);
}

body.body--dark .tool-comments-chip {
  background: rgba(255, 255, 255, 0.07);
}

body.body--dark .tool-comments-chip--fold {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(209, 217, 224, 0.12);
  color: rgba(209, 217, 224, 0.7);
}

body.body--dark .tool-comments-chip--expand {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(209, 217, 224, 0.12);
  color: rgba(209, 217, 224, 0.7);
}

body.body--dark .tool-comments-chip--top {
  background: rgba(255, 183, 77, 0.105);
  border-color: rgba(255, 183, 77, 0.18);
  color: rgba(255, 202, 119, 0.82);
}

body.body--dark .tool-comments-chip--load-more {
  background: rgba(144, 202, 249, 0.1);
  border-color: rgba(144, 202, 249, 0.18);
  color: #90caf9;
}

body.body--dark .tool-comments-chip--active {
  background: rgba(144, 202, 249, 0.14);
  border-color: rgba(144, 202, 249, 0.24);
  color: #90caf9;
}

body.body--dark
  .tool-comments-chip.tool-comments-chip--filter.tool-comments-chip--active {
  background: rgba(144, 202, 249, 0.14);
  border-color: rgba(144, 202, 249, 0.24);
  color: #90caf9;
}

body.body--dark .tool-comments-chip--fold.tool-comments-chip--active,
body.body--dark .tool-comments-chip--expand.tool-comments-chip--active {
  background: rgba(77, 182, 172, 0.16);
  border-color: rgba(77, 182, 172, 0.28);
  color: rgba(128, 218, 208, 0.92);
}

body.body--dark .tool-comments-render-more-button {
  background: rgba(255, 255, 255, 0.055);

  &:hover {
    background: rgba(144, 202, 249, 0.1);
    border-color: rgba(144, 202, 249, 0.18);
    color: rgba(144, 202, 249, 0.86);
  }
}

body.body--dark .tool-comments-download-json {
  background: rgba(144, 202, 249, 0.1);
  border-color: rgba(144, 202, 249, 0.18);
  color: #90caf9;
}

.tool-comments-empty {
  padding: 8px 10px;
  font-size: 12px;
  opacity: 0.5;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.04);
}

.tool-comments-empty--syncing {
  opacity: 0.78;
  color: rgba(25, 118, 210, 0.86);
  background: rgba(25, 118, 210, 0.055);
}

body.body--dark .tool-comments-empty--syncing {
  color: #90caf9;
  background: rgba(144, 202, 249, 0.08);
}

.tool-comments-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 0 2px;
}

.tool-comments-load-more-button {
  appearance: none;
  min-height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(25, 118, 210, 0.18);
  border-radius: 6px;
  background: rgba(25, 118, 210, 0.08);
  color: rgba(25, 118, 210, 0.92);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(25, 118, 210, 0.12);
    border-color: rgba(25, 118, 210, 0.28);
  }

  &:disabled {
    cursor: default;
    opacity: 0.58;
  }
}

.tool-comments-load-more-error {
  font-size: 11px;
  color: rgba(198, 40, 40, 0.86);
}

.tool-comment-image-overlay {
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  z-index: 7000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: rgba(12, 18, 26, 0.88);
  backdrop-filter: blur(8px);
}

.tool-comment-image-shell {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  width: min(1120px, 100%);
  height: min(calc(100dvh - 48px), 920px);
  max-height: calc(100dvh - 48px);
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(13, 18, 25, 0.94);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.42);
}

.tool-comment-image-toolbar {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.tool-comment-image-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tool-comment-image-toolbar-button {
  box-sizing: border-box;
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(120, 150, 180, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(238, 244, 252, 0.88);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.tool-comment-image-toolbar-button:hover {
  border-color: rgba(92, 174, 236, 0.42);
  background: rgba(73, 135, 190, 0.18);
  color: rgba(255, 255, 255, 0.96);
}

.tool-comment-image-toolbar-button--active {
  border-color: rgba(77, 182, 172, 0.34);
  background: rgba(77, 182, 172, 0.18);
  color: rgba(190, 246, 237, 0.96);
}

.tool-comment-image-zoom {
  flex: 1 1 auto;
  justify-content: center;
}

.tool-comment-image-scale-select {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: 76px;
  height: 30px;
  padding: 0 24px 0 9px;
  border: 1px solid rgba(120, 150, 180, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(180, 220, 250, 0.94);
  font-size: 12px;
  outline: none;
  cursor: pointer;
  color-scheme: dark;
}

.tool-comment-image-scale-select option {
  background: #1d2530;
  color: rgba(238, 244, 252, 0.94);
}

.tool-comment-image-fit {
  min-width: 70px;
  padding-inline: 9px;
}

.tool-comment-image-body {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 58px;
  align-items: stretch;
  gap: 10px;
  min-height: 0;
}

.tool-comment-image-stage {
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  height: 100%;
  margin: 0;
}

.tool-comment-image-frame {
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: safe center;
  justify-content: safe center;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: contain;
  scrollbar-color: rgba(124, 151, 177, 0.42) rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  background: rgba(4, 7, 11, 0.42);
  cursor: default;
  touch-action: none;
  user-select: none;
}

.tool-comment-image-frame:focus,
.tool-comment-image-frame:focus-visible {
  outline: none;
}

.tool-comment-image-frame--zoomed {
  overflow: auto;
  cursor: grab;
}

.tool-comment-image-frame--fit-width {
  overflow-x: hidden;
  overflow-y: auto;
}

.tool-comment-image-frame--panning {
  cursor: grabbing;
}

.tool-comment-image-counter {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 20px);
  transform: translateX(-50%);
  pointer-events: none;
}

.tool-comment-image-counter span {
  padding: 4px 8px;
  border: 1px solid rgba(144, 202, 249, 0.18);
  border-radius: 999px;
  background: rgba(10, 18, 28, 0.76);
  color: rgba(230, 240, 250, 0.9);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.tool-comment-image-frame img {
  flex: 0 0 auto;
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.36);
  transform-origin: center center;
  cursor: default;
  user-select: none;
}

.tool-comment-image-info {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 0;
  max-height: 22vh;
  padding: 10px 12px;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.045);
}

.tool-comment-image-meta {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  color: rgba(218, 231, 245, 0.76);
  font-size: 12px;
}

.tool-comment-image-author {
  color: rgba(118, 193, 243, 0.96);
  font-weight: 650;
}

.tool-comment-image-jump {
  appearance: none;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid rgba(92, 174, 236, 0.24);
  border-radius: 999px;
  background: rgba(92, 174, 236, 0.1);
  color: rgba(144, 202, 249, 0.92);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.tool-comment-image-jump:hover {
  background: rgba(92, 174, 236, 0.16);
  border-color: rgba(92, 174, 236, 0.34);
}

.tool-comment-image-caption {
  color: rgba(244, 248, 252, 0.88);
  font-size: 13px;
  line-height: 1.55;
  text-align: left;
  white-space: pre-wrap;
}

.tool-comment-image-side {
  box-sizing: border-box;
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
}

.tool-comment-image-side span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 54px;
  border-radius: 8px;
  font-size: 34px;
  line-height: 1;
}

.tool-comment-image-side:hover {
  border-color: rgba(92, 174, 236, 0.42);
  background: rgba(73, 135, 190, 0.18);
}

.tool-owner-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.tool-owner-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px;
}

.tool-owner-group-title {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.78;
}

.tool-owner-group-count {
  font-size: 11px;
  opacity: 0.5;
}

.tool-owner-group-error {
  font-size: 12px;
  color: #c62828;
  opacity: 0.82;
}

.tool-owner-results {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.tool-owner-result {
  display: flex;
  min-width: 0;
}

.tool-text-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-text-result-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.tool-text-result-title {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.78;
}

.tool-text-result-submeta {
  font-size: 11px;
  opacity: 0.56;
}

.tool-text-result {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.08);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
  font-size: 12px;
}

.tool-text-result--small-task {
  max-height: min(36vh, 360px);
  overflow-y: auto;
  overflow-anchor: none;
  scrollbar-width: thin;
}

.tool-text-result--small-task-streaming {
  max-height: min(36vh, 360px);
}

.tool-text-result--summary {
  max-height: min(58vh, 560px);
  overflow-y: auto;
  overflow-anchor: none;
  scrollbar-width: thin;
}

.tool-markdown-result {
  white-space: normal;
}

.tool-markdown-result :deep(*) {
  max-width: 100%;
}

.tool-markdown-result :deep(p),
.tool-markdown-result :deep(ul),
.tool-markdown-result :deep(ol),
.tool-markdown-result :deep(blockquote),
.tool-markdown-result :deep(pre) {
  margin: 0 0 7px;
}

.tool-markdown-result :deep(p:last-child),
.tool-markdown-result :deep(ul:last-child),
.tool-markdown-result :deep(ol:last-child),
.tool-markdown-result :deep(blockquote:last-child),
.tool-markdown-result :deep(pre:last-child) {
  margin-bottom: 0;
}

.tool-markdown-result :deep(h1),
.tool-markdown-result :deep(h2),
.tool-markdown-result :deep(h3),
.tool-markdown-result :deep(h4),
.tool-markdown-result :deep(h5),
.tool-markdown-result :deep(h6) {
  margin: 10px 0 6px;
  font-size: inherit;
  line-height: inherit;
  font-weight: 700;
}

.tool-markdown-result :deep(h1:first-child),
.tool-markdown-result :deep(h2:first-child),
.tool-markdown-result :deep(h3:first-child),
.tool-markdown-result :deep(h4:first-child),
.tool-markdown-result :deep(h5:first-child),
.tool-markdown-result :deep(h6:first-child) {
  margin-top: 0;
}

.tool-markdown-result :deep(ul),
.tool-markdown-result :deep(ol) {
  padding-left: 18px;
}

.tool-markdown-result :deep(li + li) {
  margin-top: 3px;
}

.tool-markdown-result :deep(a) {
  color: #1976d2;
  text-decoration: none;
  font-weight: 600;
}

.tool-markdown-result :deep(a:hover) {
  text-decoration: underline;
}

.tool-markdown-result :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.12);
  font-size: 0.95em;
}

.tool-markdown-result :deep(pre) {
  padding: 8px 10px;
  overflow-x: auto;
  white-space: pre;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.08);
}

.tool-markdown-result :deep(pre code) {
  padding: 0;
  background: transparent;
}

.tool-markdown-result :deep(blockquote) {
  padding-left: 10px;
  border-left: 3px solid rgba(128, 128, 128, 0.24);
  opacity: 0.82;
}

.tool-result-error {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(198, 40, 40, 0.08);
  color: #c62828;
  font-size: 13px;
  line-height: 1.5;
}

.tool-generic-result {
  min-width: 0;
}

.tool-generic-json {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.08);
}

.tool-transcript-text {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid rgba(128, 128, 128, 0.08);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 12px;
}

.tool-owner-mini-ref {
  display: flex;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.08);
  background: rgba(128, 128, 128, 0.025);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.05);
    border-color: rgba(128, 128, 128, 0.12);
    text-decoration: none;
  }
}

.tool-owner-mini-ref--disabled {
  opacity: 0.78;
}

.tool-owner-mini-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tool-owner-mini-name {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  font-size: 14px;
  line-height: 1.42;
  font-weight: 600;
  opacity: 0.9;
}

.tool-owner-mini-mid {
  font-size: 12px;
  line-height: 1.42;
  opacity: 0.62;
}

@media (max-width: 780px) {
  .tool-owner-results {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .tool-owner-results {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 460px) {
  .tool-owner-results {
    grid-template-columns: minmax(0, 1fr);
  }

  .tool-owner-mini-ref {
    padding: 7px 8px;
  }

  .tool-owner-mini-name {
    font-size: 13px;
  }

  .tool-owner-mini-mid {
    font-size: 11px;
  }
}

.tool-google-result {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(25, 118, 210, 0.12);
  text-decoration: none;
  color: inherit;
  background: linear-gradient(
    135deg,
    rgba(25, 118, 210, 0.055),
    rgba(255, 255, 255, 0.02)
  );
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.035);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: rgba(25, 118, 210, 0.25);
    background: linear-gradient(
      135deg,
      rgba(25, 118, 210, 0.085),
      rgba(255, 255, 255, 0.035)
    );
    box-shadow: 0 5px 16px rgba(0, 0, 0, 0.07);
    transform: translateY(-1px);
  }
}

.tool-google-result-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.tool-google-result-source {
  font-size: 11px;
  font-weight: 600;
  color: #1976d2;
  opacity: 0.86;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-google-result-open {
  color: #1976d2;
  opacity: 0.55;
  flex-shrink: 0;
}

.tool-google-result-title {
  font-size: 13.5px;
  line-height: 1.35;
  font-weight: 650;
  opacity: 0.92;
}

.tool-google-result-snippet {
  font-size: 12.5px;
  line-height: 1.5;
  opacity: 0.68;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

body.body--dark .tool-google-result {
  border-color: rgba(144, 202, 249, 0.14);
  background: linear-gradient(
    135deg,
    rgba(144, 202, 249, 0.075),
    rgba(255, 255, 255, 0.025)
  );
  box-shadow: none;

  &:hover {
    border-color: rgba(144, 202, 249, 0.28);
    background: linear-gradient(
      135deg,
      rgba(144, 202, 249, 0.11),
      rgba(255, 255, 255, 0.04)
    );
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  }
}

body.body--dark .tool-google-result-source,
body.body--dark .tool-google-result-open {
  color: #90caf9;
}

.tool-result-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  font-size: 12px;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.03);
  transition: background 0.15s ease;

  &:hover {
    background: rgba(128, 128, 128, 0.08);
    opacity: 0.68;
  }
}

/* 作者查询结果 */
.tool-result-author-info {
  padding: 4px 0;
}

.author-found {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  font-size: 13px;
  font-weight: 500;
}

.author-mid {
  font-size: 11px;
  opacity: 0.45;
}

.author-not-found {
  font-size: 12px;
  opacity: 0.5;
  font-style: italic;
}

/* 在新窗口中查看按钮（header 中） */
.tool-view-all-btn {
  font-size: 11px !important;
  min-height: 22px;
  padding: 0 2px;
  color: inherit;
  opacity: 0.46;
  &:hover {
    opacity: 0.68;
  }
}

/* 底部收起栏 */
.tool-result-collapse-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  margin-top: 4px;
  border-top: 1px dashed rgba(128, 128, 128, 0.08);
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: 0 0 6px 6px;

  &:hover {
    background: rgba(128, 128, 128, 0.04);
  }
}

.collapse-bar-icon {
  opacity: 0.35;
  transition: opacity 0.15s ease;

  .tool-result-collapse-bar:hover & {
    opacity: 0.6;
  }
}

@media (max-width: 620px), (pointer: coarse) {
  .tool-call-container {
    gap: 3px;
    margin: 4px 0;
  }

  .tool-call-item {
    border-radius: 7px;
  }

  .tool-call-header {
    min-height: 30px;
    padding: 5px 8px;
    cursor: pointer;
  }

  .tool-call-left {
    gap: 4px;
  }

  .tool-call-name {
    font-size: 11px;
    line-height: 1.2;
  }

  .tool-call-args,
  .tool-call-args-full,
  .tool-query-list {
    display: none !important;
  }

  .tool-call-results {
    padding: 5px 8px 8px;
  }

  .tool-text-result--small-task,
  .tool-text-result--small-task-streaming {
    max-height: min(34vh, 300px);
  }

  .tool-text-result--summary {
    max-height: min(52vh, 420px);
    overflow-y: auto;
  }

  .tool-results-grid {
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
    gap: 6px;
    max-height: 360px;
  }

  .tool-comments-toolbar {
    align-items: center;
    flex-direction: row;
    gap: 6px;
  }

  .tool-comments-toolbar-meta {
    white-space: normal;
  }

  .tool-comments-controls {
    margin-left: 0;
  }

  .tool-comments-toolbar-actions {
    margin-left: auto;
  }

  .tool-comments-download-json,
  .tool-comments-top-chip {
    width: auto;
    flex: 0 0 auto;
  }

  .tool-comments-visual {
    max-height: 58vh;
  }

  .tool-comment-root {
    padding-left: 8px;
  }

  .tool-comment-replies {
    --reply-indent: 16px;
    --reply-line-x: 6px;
    margin-left: 7px;
    padding-left: var(--reply-indent);
  }

  .tool-comment-image-overlay {
    padding: 10px;
  }

  .tool-comment-image-shell {
    height: calc(100dvh - 20px);
    max-height: calc(100dvh - 20px);
    gap: 8px;
    padding: 8px;
    border-radius: 10px;
  }

  .tool-comment-image-toolbar {
    flex-wrap: wrap;
    gap: 7px;
  }

  .tool-comment-image-toolbar-group {
    gap: 6px;
  }

  .tool-comment-image-zoom {
    order: 3;
    flex-basis: 100%;
  }

  .tool-comment-image-body {
    grid-template-columns: 38px minmax(0, 1fr) 38px;
    gap: 6px;
  }

  .tool-comment-image-side span {
    width: 28px;
    height: 42px;
    font-size: 28px;
  }

  .tool-comment-image-counter {
    top: 8px;
    gap: 4px;
  }

  .tool-comment-image-counter span {
    padding: 3px 6px;
    font-size: 11px;
  }

  .tool-comment-image-scale-select {
    width: 74px;
  }

  .tool-comment-image-info {
    max-height: 26vh;
    padding: 8px 9px;
  }

  .per-query-header {
    margin-bottom: 3px;
  }

  .tool-call-right {
    gap: 3px;
    margin-left: 6px;
  }

  .tool-call-status-pending,
  .tool-call-status-streaming,
  .tool-call-status-aborted,
  .tool-call-status-completed {
    font-size: 10px;
    white-space: nowrap;
  }

  .tool-view-all-btn {
    min-width: 46px !important;
    min-height: 24px !important;
    padding: 0 4px !important;
    font-size: 10px !important;
  }
}

/* Dark theme */
body.body--dark {
  .tool-call-pending {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.07);
  }

  .tool-call-completed {
    background: rgba(255, 255, 255, 0.015);
    border-color: rgba(255, 255, 255, 0.06);
  }

  .tool-call-header:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .tool-result-item {
    background: rgba(255, 255, 255, 0.02);
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .tool-google-result {
    background: rgba(255, 255, 255, 0.02);

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .tool-result-more {
    background: rgba(255, 255, 255, 0.02);
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
