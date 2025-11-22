import { useEffect, useState, type CSSProperties } from 'react';
import type { ParseResult } from '../../src/utils/atpParser';
import { NodeStatus, type AtpGraph } from '../../src/types/atp';
import { GraphCanvas } from './GraphCanvas';
import type { VSCodeAPI } from './types';

type GraphDataMessage = {
	type: 'graphData';
	planUri: string | null;
	result: ParseResult;
};

type ExtensionMessage = { type: 'ready' } | { type: 'pong' } | GraphDataMessage;

type PlanSummary = {
	projectName: string;
	version: string;
	projectStatus: string;
	nodeCount: number;
};

type AppProps = {
	vscode: VSCodeAPI;
};

export default function App({ vscode }: AppProps) {
	const [status, setStatus] = useState('Waiting for VS Code…');
	const [planUri, setPlanUri] = useState<string | null>(null);
	const [planGraph, setPlanGraph] = useState<AtpGraph | null>(null);
	const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
	const [issues, setIssues] = useState<string[]>([]);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);
	const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

	useEffect(() => {
		const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
			if (!event.data) {
				return;
			}

			switch (event.data.type) {
				case 'ready':
					break;
				case 'graphData': {
					setPlanUri(event.data.planUri ?? null);
					setActiveNodeId(null);

					if (event.data.result.success) {
						const graph = event.data.result.graph;
						setPlanGraph(graph);
						const nodeCount = Object.keys(graph.nodes).length;
						setPlanSummary({
							projectName: graph.meta.project_name,
							version: graph.meta.version,
							projectStatus: graph.meta.project_status,
							nodeCount,
						});
						setIssues([]);
						setLastUpdated(new Date().toLocaleTimeString());
					} else {
						setPlanGraph(null);
						setPlanSummary(null);
						setIssues(event.data.result.issues);
						setLastUpdated(new Date().toLocaleTimeString());
					}
					break;
				}
				default: {
					break;
				}
			}
		};

		window.addEventListener('message', handleMessage);
		vscode.postMessage({ type: 'webview-ready' });

		return () => window.removeEventListener('message', handleMessage);
	}, [vscode]);

	const activeNode = activeNodeId && planGraph ? planGraph.nodes[activeNodeId] ?? null : null;

	return (
		<div style={appShellStyle}>
			<div style={canvasLayerStyle}>
				{planGraph ? (
					<GraphCanvas graph={planGraph} onNodeFocus={setActiveNodeId} />
				) : (
					<div style={graphPlaceholderStyle}>
						<div style={graphPlaceholderTitleStyle}>Canvas is ready</div>
						<div style={labelMutedStyle}>Open or save an *.atp.json to render the graph.</div>
					</div>
				)}
			</div>

			<div style={hudStyle}>
				{activeNode ? (
					<div>
						<div style={titleStyle}>{activeNode.title}</div>
						<div style={metaRowStyle}>
							<span style={getStatusPillStyle(activeNode.status)}>{activeNode.status}</span>
							{activeNode.worker_id && (
								<span style={badgeStyle}>{`Worker: ${activeNode.worker_id}`}</span>
							)}
							<span style={badgeStyle}>
								{activeNode.dependencies.length === 1
									? '1 dependency'
									: `${activeNode.dependencies.length} dependencies`}
							</span>
						</div>
						{activeNode.instruction && (
							<div style={sectionStyle}>
								<div style={labelStyle}>Instruction</div>
								<div style={labelMutedStyle}>{activeNode.instruction}</div>
							</div>
						)}
						{activeNode.context && (
							<div style={sectionStyle}>
								<div style={labelStyle}>Context</div>
								<div style={labelMutedStyle}>{activeNode.context}</div>
							</div>
						)}
						{activeNode.report && (
							<div style={sectionStyle}>
								<div style={labelStyle}>Report</div>
								<div style={labelMutedStyle}>{activeNode.report}</div>
							</div>
						)}
						{activeNode.artifacts && activeNode.artifacts.length > 0 && (
							<div style={sectionStyle}>
								<div style={labelStyle}>Artifacts</div>
								<ul style={artifactsListStyle}>
									{activeNode.artifacts.map((artifact) => (
										<li key={artifact}>{artifact}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				) : (
					<div>
						<div style={titleStyle}>
							{planSummary ? planSummary.projectName : 'ATP Plan'}
						</div>
						{planSummary && (
							<div style={metaRowStyle}>
								<span style={badgeStyle}>
									{`${planSummary.nodeCount} node${
										planSummary.nodeCount === 1 ? '' : 's'
									}`}
								</span>
								{lastUpdated && <span style={badgeStyle}>{lastUpdated}</span>}
							</div>
						)}
						{!planSummary && (
							<div style={hudMetaStyle}>No plan detected yet</div>
						)}
						{planGraph && issues.length === 0 && (
							<div style={labelMutedStyle}>
								Click or drag a node to inspect its details.
							</div>
						)}
					</div>
				)}
				{issues.length > 0 && (
					<div style={hudIssuesStyle}>
						{issues.map((issue, index) => (
							<div key={`${issue}-${index}`} style={issueItemStyle}>
								{issue}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

const theme = {
	background: 'var(--vscode-editor-background)',
	foreground: 'var(--vscode-editor-foreground)',
	muted: 'var(--vscode-descriptionForeground)',
	border: 'var(--vscode-panel-border, var(--vscode-editorGroup-border, #4b5563))',
	surface: 'var(--vscode-editorWidget-background, color-mix(in srgb, var(--vscode-editor-background) 92%, transparent))',
	buttonBg: 'var(--vscode-button-background)',
	buttonHoverBg: 'var(--vscode-button-hoverBackground, var(--vscode-button-background))',
	buttonFg: 'var(--vscode-button-foreground, var(--vscode-editor-background))',
	accent: 'var(--vscode-focusBorder, var(--vscode-charts-blue, #3b82f6))',
	success: 'var(--vscode-testing-iconPassed, #22c55e)',
	error: 'var(--vscode-testing-iconFailed, #ef4444)',
	ready: 'var(--vscode-foreground, #94a3b8)',
	claimed: 'var(--vscode-charts-blue, #3b82f6)',
	locked: 'var(--vscode-disabledForeground, #94a3b8)',
	shadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
};

const appShellStyle: CSSProperties = {
	position: 'relative',
	height: '100%',
	width: '100%',
	overflow: 'hidden',
	background: `radial-gradient(circle at 20% 20%, color-mix(in srgb, ${theme.accent} 14%, ${theme.background} 86%), ${theme.background})`,
	color: theme.foreground,
	fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
};

const canvasLayerStyle: CSSProperties = {
	position: 'absolute',
	inset: 0,
	borderRadius: '12px',
	border: `1px solid ${theme.border}`,
	boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.4)',
	overflow: 'hidden',
};

const hudStyle: CSSProperties = {
	position: 'absolute',
	bottom: 16,
	left: 16,
	display: 'flex',
	flexDirection: 'column',
	gap: '8px',
	pointerEvents: 'auto',
	backgroundColor: 'color-mix(in srgb, var(--vscode-editorWidget-background, transparent) 92%, transparent)',
	border: `1px solid ${theme.border}`,
	borderRadius: '10px',
	padding: '10px 12px',
	boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
	maxWidth: '380px',
	width: 'min(380px, 92vw)',
};

const titleStyle: CSSProperties = {
	fontSize: '14px',
	fontWeight: 700,
	letterSpacing: '0.3px',
	marginBottom: 4,
};

const hudMetaStyle: CSSProperties = {
	fontSize: '12px',
	color: theme.muted,
};

const hudIssuesStyle: CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '4px',
	color: theme.error,
	fontSize: '12px',
};

const labelStyle: CSSProperties = {
	fontSize: '12px',
	textTransform: 'uppercase',
	letterSpacing: '0.6px',
	color: theme.muted,
	marginBottom: 4,
};

const valueStyle: CSSProperties = {
	fontSize: '18px',
	fontWeight: 700,
	marginBottom: '8px',
	color: theme.foreground,
	wordBreak: 'break-word',
};

const pillStyle: CSSProperties = {
	display: 'inline-block',
	padding: '6px 10px',
	borderRadius: '999px',
	fontSize: '12px',
	fontWeight: 700,
	textTransform: 'uppercase',
	letterSpacing: '0.5px',
};

const metaRowStyle: CSSProperties = {
	display: 'flex',
	flexWrap: 'wrap',
	gap: 6,
	alignItems: 'center',
	marginTop: 4,
	marginBottom: 6,
};

const badgeStyle: CSSProperties = {
	fontSize: '11px',
	color: theme.muted,
	backgroundColor: 'color-mix(in srgb, var(--vscode-editorWidget-background, transparent) 88%, transparent)',
	padding: '4px 8px',
	borderRadius: '999px',
	border: `1px solid ${theme.border}`,
};

const sectionStyle: CSSProperties = {
	marginTop: 10,
	paddingTop: 8,
	borderTop: `1px solid color-mix(in srgb, ${theme.border} 80%, transparent)`,
};

function getStatusPillStyle(status: NodeStatus): CSSProperties {
	switch (status) {
		case NodeStatus.COMPLETED:
			return {
				...pillStyle,
				background: `linear-gradient(90deg, color-mix(in srgb, ${theme.success} 90%, transparent), ${theme.success})`,
				color: 'var(--vscode-editor-background, #020617)',
			};
		case NodeStatus.FAILED:
			return {
				...pillStyle,
				background: `linear-gradient(90deg, color-mix(in srgb, ${theme.error} 90%, transparent), ${theme.error})`,
				color: 'var(--vscode-editor-background, #020617)',
			};
		case NodeStatus.CLAIMED:
			return {
				...pillStyle,
				background: `linear-gradient(90deg, color-mix(in srgb, ${theme.claimed} 90%, transparent), ${theme.claimed})`,
				color: 'var(--vscode-editor-background, #020617)',
			};
		case NodeStatus.READY:
			return {
				...pillStyle,
				background: `linear-gradient(90deg, color-mix(in srgb, ${theme.ready} 90%, transparent), ${theme.ready})`,
				color: 'var(--vscode-editor-background, #020617)',
			};
		case NodeStatus.LOCKED:
		default:
			return {
				...pillStyle,
				background: `linear-gradient(90deg, color-mix(in srgb, ${theme.locked} 88%, transparent), ${theme.locked})`,
				color: 'var(--vscode-editor-background, #020617)',
			};
	}
}

const labelMutedStyle: CSSProperties = {
	fontSize: '12px',
	color: theme.muted,
	letterSpacing: '0.2px',
};

const issuesTitleStyle: CSSProperties = {
	margin: '0 0 6px',
	color: theme.error,
	fontWeight: 700,
	letterSpacing: '0.4px',
};

const issuesListStyle: CSSProperties = {
	margin: 0,
	paddingLeft: '18px',
	color: theme.error,
	lineHeight: 1.5,
};

const artifactsListStyle: CSSProperties = {
	margin: 0,
	paddingLeft: '18px',
	color: theme.foreground,
	lineHeight: 1.4,
};

const issueItemStyle: CSSProperties = {
	marginBottom: '6px',
};

const graphPlaceholderStyle: CSSProperties = {
	position: 'absolute',
	inset: 0,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	color: theme.foreground,
	textAlign: 'center',
	background: 'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--vscode-editor-background) 86%, transparent), transparent 40%)',
	pointerEvents: 'none',
};

const graphPlaceholderTitleStyle: CSSProperties = {
	fontSize: '16px',
	fontWeight: 700,
	marginBottom: '6px',
};
