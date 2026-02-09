import * as vscode from 'vscode';
import { CodeScanner } from './codeScanner';
import { DependencyGraph } from './dependencyGraph';
import { VisualizationPanel } from './visualizationPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Visualizer extension is now active!');

    const disposable = vscode.commands.registerCommand('codeVisualizer.showVisualization', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceFolder = workspaceFolders[0];
        const workspacePath = workspaceFolder.uri.fsPath;

        vscode.window.showInformationMessage('Scanning code...');

        try {
            // Scan code files
            const scanner = new CodeScanner();
            const files = await scanner.scanWorkspace(workspacePath);
            
            // Build dependency graph
            const graph = new DependencyGraph();
            const graphData = await graph.buildGraph(files, workspacePath);

            // Show visualization
            VisualizationPanel.createOrShow(context.extensionUri, graphData);
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
            console.error(error);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
