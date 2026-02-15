import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GraphData } from './dependencyGraph';

export class VisualizationPanel {
    public static currentPanel: VisualizationPanel | undefined;
    public static readonly viewType = 'codeVisualizer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, graphData: GraphData) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (VisualizationPanel.currentPanel) {
            VisualizationPanel.currentPanel._panel.reveal(column);
            VisualizationPanel.currentPanel._update(graphData);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            VisualizationPanel.viewType,
            'Code Visualization',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        VisualizationPanel.currentPanel = new VisualizationPanel(panel, extensionUri, graphData);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, graphData: GraphData) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(graphData);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'openFile':
                        const filePath = message.path;
                        if (filePath) {
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                            if (workspaceFolders && workspaceFolders.length > 0) {
                                const fullPath = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
                                try {
                                    const document = await vscode.workspace.openTextDocument(fullPath);
                                    await vscode.window.showTextDocument(document);
                                } catch (error) {
                                    vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
                                }
                            }
                        }
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        VisualizationPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update(graphData: GraphData) {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview, graphData);
    }

    private _getHtmlForWebview(webview: vscode.Webview, graphData: GraphData) {
        const graphDataJson = JSON.stringify(graphData).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const nonce = this.getNonce();

        // Prefer full HTML from extension if we have local vis-network (no CSP issues)
        const htmlUri = vscode.Uri.joinPath(this._extensionUri, 'src', 'visualizationPanel.html');
        const mediaScriptUri = vscode.Uri.joinPath(this._extensionUri, 'media', 'vis-network.min.js');
        try {
            if (fs.existsSync(mediaScriptUri.fsPath)) {
                const html = fs.readFileSync(htmlUri.fsPath, 'utf-8');
                const scriptUri = webview.asWebviewUri(mediaScriptUri).toString();
                return html
                    .replace(/\{\{NONCE\}\}/g, nonce)
                    .replace(/\{\{GRAPHDATA\}\}/g, graphDataJson)
                    .replace(/\{\{CSP_SOURCE\}\}/g, webview.cspSource)
                    .replace(/\{\{SCRIPT_URI\}\}/g, scriptUri);
            }
        } catch {
            /* use inline */
        }
        // Self-contained inline HTML (works without external scripts or media folder)
        return this.getInlineHtml(webview, graphData, nonce);
    }

    private getInlineHtml(webview: vscode.Webview, graphData: GraphData, nonce: string): string {
        const graphDataStr = JSON.stringify(graphData);
        const graphDataEscaped = JSON.stringify(graphDataStr);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Code Visualization</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 15px; overflow: hidden; }
        #header { margin-bottom: 10px; }
        #header h1 { margin: 0 0 8px 0; font-size: 18px; }
        #stats { font-size: 12px; color: var(--vscode-descriptionForeground); }
        #canvas { border: 1px solid var(--vscode-panel-border); border-radius: 4px; display: block; background: var(--vscode-editor-background); }
        .controls { margin-bottom: 10px; }
        button { padding: 6px 12px; margin-right: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .info-panel { position: absolute; top: 80px; right: 20px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 12px; max-width: 320px; display: none; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .info-panel.show { display: block; }
        .info-panel h3 { margin: 0 0 8px 0; font-size: 13px; }
        .info-panel p { margin: 4px 0; font-size: 12px; }
        .file-path { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline; }
    </style>
</head>
<body>
    <div id="header">
        <h1>Code Visualization</h1>
        <div id="stats">Nodes: <strong>${graphData.nodes.length}</strong> | Edges: <strong>${graphData.edges.length}</strong></div>
    </div>
    <div class="controls">
        <button onclick="fitView()">Fit</button>
        <button onclick="resetZoom()">Reset zoom</button>
        <button onclick="exportData()">Export JSON</button>
    </div>
    <canvas id="canvas"></canvas>
    <div id="infoPanel" class="info-panel">
        <button onclick="closeInfo()" style="float:right;background:none;border:none;cursor:pointer;color:var(--vscode-foreground)">&times;</button>
        <h3 id="infoTitle"></h3>
        <div id="infoContent"></div>
    </div>
    <script nonce="${nonce}">
        const graphData = JSON.parse(${graphDataEscaped});
        const vscode = acquireVsCodeApi();
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.offsetWidth || 800;
        let height = canvas.height = Math.max(400, (window.innerHeight || 600) - 180);
        let scale = 1, offsetX = 0, offsetY = 0, drag = null, nodeDrag = null;
        const nodes = graphData.nodes.map((n, i) => ({
            ...n,
            x: (i % 10) * 80 - 320,
            y: Math.floor(i / 10) * 60 - 200,
            vx: 0, vy: 0
        }));
        const edges = graphData.edges;
        const langColors = { typescript:'#3178c6', javascript:'#f7df1e', python:'#3776ab', java:'#ed8b00', csharp:'#239120', go:'#00add8', rust:'#000', vue:'#4fc08d' };
        function color(lang) { return langColors[lang] || '#808080'; }
        function draw() {
            ctx.fillStyle = 'var(--vscode-editor-background)';
            ctx.fillRect(0, 0, width, height);
            ctx.save();
            ctx.translate(width/2 + offsetX, height/2 + offsetY);
            ctx.scale(scale, scale);
            edges.forEach(e => {
                const a = nodes.find(n => n.id === e.from);
                const b = nodes.find(n => n.id === e.to);
                if (!a || !b) return;
                ctx.beginPath();
                ctx.strokeStyle = 'var(--vscode-descriptionForeground)';
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            });
            nodes.forEach(n => {
                ctx.beginPath();
                ctx.fillStyle = color(n.language);
                ctx.arc(n.x, n.y, 8, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = 'var(--vscode-foreground)';
                ctx.stroke();
                ctx.fillStyle = 'var(--vscode-foreground)';
                ctx.font = '10px var(--vscode-font-family)';
                ctx.fillText(n.label, n.x + 10, n.y + 4);
            });
            ctx.restore();
        }
        function step() {
            const C = 0.01, rep = 150, spr = 0.02;
            nodes.forEach((a, i) => {
                nodes.forEach((b, j) => {
                    if (i === j) return;
                    const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 0.01;
                    const f = rep / (d * d);
                    a.vx += (dx / d) * f * C;
                    a.vy += (dy / d) * f * C;
                });
            });
            edges.forEach(e => {
                const a = nodes.find(n => n.id === e.from);
                const b = nodes.find(n => n.id === e.to);
                if (!a || !b) return;
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
                a.vx += (dx * spr) * C;
                a.vy += (dy * spr) * C;
                b.vx -= (dx * spr) * C;
                b.vy -= (dy * spr) * C;
            });
            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy;
                n.vx *= 0.9; n.vy *= 0.9;
            });
            draw();
        }
        let anim = setInterval(step, 30);
        function fitView() {
            const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
            const w = maxX - minX || 200, h = maxY - minY || 200;
            scale = Math.min(width / (w + 80), height / (h + 80), 1.5);
            offsetX = -(minX + maxX) / 2 * scale;
            offsetY = -(minY + maxY) / 2 * scale;
            draw();
        }
        function resetZoom() { scale = 1; offsetX = 0; offsetY = 0; draw(); }
        function getMouse(e) {
            const rect = canvas.getBoundingClientRect();
            return { x: (e.clientX - rect.left - width/2 - offsetX) / scale, y: (e.clientY - rect.top - height/2 - offsetY) / scale };
        }
        canvas.addEventListener('mousedown', e => {
            const m = getMouse(e);
            const hit = nodes.find(n => Math.hypot(n.x - m.x, n.y - m.y) < 12);
            if (hit) nodeDrag = hit;
            else drag = { x: e.clientX - offsetX, y: e.clientY - offsetY };
        });
        canvas.addEventListener('mousemove', e => {
            if (nodeDrag) { nodeDrag.x = getMouse(e).x; nodeDrag.y = getMouse(e).y; draw(); }
            else if (drag) { offsetX = e.clientX - drag.x; offsetY = e.clientY - drag.y; draw(); }
        });
        canvas.addEventListener('mouseup', () => { nodeDrag = null; drag = null; });
        canvas.addEventListener('wheel', e => { e.preventDefault(); scale *= e.deltaY > 0 ? 0.9 : 1.1; scale = Math.max(0.2, Math.min(5, scale)); draw(); }, { passive: false });
        canvas.addEventListener('click', e => {
            const m = getMouse(e);
            const hit = nodes.find(n => Math.hypot(n.x - m.x, n.y - m.y) < 12);
            if (hit) {
                document.getElementById('infoTitle').textContent = hit.label;
                const pathEsc = hit.path.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                document.getElementById('infoContent').innerHTML = '<p class="file-path" onclick="openFile(' + JSON.stringify(hit.path) + ')">' + pathEsc + '</p><p>Language: ' + hit.language + '</p><p>Size: ' + (hit.size || 0) + ' bytes</p>';
                document.getElementById('infoPanel').classList.add('show');
            }
        });
        window.openFile = function(path) { vscode.postMessage({ command: 'openFile', path: path }); };
        function closeInfo() { document.getElementById('infoPanel').classList.remove('show'); }
        function exportData() { const a = document.createElement('a'); a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(graphData, null, 2)); a.download = 'code-visualization.json'; a.click(); }
        window.addEventListener('resize', () => { width = canvas.width = canvas.offsetWidth || 800; height = canvas.height = Math.max(400, (window.innerHeight || 600) - 180); draw(); });
        setTimeout(fitView, 500);
    </script>
</body>
</html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
