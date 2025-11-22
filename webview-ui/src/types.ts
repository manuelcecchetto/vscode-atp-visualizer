export interface VSCodeAPI {
	postMessage(message: unknown): void;
	getState<T>(): T | undefined;
	setState<T>(state: T): void;
}

declare global {
	// This is injected by VS Code at runtime inside the webview.
	// eslint-disable-next-line no-var
	var acquireVsCodeApi: undefined | (() => VSCodeAPI);
}

export function getVsCodeApi(): VSCodeAPI {
	if (typeof acquireVsCodeApi === 'function') {
		return acquireVsCodeApi();
	}

	throw new Error('VS Code API is not available in this context.');
}
