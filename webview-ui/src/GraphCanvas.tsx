import dagre from 'dagre';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	type Edge,
	Handle,
	MarkerType,
	type Node,
	type NodeProps,
	Position,
	applyNodeChanges,
	type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AtpGraph, NodeStatus } from '../../src/types/atp';

type FlowNodeData = {
	id: string;
	title: string;
	status: NodeStatus;
	worker?: string;
	dependencyCount: number;
	instruction?: string;
	context?: string;
	artifacts?: string[];
	report?: string;
};

type StatusPalette = {
	border: string;
	fill: string;
	text: string;
};

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;

const statusPalette: Record<NodeStatus, StatusPalette> = {
	[NodeStatus.COMPLETED]: {
		border: 'var(--vscode-testing-iconPassed, #22c55e)',
		fill: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 16%, transparent)',
		text: 'var(--vscode-testing-iconPassed, #22c55e)',
	},
	[NodeStatus.CLAIMED]: {
		border: 'var(--vscode-charts-blue, #3b82f6)',
		fill: 'color-mix(in srgb, var(--vscode-charts-blue, #3b82f6) 16%, transparent)',
		text: 'var(--vscode-charts-blue, #3b82f6)',
	},
	[NodeStatus.READY]: {
		border: 'var(--vscode-foreground, #94a3b8)',
		fill: 'color-mix(in srgb, var(--vscode-foreground, #94a3b8) 14%, transparent)',
		text: 'var(--vscode-foreground, #cbd5e1)',
	},
	[NodeStatus.FAILED]: {
		border: 'var(--vscode-testing-iconFailed, #ef4444)',
		fill: 'color-mix(in srgb, var(--vscode-testing-iconFailed, #ef4444) 16%, transparent)',
		text: 'var(--vscode-testing-iconFailed, #ef4444)',
	},
	[NodeStatus.LOCKED]: {
		border: 'var(--vscode-disabledForeground, #94a3b8)',
		fill: 'color-mix(in srgb, var(--vscode-disabledForeground, #94a3b8) 12%, transparent)',
		text: 'var(--vscode-disabledForeground, #cbd5e1)',
	},
};

const graphWrapperStyle: CSSProperties = {
	height: '100%',
	width: '100%',
	borderRadius: '14px',
	border: '1px solid var(--vscode-panel-border, rgba(148, 163, 184, 0.2))',
	overflow: 'hidden',
	boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
	backgroundColor: 'var(--vscode-editor-background)',
};

const reactFlowStyle: CSSProperties = {
	width: '100%',
	height: '100%',
	background: 'var(--vscode-editor-background)',
};

const nodeContainerStyle: CSSProperties = {
	borderRadius: '12px',
	gap: '8px',
	padding: '12px 14px',
	boxShadow: '0 12px 24px rgba(0, 0, 0, 0.35)',
	border: '2px solid transparent',
	color: 'var(--vscode-editor-foreground)',
	fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
	minWidth: `${NODE_WIDTH}px`,
	maxWidth: '380px',
	boxSizing: 'border-box',
	position: 'relative',
	zIndex: 2,
};

const nodeTitleStyle: CSSProperties = {
	fontSize: '14px',
	fontWeight: 700,
	marginBottom: '6px',
	lineHeight: 1.3,
};

const nodeMetaRowStyle: CSSProperties = {
	display: 'flex',
	gap: '6px',
	alignItems: 'center',
	flexWrap: 'wrap',
};

const workerTagStyle: CSSProperties = {
	fontSize: '11px',
	color: 'var(--vscode-descriptionForeground)',
	backgroundColor: 'color-mix(in srgb, var(--vscode-descriptionForeground) 12%, transparent)',
	padding: '4px 8px',
	borderRadius: '999px',
	border: '1px solid var(--vscode-panel-border, rgba(148, 163, 184, 0.35))',
};

const dependencyTagStyle: CSSProperties = {
	fontSize: '11px',
	color: 'var(--vscode-descriptionForeground)',
	padding: '4px 8px',
	borderRadius: '999px',
	border: '1px dashed var(--vscode-panel-border, rgba(148, 163, 184, 0.45))',
};

function getStatusPalette(status: NodeStatus): StatusPalette {
	return statusPalette[status] ?? statusPalette[NodeStatus.READY];
}

function StatusNode({ data, selected }: NodeProps<FlowNodeData>) {
	const palette = getStatusPalette(data.status);

	const baseStyle: CSSProperties = {
		...nodeContainerStyle,
		borderColor: palette.border,
		backgroundColor: palette.fill,
		background:
			'linear-gradient(180deg, color-mix(in srgb, var(--vscode-editor-background) 92%, transparent), color-mix(in srgb, var(--vscode-editor-background) 86%, transparent))',
	};

	if (selected) {
		baseStyle.background = `linear-gradient(135deg, color-mix(in srgb, ${palette.border} 32%, transparent), color-mix(in srgb, var(--vscode-editor-background) 88%, transparent))`;
		baseStyle.boxShadow = '0 18px 36px rgba(0, 0, 0, 0.65)';
	}

	return (
		<div style={baseStyle}>
			<Handle
				type="target"
				position={Position.Left}
				style={{ background: palette.border, border: 'none' }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				style={{ background: palette.border, border: 'none' }}
			/>

			<div style={nodeTitleStyle}>{data.title}</div>
			<div style={nodeMetaRowStyle}>
				<span
					style={{
						color: palette.text,
						backgroundColor: `color-mix(in srgb, ${palette.border} 14%, transparent)`,
						borderRadius: '10px',
						border: `1px solid ${palette.border}`,
						padding: '4px 10px',
						fontSize: '11px',
						fontWeight: 700,
						letterSpacing: '0.4px',
						textTransform: 'uppercase',
					}}
				>
					{data.status}
				</span>
				{data.worker && <span style={workerTagStyle}>Worker: {data.worker}</span>}
				<span style={dependencyTagStyle}>
					{data.dependencyCount === 1
						? '1 dependency'
						: `${data.dependencyCount} dependencies`}
				</span>
			</div>
		</div>
	);
}

function layoutGraph(graph: AtpGraph): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));
	dagreGraph.setGraph({
		rankdir: 'LR',
		ranksep: 140,
		nodesep: 80,
		edgesep: 12,
	});

	const nodes: Node<FlowNodeData>[] = [];
	const edges: Edge[] = [];

	for (const [id, node] of Object.entries(graph.nodes)) {
		const dependencyCount = node.dependencies.length;
		const nodePalette = getStatusPalette(node.status);

		nodes.push({
			id,
			type: 'statusNode',
			data: {
				id,
				title: node.title,
				status: node.status,
				worker: node.worker_id,
				dependencyCount,
				instruction: node.instruction,
				context: node.context,
				report: node.report,
				artifacts: node.artifacts,
			},
			position: { x: 0, y: 0 },
			sourcePosition: Position.Right,
			targetPosition: Position.Left,
			draggable: true,
			style: {
				borderColor: nodePalette.border,
			},
		});

		dagreGraph.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });

		for (const dependency of node.dependencies) {
			const targetStatus = node.status ?? NodeStatus.LOCKED;
			const palette = getStatusPalette(targetStatus);
			edges.push({
				id: `${dependency}->${id}`,
				source: dependency,
				target: id,
				type: 'bezier',
				animated: targetStatus === NodeStatus.CLAIMED,
				style: {
					stroke: palette.border,
					strokeWidth: 2,
					opacity: 0.9,
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
					width: 16,
					height: 16,
					color: palette.border,
				},
			});
			dagreGraph.setEdge(dependency, id);
		}
	}

	dagre.layout(dagreGraph);

	const laidOutNodes = nodes.map((node) => {
		const coord = dagreGraph.node(node.id);
		if (coord) {
			return {
				...node,
				position: {
					x: coord.x - NODE_WIDTH / 2,
					y: coord.y - NODE_HEIGHT / 2,
				},
			};
		}

		return node;
	});

	return { nodes: laidOutNodes, edges };
}

type GraphCanvasProps = {
	graph: AtpGraph;
	onNodeFocus?: (nodeId: string | null) => void;
};

export function GraphCanvas({ graph, onNodeFocus }: GraphCanvasProps) {
	const { nodes, edges } = useMemo(() => layoutGraph(graph), [graph]);
	const [nodesState, setNodesState] = useState(nodes);

	useEffect(() => {
		setNodesState(nodes);
	}, [nodes]);

	const fitView = useCallback(
		(instance: { fitView: (options?: { padding?: number }) => void }) => {
			instance.fitView({ padding: 0.2 });
		},
		[],
	);

	const onNodesChange = useCallback(
		(changes: NodeChange[]) => setNodesState((current) => applyNodeChanges(changes, current)),
		[],
	);

	const handleNodeClick = useCallback(
		(_event: unknown, node: Node<FlowNodeData>) => {
			if (onNodeFocus) {
				onNodeFocus(node.id);
			}
		},
		[onNodeFocus],
	);

	const handleNodeDragStart = useCallback(
		(_event: unknown, node: Node<FlowNodeData>) => {
			if (onNodeFocus) {
				onNodeFocus(node.id);
			}
		},
		[onNodeFocus],
	);

	const handlePaneClick = useCallback(() => {
		if (onNodeFocus) {
			onNodeFocus(null);
		}
	}, [onNodeFocus]);

	return (
		<div style={graphWrapperStyle}>
			<ReactFlow
				style={reactFlowStyle}
				nodes={nodesState}
				edges={edges}
				nodeTypes={{ statusNode: StatusNode }}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				onInit={fitView}
				nodesConnectable={false}
				nodesDraggable
				onNodesChange={onNodesChange}
				onNodeClick={handleNodeClick}
				onNodeDragStart={handleNodeDragStart}
				onPaneClick={handlePaneClick}
				elementsSelectable
				proOptions={{ hideAttribution: true }}
				defaultEdgeOptions={{
					type: 'bezier',
					style: {
						stroke: 'var(--vscode-foreground, #94a3b8)',
						strokeWidth: 2,
						opacity: 0.8,
					},
				}}
			>
				<Background color="color-mix(in srgb, var(--vscode-foreground) 12%, transparent)" gap={18} />
				<MiniMap
					zoomable
					pannable
					position="top-right"
					ariaLabel="Minimap overview"
					maskColor="color-mix(in srgb, var(--vscode-editor-background) 85%, transparent)"
					nodeStrokeColor={(node) => {
						const status = (node.data as FlowNodeData | undefined)?.status ?? NodeStatus.READY;
						return getStatusPalette(status).border;
					}}
					nodeColor={(node) => {
						const status = (node.data as FlowNodeData | undefined)?.status ?? NodeStatus.READY;
						return getStatusPalette(status).fill;
					}}
					style={{ borderRadius: '8px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)' }}
				/>
				<Controls position="bottom-right" showInteractive={false} />
			</ReactFlow>
		</div>
	);
}
