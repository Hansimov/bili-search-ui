import { defineStore } from 'pinia';
import { DictList, ExploreStepResult, defaultExploreStepResult } from 'src/stores/resultStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

// type NodeType = 'default' | 'input' | 'output' | 'running' | 'finished';

interface FlowNode {
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    style: Record<string, any>;
    sourcePosition?: string;
    targetPosition?: string;
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
    style: Record<string, any>;
    animated?: boolean;
}
const RUNNING_BG_COLOR = '#ff8000';
const RUNNING_BORDER = '1px solid #333';
const FINISHED_BG_COLOR = '#559955';
const FINISHED_BORDER = '1px solid #333';

const nodeStyles: Record<string, Record<string, any>> = {
    'default': { backgroundColor: 'lightgray' },
    'input': { backgroundColor: 'lightgray' },
    'output': { backgroundColor: 'lightgray' },
    'running': { backgroundColor: RUNNING_BG_COLOR, border: RUNNING_BORDER },
    'finished': { backgroundColor: FINISHED_BG_COLOR, border: FINISHED_BORDER },
}
const edgeStyles: Record<string, Record<string, any>> = {
    'default': { stroke: 'lightgray', animated: true },
    'input': { stroke: 'lightgray', animated: true },
    'output': { stroke: 'lightgreen', animated: false },
    'running': { stroke: 'lightgray', animated: true },
    'finished': { stroke: 'lightgreen', animated: false },
}

// const defaultStepNodeName = '运行中';

export const useFlowStore = defineStore('flow', {
    state: () => ({
        nodes: [] as FlowNode[],
        edges: [] as FlowEdge[],
    }),
    getters: {
        currentNodeIdx(): number {
            return this.nodes.length - 1;
        },
    },
    actions: {
        createNode({ type = 'default', label = '' }: { type?: string; label?: string }): number {
            const idx = this.nodes.length;
            const node: FlowNode = {
                // id: `${idx}-${label}`,
                id: idx.toString(),
                type: type,
                label: label,
                position: { x: 0, y: 0 },
                style: nodeStyles[type],
            };
            this.nodes.push(node);
            return idx;
        },
        createEdge({ source, target, type = 'default' }: { source: number; target: number; type?: string }): void {
            const sourceId = source.toString();
            const targetId = target.toString();
            const edgeId = `e${sourceId}-${targetId}`;
            const style = edgeStyles[type];
            const edge: FlowEdge = { id: edgeId, source: sourceId, target: targetId, style, animated: style.animated };
            this.edges.push(edge);
        },
        addFlowNode({ type = 'default', label = '' }: { type?: string; label?: string }) {
            this.createNode({ type: type, label: label });
            console.log('add FlowNode:', { type, label });
            if (this.nodes.length > 1) {
                this.createEdge({ source: this.nodes.length - 2, target: this.nodes.length - 1, type: type });
            }
        },
        clearFlowNodes() {
            this.nodes = [];
            this.edges = [];
            console.log('clearFlowNodes');
        },
        getNodeByName(name: string): FlowNode | undefined {
            return this.nodes.find(node => node.label === name);
        },
        getNodeIdxByName(name: string): number {
            return this.nodes.findIndex(node => node.label === name);
        },
        getEdgeBySourceTarget(source: string, target: string): FlowEdge | undefined {
            return this.edges.find(edge => edge.source === source && edge.target === target);
        },
        updateFlowNode({ stepResult = defaultExploreStepResult() as ExploreStepResult
        }: { stepResult?: ExploreStepResult } = {}) {
            const nodeName = stepResult.name_zh;
            const node = this.getNodeByName(nodeName);
            if (!node) {
                console.error('Node not found:', nodeName);
                return;
            }
            const nodeIdx = this.getNodeIdxByName(nodeName);
            node.style = nodeStyles.finished;
            const edge = this.getEdgeBySourceTarget((nodeIdx - 1).toString(), nodeIdx.toString());
            if (edge) {
                edge.style = edgeStyles.finished;
                edge.animated = edgeStyles.finished.animated;
            }
            console.log('update FlowNode:', nodeIdx);
        },
        pushFlowNode(stepResult: ExploreStepResult) {
            if (stepResult.output_type === 'nodes') {
                console.log(stepResult.output.nodes);
                stepResult.output.nodes.forEach((node: any, idx: number) => {
                    const nodeType = idx === 0 ? 'input' : idx === stepResult.output.nodes.length - 1 ? 'output' : 'default';
                    this.addFlowNode({ type: nodeType, label: node.name_zh });
                });
            } else if (stepResult.output_type !== 'init') {
                this.updateFlowNode(
                    { stepResult: stepResult }
                );
            }
        }
    }
}
);
