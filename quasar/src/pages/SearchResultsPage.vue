<template>
  <q-page class="row items-start justify-evenly">
    <div>
      <div class="head-placeholder"><br /></div>
      <search-bar active></search-bar>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import SearchBar from 'components/SearchBar.vue';

defineOptions({
  name: 'IndexPage',
});
</script>

<style lang="scss" scoped>
.head-placeholder {
  line-height: 0vh;
  text-align: center;
}
</style>
