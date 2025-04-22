<template>
  <VueFlow
    v-model:nodes="placedNodes"
    v-model:edges="placedEdges"
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
import { ref, watchEffect } from 'vue';
import { VueFlow, Position, useVueFlow } from '@vue-flow/core';
import dagre from '@dagrejs/dagre';
import { useExploreStore } from 'src/stores/exploreStore';

const exploreStore = useExploreStore();
const { onInit, fitView } = useVueFlow();

const fitViewParams = {
  padding: 0.1,
  includeHiddenNodes: false,
  // duration: 500,
};

onInit(() => {
  fitView(fitViewParams);
});

function calcNodeTextWidthHeight({ text, scale = 1 }) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const metrics = context.measureText(text);
  const width = metrics.width * scale;
  const height = metrics.fontBoundingBoxAscent * scale;
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

const placedNodes = ref([]);
const placedEdges = ref([]);

watchEffect(() => {
  const rawNodes = exploreStore.nodes.map((n) => ({ ...n }));
  const rawEdges = exploreStore.edges.map((e) => ({ ...e }));
  const { nodes: layoutedNodes, edges: layoutedEdges } = calcDagreLayout({
    nodes: rawNodes,
    edges: rawEdges,
    direction: 'LR',
    nodeWidthSep: 30,
  });
  placedNodes.value = layoutedNodes;
  placedEdges.value = layoutedEdges;
  fitView(fitViewParams);
});
</script>

<style>
.vue-flow__nodes,
.flow-container {
  height: 50px;
  width: 100%;
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
