import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { parseAtpJson, type ParseResult } from './utils/atpParser';

const OPEN_VISUALIZER_COMMAND = 'atp-visualizer.openVisualizer';
const REFRESH_COMMAND = 'atp-visualizer.refresh';

type GraphDataMessage = {
	type: 'graphData';
	planUri: string | null;
	result: ParseResult;
};

type OutgoingMessage = { type: 'ready' } | { type: 'pong' } | GraphDataMessage;
type IncomingMessage = { type: 'webview-ready' } | { type: 'ping' };

/**
 * Entry point for the ATP Visualizer extension.
 */
export function activate(context: vscode.ExtensionContext): void {
	const webviewProvider = WebviewProvider.getInstance(context);

	const openVisualizerDisposable = vscode.commands.registerCommand(
		OPEN_VISUALIZER_COMMAND,
		() => webviewProvider.show(),
	);

	const refreshVisualizerDisposable = vscode.commands.registerCommand(
		REFRESH_COMMAND,
		(uri?: vscode.Uri) => webviewProvider.refresh(uri),
	);

	const watcher = vscode.workspace.createFileSystemWatcher('**/*.atp.json');
	const triggerRefresh = (uri: vscode.Uri) => {
		void vscode.commands.executeCommand(REFRESH_COMMAND, uri);
	};

	context.subscriptions.push(
		openVisualizerDisposable,
		refreshVisualizerDisposable,
		watcher,
		watcher.onDidChange(triggerRefresh),
		watcher.onDidCreate(triggerRefresh),
		watcher.onDidDelete(triggerRefresh),
	);
}

export function deactivate(): void {
	// Nothing to clean up yet.
}

class WebviewProvider {
	private static instance: WebviewProvider | undefined;

	public static getInstance(context: vscode.ExtensionContext): WebviewProvider {
		if (!WebviewProvider.instance) {
			WebviewProvider.instance = new WebviewProvider(context.extensionUri);
		}

		return WebviewProvider.instance;
	}

	private panel: vscode.WebviewPanel | undefined;
	private lastGraphMessage: GraphDataMessage | null = null;

	private constructor(private readonly extensionUri: vscode.Uri) {}

	public async show(): Promise<void> {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.One);
			return;
		}

		this.panel = vscode.window.createWebviewPanel(
			'atpVisualizer',
			'ATP Visualizer',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')],
			},
		);

		this.registerListeners();
		this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

		await this.tryAutoLoadDefaultPlan();
	}

	public async refresh(uri?: vscode.Uri): Promise<void> {
		let planUri = uri?.fsPath ?? this.lastGraphMessage?.planUri ?? null;

		if (!planUri) {
			const defaultPlanUri = await this.findDefaultPlanUri();
			planUri = defaultPlanUri?.fsPath ?? null;
		}

		const result = await this.loadPlan(planUri);
		const message: GraphDataMessage = {
			type: 'graphData',
			planUri,
			result,
		};

		this.lastGraphMessage = message;

		if (this.panel) {
			this.postMessage(message);
		}
	}

	private registerListeners(): void {
		if (!this.panel) {
			return;
		}

		this.panel.onDidDispose(() => {
			this.panel = undefined;
		});

		this.panel.webview.onDidReceiveMessage((message: IncomingMessage) => {
			this.handleIncomingMessage(message);
		});
	}

	private handleIncomingMessage(message: IncomingMessage): void {
		switch (message.type) {
			case 'webview-ready': {
				this.postMessage({ type: 'ready' });

				if (this.lastGraphMessage) {
					this.postMessage(this.lastGraphMessage);
				}
				break;
			}
			case 'ping': {
				this.postMessage({ type: 'pong' });
				break;
			}
			default:
				console.log('Received message from webview', message);
		}
	}

	private postMessage(message: OutgoingMessage): void {
		if (!this.panel) {
			return;
		}

		void this.panel.webview.postMessage(message);
	}

	private async loadPlan(planUri: string | null): Promise<ParseResult> {
		if (!planUri) {
			return {
				success: false,
				error: 'No ATP plan selected',
				issues: [],
			};
		}

		try {
			const raw = await fs.readFile(planUri, 'utf8');
			return parseAtpJson(raw);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown file system error';
			return {
				success: false,
				error: 'Failed to read ATP plan',
				issues: [message],
			};
		}
	}

	private async findDefaultPlanUri(): Promise<vscode.Uri | null> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return null;
		}

		for (const folder of workspaceFolders) {
			const candidate = vscode.Uri.joinPath(folder.uri, '.atp.json');
			try {
				await vscode.workspace.fs.stat(candidate);
				return candidate;
			} catch {
				// Ignore and keep searching.
			}
		}

		const matches = await vscode.workspace.findFiles(
			'**/*.atp.json',
			'**/{node_modules,.git}/**',
			5,
		);

		return matches[0] ?? null;
	}

	private async tryAutoLoadDefaultPlan(): Promise<void> {
		const defaultPlanUri = await this.findDefaultPlanUri();
		if (!defaultPlanUri) {
			return;
		}

		await this.refresh(defaultPlanUri);
	}

	private getHtmlForWebview(webview: vscode.Webview): string {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js'),
		);

		const nonce = getNonce();

		return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ATP Visualizer</title>
	<style>
		html, body {
			margin: 0;
			padding: 0;
			height: 100%;
			overflow: hidden;
		}

		#root {
			height: 100%;
			width: 100%;
			overflow: hidden;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
