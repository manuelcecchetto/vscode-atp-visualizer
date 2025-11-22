import { AtpGraph, NodeStatus, ProjectStatus } from '../types/atp';

export type ParseResult =
	| {
			success: true;
			graph: AtpGraph;
	  }
	| {
			success: false;
			error: string;
			issues: string[];
	  };

const nodeStatuses = new Set<NodeStatus>(Object.values(NodeStatus));
const projectStatuses = new Set<ProjectStatus>(Object.values(ProjectStatus));

export function parseAtpJson(content: string): ParseResult {
	let raw: unknown;

	try {
		raw = JSON.parse(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
		return {
			success: false,
			error: 'Invalid JSON',
			issues: [message],
		};
	}

	if (!isRecord(raw)) {
		return {
			success: false,
			error: 'Invalid ATP plan',
			issues: ['Root JSON value must be an object'],
		};
	}

	const issues = [...validateMeta(raw.meta), ...validateNodes(raw.nodes)];

	if (issues.length > 0) {
		return {
			success: false,
			error: 'ATP plan validation failed',
			issues,
		};
	}

	const graph = raw as unknown as AtpGraph;
	return { success: true, graph };
}

function validateMeta(metaValue: unknown): string[] {
	if (!isRecord(metaValue)) {
		return ['meta must be an object'];
	}

	const meta = metaValue as Record<string, unknown>;
	const errors: string[] = [];

	if (!isNonEmptyString(meta.project_name)) {
		errors.push('meta.project_name must be a non-empty string');
	}

	if (meta.version !== '1.3') {
		errors.push('meta.version must equal "1.3"');
	}

	if (
		typeof meta.project_status !== 'string' ||
		!projectStatuses.has(meta.project_status as ProjectStatus)
	) {
		errors.push('meta.project_status must be one of: ' + Array.from(projectStatuses).join(', '));
	}

	if (meta.created_at !== undefined && typeof meta.created_at !== 'string') {
		errors.push('meta.created_at must be a string when provided');
	}

	return errors;
}

function validateNodes(nodesValue: unknown): string[] {
	if (!isRecord(nodesValue)) {
		return ['nodes must be an object map of node IDs to node definitions'];
	}

	const nodes = nodesValue as Record<string, unknown>;
	const nodeIds = Object.keys(nodes);
	const nodeIdSet = new Set(nodeIds);
	const errors: string[] = [];

	for (const [nodeId, value] of Object.entries(nodes)) {
		if (!isRecord(value)) {
			errors.push(`nodes.${nodeId} must be an object`);
			continue;
		}

		const node = value as Record<string, unknown>;

		if (!isNonEmptyString(node.title)) {
			errors.push(`nodes.${nodeId}.title must be a non-empty string`);
		}

		if (!isNonEmptyString(node.instruction)) {
			errors.push(`nodes.${nodeId}.instruction must be a non-empty string`);
		}

		if (!Array.isArray(node.dependencies)) {
			errors.push(`nodes.${nodeId}.dependencies must be an array of node IDs`);
		} else if (!node.dependencies.every((dep) => typeof dep === 'string')) {
			errors.push(`nodes.${nodeId}.dependencies may only contain strings`);
		}

		if (typeof node.status !== 'string' || !nodeStatuses.has(node.status as NodeStatus)) {
			errors.push(
				`nodes.${nodeId}.status must be one of: ` + Array.from(nodeStatuses).join(', '),
			);
		}

		if (node.context !== undefined && typeof node.context !== 'string') {
			errors.push(`nodes.${nodeId}.context must be a string when provided`);
		}

		if (node.worker_id !== undefined && typeof node.worker_id !== 'string') {
			errors.push(`nodes.${nodeId}.worker_id must be a string when provided`);
		}

		if (node.started_at !== undefined && typeof node.started_at !== 'string') {
			errors.push(`nodes.${nodeId}.started_at must be a string when provided`);
		}

		if (node.completed_at !== undefined && typeof node.completed_at !== 'string') {
			errors.push(`nodes.${nodeId}.completed_at must be a string when provided`);
		}

		if (node.artifacts !== undefined && !isStringArray(node.artifacts)) {
			errors.push(`nodes.${nodeId}.artifacts must be an array of strings when provided`);
		}

		if (node.report !== undefined && typeof node.report !== 'string') {
			errors.push(`nodes.${nodeId}.report must be a string when provided`);
		}
	}

	for (const [nodeId, value] of Object.entries(nodes)) {
		if (!isRecord(value)) {
			continue;
		}

		const dependencies = (value as Record<string, unknown>).dependencies;
		if (!Array.isArray(dependencies)) {
			continue;
		}

		for (const dependency of dependencies) {
			if (typeof dependency !== 'string') {
				continue;
			}

			if (!nodeIdSet.has(dependency)) {
				errors.push(
					`nodes.${nodeId}.dependencies references unknown node '${dependency}' in plan`,
				);
			}
		}
	}

	return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}
