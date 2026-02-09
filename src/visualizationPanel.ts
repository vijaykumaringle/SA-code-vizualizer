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
        // Convert graph data to JSON string, escaping for HTML
        const graphDataJson = JSON.stringify(graphData).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Get the nonce for Content Security Policy
        const nonce = this.getNonce();
        
        // Load HTML template
        const htmlPath = path.join(__dirname, 'visualizationPanel.html');
        let html = '';
        try {
            html = fs.readFileSync(htmlPath, 'utf-8');
        } catch (error) {
            // Fallback to inline HTML if file doesn't exist
            return this.getInlineHtml(webview, graphData, graphDataJson, nonce);
        }
        
        // Replace placeholders
        html = html.replace(/\{\{NONCE\}\}/g, nonce);
        html = html.replace(/\{\{GRAPHDATA\}\}/g, graphDataJson);
        html = html.replace(/\{\{CSP_SOURCE\}\}/g, webview.cspSource);
        
        return html;
    }
    
    private getInlineHtml(webview: vscode.Webview, graphData: GraphData, graphDataJson: string, nonce: string): string {
        // Fallback inline HTML (simplified version)
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://unpkg.com; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
    <title>Code Visualization</title>
</head>
<body>
    <p>Loading visualization...</p>
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
