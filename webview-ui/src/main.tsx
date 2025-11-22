import { createRoot } from 'react-dom/client';
import App from './App';
import { getVsCodeApi } from './types';

const vscode = getVsCodeApi();

const container = document.getElementById('root');
if (container) {
	document.body.style.margin = '0';
	document.body.style.height = '100vh';
	document.body.style.overflow = 'hidden';
	document.documentElement.style.height = '100%';
	document.documentElement.style.overflow = 'hidden';
	container.style.height = '100%';
	container.style.overflow = 'hidden';

	const root = createRoot(container);
	root.render(<App vscode={vscode} />);
}
