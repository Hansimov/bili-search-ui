<template>
  <div ref="containerRef" class="tool-call-container">
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
                v-html="renderSmallTaskMarkdown(call)"
              ></div>
              <pre
                v-else
                class="tool-text-result"
                :class="getSmallTaskResultClasses(call)"
                @wheel="handleSmallTaskWheel($event, idx)"
                >{{ getSmallTaskResultText(call) }}</pre
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
                <div class="tool-comments-toolbar-meta">
                  {{ getVideoCommentsToolbarText(call) }}
                </div>
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
                    class="tool-comments-chip"
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
                    class="tool-comments-chip"
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
                    class="tool-comments-chip"
                    @click.stop="scrollCommentsToTop(idx)"
                  >
                    回到顶部
                  </button>
                  <button
                    type="button"
                    class="tool-comments-chip"
                    @click.stop="setAllCommentRootsCollapsed(idx, call, true)"
                  >
                    折叠楼层
                  </button>
                  <button
                    type="button"
                    class="tool-comments-chip"
                    @click.stop="setAllCommentRootsCollapsed(idx, call, false)"
                  >
                    展开楼层
                  </button>
                </div>
                <div class="tool-comments-view-toggle" @click.stop>
                  <q-btn
                    flat
                    dense
                    no-caps
                    size="sm"
                    label="可视化"
                    :class="{
                      'tool-comments-view-toggle-active':
                        getCommentRenderMode(idx, call) === 'visual',
                    }"
                    @click.stop="setCommentRenderMode(idx, call, 'visual')"
                  />
                  <q-btn
                    flat
                    dense
                    no-caps
                    size="sm"
                    label="纯JSON"
                    :class="{
                      'tool-comments-view-toggle-active':
                        getCommentRenderMode(idx, call) === 'json',
                    }"
                    @click.stop="setCommentRenderMode(idx, call, 'json')"
                  />
                </div>
              </div>

              <div
                v-if="getCommentRenderMode(idx, call) === 'visual'"
                class="tool-comments-visual"
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
                    v-if="getVisibleVideoCommentTree(idx, call, item).length"
                    class="tool-comments-tree"
                    :class="{
                      'tool-comments-tree--single-video':
                        isSingleVideoCommentsResult(call),
                    }"
                  >
                    <div
                      v-for="root in getVisibleVideoCommentTree(idx, call, item)"
                      :key="getCommentId(root)"
                      class="tool-comment-root"
                      :class="{
                        'tool-comment--highlighted':
                          isCommentHighlighted(idx, item, root),
                      }"
                      :data-comment-id="getCommentId(root)"
                    >
                      <div class="tool-comment-row">
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
                            >
                              {{ tag }}
                            </span>
                            <span class="tool-comment-time">{{
                              getCommentTime(root)
                            }}</span>
                            <span class="tool-comment-like">
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
                            {{ getCommentMessage(root) }}
                          </div>
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
                                openCommentImageViewer(call, root, pidx)
                              "
                            >
                              <img
                                :src="getCommentPictureUrl(picture)"
                                :data-fallback-src="
                                  getCommentPictureFallbackUrl(picture)
                                "
                                alt=""
                                loading="eager"
                                decoding="async"
                                referrerpolicy="no-referrer"
                                @error="handleCommentPictureError"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="root.replies.length"
                        class="tool-comment-replies"
                      >
                        <div class="tool-comment-replies-actions">
                          <q-btn
                            flat
                            dense
                            no-caps
                            size="sm"
                            :icon="
                              isCommentRootCollapsed(idx, item, root)
                                ? 'chevron_right'
                                : 'expand_more'
                            "
                            :label="
                              isCommentRootCollapsed(idx, item, root)
                                ? `展开 ${getVisibleCommentReplies(idx, root).length} 条回复${getMaxReplyLikeSuffix(root)}`
                                : `收起 ${getVisibleCommentReplies(idx, root).length} 条回复`
                            "
                            class="tool-comment-replies-toggle"
                            @click.stop="toggleCommentRoot(idx, item, root)"
                          />
                          <button
                            type="button"
                            class="tool-comments-chip tool-comments-chip--small"
                            :class="{
                              'tool-comments-chip--active':
                                isCommentLayerOwnerFilterActive(idx, root),
                            }"
                            @click.stop="toggleCommentLayerOwnerFilter(idx, root)"
                          >
                            仅看层主回复
                          </button>
                          <button
                            type="button"
                            class="tool-comments-chip tool-comments-chip--small"
                            :class="{
                              'tool-comments-chip--active':
                                isCommentLayerLikedFilterActive(idx, root),
                            }"
                            @click.stop="toggleCommentLayerLikedFilter(idx, root)"
                          >
                            仅看有赞
                          </button>
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
                              <option value="default">默认</option>
                              <option value="hot">热度</option>
                              <option value="time_asc">时间正序</option>
                              <option value="time_desc">时间逆序</option>
                            </select>
                          </label>
                        </div>
                        <div
                          v-show="!isCommentRootCollapsed(idx, item, root)"
                          class="tool-comment-reply-list"
                        >
                          <div
                            v-for="reply in getVisibleCommentReplies(idx, root)"
                            :key="getCommentId(reply)"
                            class="tool-comment-reply"
                            :class="{
                              'tool-comment--highlighted':
                                isCommentHighlighted(idx, item, reply),
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
                              {{ getCommentMessage(reply) }}
                            </div>
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
                                  openCommentImageViewer(call, reply, pidx)
                                "
                              >
                                <img
                                  :src="getCommentPictureUrl(picture)"
                                  :data-fallback-src="
                                    getCommentPictureFallbackUrl(picture)
                                  "
                                  alt=""
                                  loading="eager"
                                  decoding="async"
                                  referrerpolicy="no-referrer"
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
                                  getCommentMessage(
                                    getReferencedComment(reply, root)
                                  )
                                }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="tool-comments-empty">
                    当前没有可展示的评论。
                  </div>
                </div>
              </div>

              <pre v-else class="tool-generic-json">{{
                formatGenericResult(call)
              }}</pre>
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
    <button
      type="button"
      class="tool-comment-image-nav tool-comment-image-nav--prev"
      @click.stop="showPreviousCommentImage"
    >
      ‹
    </button>
    <figure class="tool-comment-image-stage">
      <img :src="getActiveCommentImage()?.url" alt="" />
      <figcaption class="tool-comment-image-meta">
        <span>
          {{ getCommentAuthor(getActiveCommentImageComment()) }}
        </span>
        <span>{{ getCommentTime(getActiveCommentImageComment()) }}</span>
        <span>
          {{ commentImageViewer.index + 1 }} /
          {{ commentImageViewer.images.length }}
        </span>
      </figcaption>
      <div class="tool-comment-image-caption">
        {{ getCommentMessage(getActiveCommentImageComment()) }}
      </div>
    </figure>
    <button
      type="button"
      class="tool-comment-image-nav tool-comment-image-nav--next"
      @click.stop="showNextCommentImage"
    >
      ›
    </button>
    <button
      type="button"
      class="tool-comment-image-close"
      @click.stop="closeCommentImageViewer"
    >
      关闭
    </button>
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
  summary?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
  comments?: VideoComment[];
  groups?: Record<string, VideoComment[]>;
}

type CommentRenderMode = 'visual' | 'json';
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

interface CommentImageEntry {
  url: string;
  comment: VideoComment;
  bvid: string;
}

interface CommentImageViewerState {
  open: boolean;
  images: CommentImageEntry[];
  index: number;
}

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

export default defineComponent({
  name: 'ToolCallDisplay',
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
  setup(props) {
    const containerRef = ref<HTMLElement | null>(null);
    const expanded = ref<Record<number, boolean>>({});
    const commentRenderModes = ref<Record<string, CommentRenderMode>>({});
    const commentSortModes = ref<Record<string, CommentSortMode>>({});
    const commentFilters = ref<Record<string, CommentFilterState>>({});
    const commentLayerFilters = ref<Record<string, CommentLayerFilterState>>({});
    const collapsedCommentRoots = ref<Record<string, boolean>>({});
    const expandedCommentReferences = ref<Record<string, boolean>>({});
    const commentReturnTargets = ref<Record<string, string>>({});
    const highlightedComments = ref<Record<string, boolean>>({});
    const commentImageViewer = ref<CommentImageViewerState>({
      open: false,
      images: [],
      index: 0,
    });
    const previousStatuses = ref<Record<number, string | undefined>>({});
    const isCompactToolDisplay = ref(false);
    let compactMediaQuery: MediaQueryList | null = null;
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

    const getCommentRenderMode = (
      idx: number,
      call: ToolCall
    ): CommentRenderMode =>
      commentRenderModes.value[getCommentModeKey(idx, call)] || 'visual';

    const setCommentRenderMode = (
      idx: number,
      call: ToolCall,
      mode: CommentRenderMode
    ) => {
      commentRenderModes.value[getCommentModeKey(idx, call)] = mode;
    };

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
      root: VideoComment
    ) => {
      const filters = getCommentLayerFilters(idx, root);
      filters.ownerOnly = !filters.ownerOnly;
    };

    const toggleCommentLayerLikedFilter = (
      idx: number,
      root: VideoComment
    ) => {
      const filters = getCommentLayerFilters(idx, root);
      filters.likedOnly = !filters.likedOnly;
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
        const result = call.result as Record<string, unknown>;
        const items = Array.isArray(result?.items)
          ? (result.items as Array<Record<string, unknown>>)
          : [];
        const count = items.reduce((sum, item) => {
          const comments = Array.isArray(item.comments)
            ? item.comments.length
            : 0;
          const groups = item.groups as Record<string, unknown> | undefined;
          const grouped = groups
            ? Object.values(groups).reduce<number>(
                (groupSum, value) =>
                  groupSum + (Array.isArray(value) ? value.length : 0),
                0
              )
            : 0;
          return sum + Math.max(comments, grouped);
        }, 0);
        return count ? `${count} 条评论` : String(result?.status || '已读取');
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

    const getSmallTaskResultText = (call: ToolCall): string => {
      const resultText = String(getSmallTaskResult(call)?.result || '').trim();
      if (resultText) {
        return resultText;
      }
      if (call.status === 'streaming') {
        return '小模型已开始处理，等待首批内容...';
      }
      return '';
    };

    const shouldRenderSmallTaskMarkdown = (call: ToolCall): boolean =>
      call.type === 'summarize_transcript' || call.type === 'ask_transcript';

    const renderSmallTaskMarkdown = (call: ToolCall): string =>
      renderMarkdown(getSmallTaskResultText(call));

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

    const getVideoCommentItems = (call: ToolCall): VideoCommentsItem[] => {
      if (!isVideoCommentsTool(call) || !call.result) return [];
      const result = call.result as Record<string, unknown>;
      if (Array.isArray(result.items)) {
        return result.items as VideoCommentsItem[];
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
        ];
      }
      return [];
    };

    const getCommentId = (comment: VideoComment): string =>
      String(comment.rpid || `${comment.ctime || ''}:${getCommentMessage(comment)}`);

    const stripOfficialReplyPrefix = (message: string): string =>
      message.replace(/^回复\s*@[^:：]+?\s*[:：]\s*/, '').trim();

    const getCommentMessage = (comment: VideoComment): string =>
      stripOfficialReplyPrefix(String(comment.content?.message || '').trim());

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
      getRenderableImageUrl(
        String(picture.url || picture.src || picture.img_src || '').trim()
      );

    const getCommentPictureFallbackUrl = (
      picture: VideoCommentPicture
    ): string =>
      normalizeRemoteImageUrl(
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

      return roots;
    };

    const commentHeatScore = (comment: VideoCommentNode | VideoComment): number =>
      (comment.is_top ? 1_000_000_000_000 : 0) +
      (comment.is_hot ? 1_000_000_000 : 0) +
      getCommentLikeValue(comment) * 10_000 +
      Number((comment as VideoCommentNode).replies?.length || 0) * 100 +
      Number(comment.ctime || 0);

    const sortComments = <T extends VideoComment>(
      comments: T[],
      mode: CommentSortMode
    ): T[] => {
      if (mode === 'default') return comments;
      const sorted = [...comments];
      if (mode === 'hot') {
        return sorted.sort((a, b) => commentHeatScore(b) - commentHeatScore(a));
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
      collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] || false;

    const toggleCommentRoot = (
      idx: number,
      item: VideoCommentsItem,
      root: VideoCommentNode
    ) => {
      const key = getCommentRootKey(idx, item, root);
      collapsedCommentRoots.value[key] = !collapsedCommentRoots.value[key];
    };

    const getVisibleCommentReplies = (
      idx: number,
      root: VideoCommentNode
    ): VideoComment[] => {
      const filters = getCommentLayerFilters(idx, root);
      const rootMid = String(root.member?.mid || '').trim();
      const replies = root.replies.filter((reply) => {
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
      return sortComments(replies, filters.sortMode);
    };

    const getMaxReplyLikeValue = (root: VideoCommentNode): number =>
      root.replies.reduce(
        (maxValue, reply) => Math.max(maxValue, getCommentLikeValue(reply)),
        0
      );

    const getMaxReplyLikeSuffix = (root: VideoCommentNode): string => {
      const value = getMaxReplyLikeValue(root);
      return value > 0 ? ` · 最高赞 ${getCommentLikeText({ like: value })}` : '';
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

    const scrollCommentElementToCenter = (
      element: HTMLElement,
      container: HTMLElement
    ) => {
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const elementCenter = elementRect.top + elementRect.height / 2;
      const containerCenter = containerRect.top + container.clientHeight / 2;
      const delta = elementCenter - containerCenter;
      container.scrollTo({
        top: container.scrollTop + delta,
        behavior: 'smooth',
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
      const root = findCommentRootForId(item, commentId);
      if (root) {
        collapsedCommentRoots.value[getCommentRootKey(idx, item, root)] = false;
      }
      nextTick(() => {
        const element = getCommentElement(idx, item, commentId);
        const container = getCommentScrollContainer(idx, item, commentId);
        if (element && container) {
          scrollCommentElementToCenter(element, container);
          markCommentHighlighted(idx, item, commentId);
        } else if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    const collectCommentImages = (call: ToolCall): CommentImageEntry[] => {
      const images: CommentImageEntry[] = [];
      getVideoCommentItems(call).forEach((item) => {
        getVideoCommentTree(item).forEach((root) => {
          [root, ...root.replies].forEach((comment) => {
            getCommentPictures(comment).forEach((picture) => {
              const url = getCommentPictureUrl(picture);
              if (!url) return;
              images.push({
                url,
                comment,
                bvid: String(item.bvid || ''),
              });
            });
          });
        });
      });
      return images;
    };

    const openCommentImageViewer = (
      call: ToolCall,
      comment: VideoComment,
      pictureIndex: number
    ) => {
      const currentPictures = getCommentPictures(comment);
      const currentUrl = getCommentPictureUrl(currentPictures[pictureIndex] || {});
      const images = collectCommentImages(call);
      const currentCommentId = getCommentId(comment);
      const index = Math.max(
        images.findIndex(
          (entry) =>
            getCommentId(entry.comment) === currentCommentId &&
            entry.url === currentUrl
        ),
        0
      );
      commentImageViewer.value = {
        open: true,
        images: images.length
          ? images
          : currentUrl
          ? [{ url: currentUrl, comment, bvid: '' }]
          : [],
        index,
      };
    };

    const getActiveCommentImage = (): CommentImageEntry | null => {
      if (!commentImageViewer.value.open) return null;
      return commentImageViewer.value.images[commentImageViewer.value.index] || null;
    };

    const getActiveCommentImageComment = (): VideoComment =>
      getActiveCommentImage()?.comment || {};

    const closeCommentImageViewer = () => {
      commentImageViewer.value = { open: false, images: [], index: 0 };
    };

    const showPreviousCommentImage = () => {
      const length = commentImageViewer.value.images.length;
      if (!length) return;
      commentImageViewer.value.index =
        (commentImageViewer.value.index - 1 + length) % length;
    };

    const showNextCommentImage = () => {
      const length = commentImageViewer.value.images.length;
      if (!length) return;
      commentImageViewer.value.index = (commentImageViewer.value.index + 1) % length;
    };

    const getVideoCommentItemMeta = (item: VideoCommentsItem): string => {
      const pagination = item.pagination || {};
      const summary = item.summary || {};
      const returned = Number(pagination.returned || getItemComments(item).length || 0);
      const total = Number(
        summary.comment_count ||
          summary.stored_count ||
          summary.root_count ||
          returned ||
          0
      );
      const mode = item.mode === 'full' ? '完整' : '快速';
      return total && total !== returned
        ? `${mode} · 展示 ${returned} / 已存 ${total}`
        : `${mode} · ${returned} 条`;
    };

    const getVideoCommentsToolbarText = (call: ToolCall): string => {
      const items = getVideoCommentItems(call);
      const count = items.reduce(
        (sum, item) => sum + getItemComments(item).length,
        0
      );
      return count ? `${items.length} 个视频 · ${count} 条评论` : '评论结果';
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

    // ── Watch: Auto-expand completed search_videos calls with animation ──
    // 先设置为 false（确保 DOM 渲染出 0fr 状态），再通过 nextTick 延迟设为 true
    // 使 CSS grid-template-rows 过渡动画生效
    watch(
      () =>
        visibleToolCalls.value.map((call) => {
          const smallTaskResult =
            isSmallModelTextTool(call)
              ? String(
                  (call.result as SmallTaskResult | undefined)?.result || ''
                )
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
      if (typeof window === 'undefined' || !window.matchMedia) return;
      compactMediaQuery = window.matchMedia(COMPACT_TOOL_DISPLAY_QUERY);
      updateCompactToolDisplay();
      compactMediaQuery.addEventListener?.('change', updateCompactToolDisplay);
    });

    onBeforeUnmount(() => {
      compactMediaQuery?.removeEventListener?.(
        'change',
        updateCompactToolDisplay
      );
      compactMediaQuery = null;
    });

    return {
      containerRef,
      expanded,
      isCompactToolDisplay,
      visibleToolCalls,
      toggleExpand,
      collapseAndScroll,
      getToolLabel,
      getToolIcon,
      isSmallModelTextTool,
      isVideoCommentsTool,
      getCommentRenderMode,
      setCommentRenderMode,
      getCommentSortMode,
      handleCommentSortChange,
      isCommentLikedFilterActive,
      isCommentAuthorFilterActive,
      toggleCommentLikedFilter,
      toggleCommentAuthorFilter,
      getVideoCommentItems,
      getVideoCommentTree,
      getVisibleVideoCommentTree,
      getVisibleCommentReplies,
      getVideoCommentTitle,
      getVideoCommentOwnerText,
      getVideoCommentItemMeta,
      getVideoCommentsToolbarText,
      getCommentId,
      getCommentAuthor,
      getCommentAuthorTags,
      getCommentAuthorHref,
      getCommentTime,
      getCommentLikeValue,
      getCommentLikeText,
      getCommentMessage,
      getCommentPictures,
      getCommentPictureUrl,
      getCommentPictureFallbackUrl,
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
      toggleCommentRoot,
      setAllCommentRootsCollapsed,
      getMaxReplyLikeSuffix,
      isCommentLayerOwnerFilterActive,
      isCommentLayerLikedFilterActive,
      toggleCommentLayerOwnerFilter,
      toggleCommentLayerLikedFilter,
      getCommentLayerSortMode,
      handleCommentLayerSortChange,
      isCommentReferenceExpanded,
      toggleCommentReference,
      scrollCommentsToTop,
      commentImageViewer,
      openCommentImageViewer,
      getActiveCommentImage,
      getActiveCommentImageComment,
      closeCommentImageViewer,
      showPreviousCommentImage,
      showNextCommentImage,
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
  margin-left: auto;
}

.tool-comments-sort {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  color: rgba(92, 107, 125, 0.72);
}

.tool-comments-sort select {
  height: 24px;
  min-width: 86px;
  max-width: 96px;
  padding: 0 22px 0 7px;
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

.tool-comments-chip--active {
  background: rgba(25, 118, 210, 0.12);
  border-color: rgba(25, 118, 210, 0.2);
  color: #1976d2;
}

.tool-comments-chip--small {
  min-height: 21px;
  padding: 0 7px;
  font-size: 10.5px;
}

.tool-comments-view-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.06);
  flex: 0 0 auto;
}

.tool-comments-view-toggle :deep(.q-btn) {
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
  opacity: 0.56;
  border-radius: 5px;
}

.tool-comments-view-toggle :deep(.tool-comments-view-toggle-active) {
  background: rgba(25, 118, 210, 0.12);
  color: #1976d2;
  opacity: 0.9;
}

.tool-comments-visual {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(62vh, 680px);
  overflow: auto;
  padding-right: 2px;
  scrollbar-width: thin;
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
  padding: 0 2px;
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
  opacity: 0.76;
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
}

.tool-comment-root {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 0 0 10px;
  border-left: 2px solid rgba(128, 128, 128, 0.13);
  border-radius: 6px;
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
  gap: 2px;
  font-size: 11px;
  line-height: 1.35;
  color: rgba(142, 102, 38, 0.82);
}

.tool-comment-author-tag {
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(25, 118, 210, 0.09);
  color: rgba(25, 118, 210, 0.9);
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
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
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 10px;
  padding-left: 10px;
  border-left: 1px dashed rgba(128, 128, 128, 0.16);
}

.tool-comment-replies-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.tool-comment-replies-toggle {
  align-self: flex-start;
  min-width: 0 !important;
  min-height: 22px;
  padding: 0 !important;
  margin-left: -4px;
  font-size: 11px !important;
  opacity: 0.58;
}

.tool-comment-replies-toggle :deep(.q-btn) {
  min-width: 0 !important;
  padding-left: 0 !important;
}

.tool-comment-replies-toggle :deep(.q-btn__content) {
  justify-content: flex-start;
  gap: 2px;
  min-width: 0;
}

.tool-comment-replies-toggle :deep(.q-icon) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.tool-comments-sort--small select {
  height: 21px;
  min-width: 68px;
  max-width: 82px;
  padding-left: 6px;
  font-size: 10.5px;
}

.tool-comment-reply-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

body.body--dark .tool-comment-author,
body.body--dark .tool-comment-reference-author {
  color: #90caf9;
}

body.body--dark .tool-call-header,
body.body--dark .tool-comments-toolbar {
  background: rgba(18, 22, 28, 0.96);
}

body.body--dark .tool-comments-video-owner {
  color: rgba(209, 217, 224, 0.58);
}

body.body--dark .tool-comment-time,
body.body--dark .tool-comment-reply-target,
body.body--dark .tool-comment-reference-time,
body.body--dark .tool-comment-reference-like {
  color: rgba(209, 217, 224, 0.58);
}

body.body--dark .tool-comment-like {
  color: rgba(255, 213, 128, 0.72);
}

body.body--dark .tool-comment-author-tag {
  background: rgba(144, 202, 249, 0.12);
  color: #90caf9;
}

body.body--dark .tool-comment-jump-button {
  background: rgba(144, 202, 249, 0.09);
  border-color: rgba(144, 202, 249, 0.18);
  color: #90caf9;
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
body.body--dark .tool-comments-chip {
  color: rgba(209, 217, 224, 0.7);
}

body.body--dark .tool-comments-sort select,
body.body--dark .tool-comments-chip {
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

body.body--dark .tool-comments-chip--active {
  background: rgba(144, 202, 249, 0.14);
  border-color: rgba(144, 202, 249, 0.24);
  color: #90caf9;
}

.tool-comments-empty {
  padding: 8px 10px;
  font-size: 12px;
  opacity: 0.5;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.04);
}

.tool-comment-image-overlay {
  position: fixed;
  inset: 0;
  z-index: 7000;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 56px;
  align-items: center;
  gap: 10px;
  padding: 28px;
  background: rgba(12, 18, 26, 0.88);
}

.tool-comment-image-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-height: calc(100vh - 56px);
  margin: 0;
}

.tool-comment-image-stage img {
  max-width: 100%;
  max-height: calc(100vh - 142px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.36);
}

.tool-comment-image-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
}

.tool-comment-image-caption {
  max-width: 760px;
  max-height: 44px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
}

.tool-comment-image-nav,
.tool-comment-image-close {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
}

.tool-comment-image-nav {
  width: 44px;
  height: 52px;
  font-size: 34px;
  line-height: 1;
}

.tool-comment-image-close {
  position: absolute;
  top: 18px;
  right: 18px;
  min-height: 30px;
  padding: 0 12px;
  font-size: 12px;
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
  max-height: none;
  overflow-y: visible;
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
    max-height: none;
    overflow-y: visible;
  }

  .tool-results-grid {
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
    gap: 6px;
    max-height: 360px;
  }

  .tool-comments-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
  }

  .tool-comments-toolbar-meta {
    white-space: normal;
  }

  .tool-comments-controls {
    margin-left: 0;
  }

  .tool-comments-visual {
    max-height: 58vh;
  }

  .tool-comment-root {
    padding-left: 8px;
  }

  .tool-comment-replies {
    margin-left: 6px;
    padding-left: 8px;
  }

  .tool-comment-image-overlay {
    grid-template-columns: 38px minmax(0, 1fr) 38px;
    gap: 6px;
    padding: 18px 10px;
  }

  .tool-comment-image-nav {
    width: 34px;
    height: 44px;
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
