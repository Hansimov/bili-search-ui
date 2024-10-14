<template>
  <q-pagination
    flat
    unelevated
    gutter="2px"
    padding="1px 5px"
    color="none"
    active-color="primary"
    :model-value="currentPage"
    @update:model-value="$emit('update:currentPage', $event)"
    :max="totalPages"
    :max-pages="8"
    boundary-numbers
    direction-links
    v-if="totalPages > 1"
  />
</template>

<script>
export default {
  name: 'ResultsPagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
  },
};
</script>
