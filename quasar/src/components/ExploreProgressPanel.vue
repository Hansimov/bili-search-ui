<template>
  <VueFlow
    v-model:nodes="nodes"
    v-model:edges="edges"
    fit-view-on-init
    :nodes-draggable="false"
    :pan-on-drag="false"
    :pan-on-scroll="false"
    :zoom-on-scroll="false"
    :zoom-on-pinch="false"
    :zoom-on-double-click="false"
    :nodes-connectable="false"
    :elements-selectable="false"
    class="flow-container"
  ></VueFlow>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { VueFlow, Position } from '@vue-flow/core';
import dagre from '@dagrejs/dagre';

function calcNodeTextWidthHeight({ text, scale = 1 }) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const metrics = context.measureText(text);
  const width = metrics.width * scale;
  const height = metrics.fontBoundingBoxAscent * scale;
  console.log('text', text, 'width', width, 'height', height);
  return { width, height };
}

function calcDagreLayout({
  nodes,
  edges,
  direction = 'LR',
  nodeWidthSep = 30,
}) {
  // init dagre graph
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction });

  // register nodes and edges, and create layout
  nodes.forEach((node) => {
    const { width: nodeTextWidth, height: nodeTextHeight } =
      calcNodeTextWidthHeight({
        text: node.label,
        scale: 1,
      });
    g.setNode(node.id, {
      width: nodeTextWidth,
      height: nodeTextHeight,
    });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });
  dagre.layout(g);

  // map back positions, handle alignment
  const isHorizontal = direction === 'LR';
  const placedNodes = nodes.map((node, idx) => {
    const { x, y, width } = g.node(node.id);
    return {
      ...node,
      position: { x: x - width / 2 + nodeWidthSep * idx, y: y },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
    };
  });

  return { nodes: placedNodes, edges };
}

const initialNodes = ref([
  { id: '1', label: '输入', type: 'input' },
  { id: '2', label: '聚合' },
  { id: '3', label: '关联搜索' },
  { id: '4', label: '相关性排序' },
  { id: '5', label: '结果', type: 'output' },
]);

const initialEdges = ref([
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4', animated: true },
  { id: 'e4-5', source: '4', target: '5', animated: true },
]);

const nodes = ref([]);
const edges = ref([]);

onMounted(() => {
  const { nodes: placedNodes, edges: placedEdges } = calcDagreLayout({
    nodes: initialNodes.value,
    edges: initialEdges.value,
    direction: 'LR',
  });
  nodes.value = placedNodes;
  edges.value = placedEdges;
});
</script>

<style>
.vue-flow__nodes,
.flow-container {
  height: 50px;
  /* width: 100%; */
  background-color: transparent;
}
.vue-flow__node,
.vue-flow__node-default {
  background-color: lightgray;
  width: auto;
  height: auto;
  padding: 5px 10px 5px 10px;
}
</style>
