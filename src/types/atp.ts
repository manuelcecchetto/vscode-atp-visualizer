/**
 * Type definitions for the Agent Task Protocol (ATP) v1.3 schema.
 */
export enum NodeStatus {
	LOCKED = 'LOCKED',
	READY = 'READY',
	CLAIMED = 'CLAIMED',
	COMPLETED = 'COMPLETED',
	FAILED = 'FAILED',
}

export enum ProjectStatus {
	DRAFT = 'DRAFT',
	ACTIVE = 'ACTIVE',
	PAUSED = 'PAUSED',
	ARCHIVED = 'ARCHIVED',
}

// ISO 8601 date-time strings as defined by the schema.
export type IsoDateTimeString = string;

export interface AtpMeta {
	project_name: string;
	version: '1.3';
	created_at?: IsoDateTimeString;
	project_status: ProjectStatus;
}

export interface AtpNode {
	title: string;
	instruction: string;
	context?: string;
	dependencies: string[];
	status: NodeStatus;
	worker_id?: string;
	started_at?: IsoDateTimeString;
	completed_at?: IsoDateTimeString;
	artifacts?: string[];
	report?: string;
}

export interface AtpGraph {
	meta: AtpMeta;
	nodes: Record<string, AtpNode>;
}
