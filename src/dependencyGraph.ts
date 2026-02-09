import { CodeFile } from './codeScanner';
import * as path from 'path';
import * as fs from 'fs';

export interface GraphNode {
    id: string;
    label: string;
    path: string;
    language: string;
    size?: number;
    group?: number;
    lineCount?: number;
    dependencyCount?: number;
    dependentCount?: number;
    isCircular?: boolean;
}

export type DependencyType = 'import' | 'require' | 'dynamic-import' | 'include' | 'using' | 'from' | 'export';

export interface GraphEdge {
    from: string;
    to: string;
    value: number;
    title?: string;
    type?: DependencyType;
    count?: number;
    isCircular?: boolean;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    circularDependencies: string[][];
    statistics: {
        totalNodes: number;
        totalEdges: number;
        languages: string[];
        circularCount: number;
        maxDependencies: number;
        maxDependents: number;
    };
}

export interface DependencyInfo {
    path: string;
    type: DependencyType;
    lineNumber?: number;
}

export class DependencyGraph {
    private workspacePath: string = '';
    private tsConfigPaths: Map<string, string> = new Map();

    async buildGraph(files: CodeFile[], workspacePath: string): Promise<GraphData> {
        this.workspacePath = workspacePath;
        await this.loadTsConfigPaths(workspacePath);

        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];
        const fileMap = new Map<string, CodeFile>();
        const edgeMap = new Map<string, GraphEdge>();

        // Create nodes with enhanced metadata
        files.forEach((file) => {
            const nodeId = this.getNodeId(file.relativePath);
            fileMap.set(nodeId, file);
            
            const lineCount = file.content.split('\n').length;
            
            nodes.push({
                id: nodeId,
                label: path.basename(file.relativePath),
                path: file.relativePath,
                language: file.language,
                size: file.content.length,
                lineCount: lineCount,
                group: this.getLanguageGroup(file.language),
                dependencyCount: 0,
                dependentCount: 0
            });
        });

        // Create edges with dependency types
        for (const file of files) {
            const sourceId = this.getNodeId(file.relativePath);
            const dependencies = this.extractDependencies(file, workspacePath);
            
            for (const depInfo of dependencies) {
                const targetId = this.findMatchingNode(depInfo.path, nodes, workspacePath);
                if (targetId && targetId !== sourceId) {
                    const edgeKey = `${sourceId}->${targetId}`;
                    const existingEdge = edgeMap.get(edgeKey);
                    
                    if (existingEdge) {
                        // Increment count and add type
                        existingEdge.count = (existingEdge.count || 1) + 1;
                        existingEdge.value = Math.min(existingEdge.count || 1, 5); // Cap at 5 for visualization
                    } else {
                        const newEdge: GraphEdge = {
                            from: sourceId,
                            to: targetId,
                            value: 1,
                            count: 1,
                            type: depInfo.type,
                            title: `${path.basename(file.relativePath)} → ${path.basename(depInfo.path)} (${depInfo.type})`
                        };
                        edgeMap.set(edgeKey, newEdge);
                        edges.push(newEdge);
                    }
                }
            }
        }

        // Update node dependency counts
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.from);
            const targetNode = nodes.find(n => n.id === edge.to);
            if (sourceNode) sourceNode.dependencyCount = (sourceNode.dependencyCount || 0) + 1;
            if (targetNode) targetNode.dependentCount = (targetNode.dependentCount || 0) + 1;
        });

        // Detect circular dependencies
        const circularDependencies = this.detectCircularDependencies(nodes, edges);
        
        // Mark circular nodes and edges
        circularDependencies.forEach(circle => {
            circle.forEach(nodeId => {
                const node = nodes.find(n => n.id === nodeId);
                if (node) node.isCircular = true;
            });
            
            for (let i = 0; i < circle.length; i++) {
                const from = circle[i];
                const to = circle[(i + 1) % circle.length];
                const edge = edges.find(e => e.from === from && e.to === to);
                if (edge) edge.isCircular = true;
            }
        });

        // Calculate statistics
        const languages = Array.from(new Set(nodes.map(n => n.language)));
        const maxDependencies = Math.max(...nodes.map(n => n.dependencyCount || 0), 0);
        const maxDependents = Math.max(...nodes.map(n => n.dependentCount || 0), 0);

        return {
            nodes,
            edges,
            circularDependencies,
            statistics: {
                totalNodes: nodes.length,
                totalEdges: edges.length,
                languages,
                circularCount: circularDependencies.length,
                maxDependencies,
                maxDependents
            }
        };
    }

    private async loadTsConfigPaths(workspacePath: string): Promise<void> {
        try {
            const tsConfigPath = path.join(workspacePath, 'tsconfig.json');
            if (fs.existsSync(tsConfigPath)) {
                const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf-8');
                const tsConfig = JSON.parse(tsConfigContent);
                if (tsConfig.compilerOptions?.paths) {
                    Object.entries(tsConfig.compilerOptions.paths).forEach(([key, value]) => {
                        if (Array.isArray(value) && value.length > 0) {
                            this.tsConfigPaths.set(key.replace('/*', ''), value[0].replace('/*', ''));
                        }
                    });
                }
            }
        } catch (error) {
            // Ignore tsconfig parsing errors
        }
    }

    private getNodeId(relativePath: string): string {
        return relativePath.replace(/\\/g, '/');
    }

    private getLanguageGroup(language: string): number {
        const groups: { [key: string]: number } = {
            'typescript': 1,
            'javascript': 1,
            'python': 2,
            'java': 3,
            'csharp': 4,
            'cpp': 5,
            'c': 5,
            'go': 6,
            'rust': 7,
            'ruby': 8,
            'php': 9,
            'swift': 10,
            'kotlin': 11,
            'scala': 12,
            'dart': 13,
            'vue': 14,
            'svelte': 15
        };
        return groups[language] || 0;
    }

    private extractDependencies(file: CodeFile, workspacePath: string): DependencyInfo[] {
        const dependencies: DependencyInfo[] = [];
        const content = file.content;
        const lines = content.split('\n');
        const dir = path.dirname(file.path);

        // JavaScript/TypeScript imports - enhanced patterns
        const jsImportRegex = /import\s+(?:(?:\*\s+as\s+\w+)|(?:\{[^}]*\})|(?:\w+)|(?:\w+\s*,\s*\{[^}]*\}))\s+from\s+['"]([^'"]+)['"]/g;
        const jsRequireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        const jsDynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        const jsExportFromRegex = /export\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        
        // Python imports - enhanced
        const pyImportRegex = /^import\s+([\w.]+)/gm;
        const pyFromImportRegex = /^from\s+([\w.]+)\s+import/gm;
        
        // Java/C# imports
        const javaImportRegex = /^import\s+([\w.]+);/gm;
        const csharpUsingRegex = /^using\s+([\w.]+);/gm;
        
        // C/C++ includes
        const cIncludeRegex = /#include\s+[<"]([^>"]+)[>"]/g;
        
        // Go imports
        const goImportRegex = /import\s+(?:\([^)]*\)|['"]([^'"]+)['"])/g;
        const goImportBlockRegex = /import\s*\(([\s\S]*?)\)/g;
        
        // Rust use statements
        const rustUseRegex = /^use\s+([\w:]+)/gm;

        let match;
        
        // JavaScript/TypeScript
        if (file.language === 'javascript' || file.language === 'typescript') {
            // Standard imports
            while ((match = jsImportRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = content.substring(0, match.index).split('\n').length;
                const resolved = this.resolveImportPath(importPath, dir, workspacePath, ['.ts', '.tsx', '.js', '.jsx']);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'import', lineNumber });
                }
            }
            
            // require() statements
            while ((match = jsRequireRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = content.substring(0, match.index).split('\n').length;
                const resolved = this.resolveImportPath(importPath, dir, workspacePath, ['.ts', '.tsx', '.js', '.jsx']);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'require', lineNumber });
                }
            }
            
            // Dynamic imports
            while ((match = jsDynamicImportRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = content.substring(0, match.index).split('\n').length;
                const resolved = this.resolveImportPath(importPath, dir, workspacePath, ['.ts', '.tsx', '.js', '.jsx']);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'dynamic-import', lineNumber });
                }
            }
            
            // Re-exports
            while ((match = jsExportFromRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = content.substring(0, match.index).split('\n').length;
                const resolved = this.resolveImportPath(importPath, dir, workspacePath, ['.ts', '.tsx', '.js', '.jsx']);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'export', lineNumber });
                }
            }
        }
        
        // Python
        if (file.language === 'python') {
            while ((match = pyImportRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = match.index ? content.substring(0, match.index).split('\n').length : 1;
                const resolved = this.resolvePythonImport(importPath, dir, workspacePath);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'import', lineNumber });
                }
            }
            while ((match = pyFromImportRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = match.index ? content.substring(0, match.index).split('\n').length : 1;
                const resolved = this.resolvePythonImport(importPath, dir, workspacePath);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'from', lineNumber });
                }
            }
        }
        
        // Java
        if (file.language === 'java') {
            while ((match = javaImportRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = match.index ? content.substring(0, match.index).split('\n').length : 1;
                const resolved = this.resolveJavaImport(importPath, dir, workspacePath);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'import', lineNumber });
                }
            }
        }
        
        // C#
        if (file.language === 'csharp') {
            while ((match = csharpUsingRegex.exec(content)) !== null) {
                const importPath = match[1];
                const lineNumber = match.index ? content.substring(0, match.index).split('\n').length : 1;
                const resolved = this.resolveJavaImport(importPath, dir, workspacePath);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'using', lineNumber });
                }
            }
        }
        
        // C/C++
        if (file.language === 'c' || file.language === 'cpp') {
            while ((match = cIncludeRegex.exec(content)) !== null) {
                const includePath = match[1];
                const lineNumber = content.substring(0, match.index).split('\n').length;
                const resolved = this.resolveIncludePath(includePath, dir, workspacePath);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'include', lineNumber });
                }
            }
        }
        
        // Go
        if (file.language === 'go') {
            // Single import
            while ((match = goImportRegex.exec(content)) !== null) {
                if (match[1]) {
                    const importPath = match[1];
                    const lineNumber = content.substring(0, match.index).split('\n').length;
                    const resolved = this.resolveImportPath(importPath, dir, workspacePath, ['.go']);
                    if (resolved) {
                        dependencies.push({ path: resolved, type: 'import', lineNumber });
                    }
                }
            }
            
            // Import block
            let importBlockMatch;
            while ((importBlockMatch = goImportBlockRegex.exec(content)) !== null) {
                const blockContent = importBlockMatch[1];
                const blockRegex = /['"]([^'"]+)['"]/g;
                let blockMatch;
                while ((blockMatch = blockRegex.exec(blockContent)) !== null) {
                    const importPath = blockMatch[1];
                    const resolved = this.resolveImportPath(importPath, dir, workspacePath, ['.go']);
                    if (resolved) {
                        dependencies.push({ path: resolved, type: 'import' });
                    }
                }
            }
        }
        
        // Rust
        if (file.language === 'rust') {
            while ((match = rustUseRegex.exec(content)) !== null) {
                const importPath = match[1].replace(/::/g, '/');
                const lineNumber = match.index ? content.substring(0, match.index).split('\n').length : 1;
                const resolved = this.resolveRustImport(importPath, dir, workspacePath);
                if (resolved) {
                    dependencies.push({ path: resolved, type: 'import', lineNumber });
                }
            }
        }

        return dependencies;
    }

    private resolveImportPath(importPath: string, currentDir: string, workspacePath: string, extensions: string[]): string | null {
        // Check TypeScript path aliases first
        for (const [alias, aliasPath] of this.tsConfigPaths.entries()) {
            if (importPath.startsWith(alias)) {
                const relativePath = importPath.replace(alias, aliasPath);
                const fullPath = path.join(workspacePath, relativePath);
                for (const ext of extensions) {
                    const withExt = fullPath + ext;
                    if (this.fileExists(withExt)) {
                        return path.relative(workspacePath, withExt).replace(/\\/g, '/');
                    }
                    const indexPath = path.join(fullPath, 'index' + ext);
                    if (this.fileExists(indexPath)) {
                        return path.relative(workspacePath, indexPath).replace(/\\/g, '/');
                    }
                }
            }
        }
        
        // Skip node_modules and external packages
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
            // Relative import
            const fullPath = path.resolve(currentDir, importPath);
            for (const ext of extensions) {
                const withExt = fullPath + ext;
                if (this.fileExists(withExt)) {
                    return path.relative(workspacePath, withExt).replace(/\\/g, '/');
                }
                const indexPath = path.join(fullPath, 'index' + ext);
                if (this.fileExists(indexPath)) {
                    return path.relative(workspacePath, indexPath).replace(/\\/g, '/');
                }
            }
            // Try without extension
            if (this.fileExists(fullPath)) {
                return path.relative(workspacePath, fullPath).replace(/\\/g, '/');
            }
        }
        return null;
    }
    
    private resolveRustImport(importPath: string, currentDir: string, workspacePath: string): string | null {
        const parts = importPath.split('/');
        let searchPath = currentDir;
        
        // Try to find lib.rs or mod.rs
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const potentialPath = path.join(searchPath, part);
            const libFile = path.join(potentialPath, 'lib.rs');
            const modFile = path.join(potentialPath, 'mod.rs');
            const rsFile = potentialPath + '.rs';
            
            if (this.fileExists(libFile)) {
                return path.relative(workspacePath, libFile).replace(/\\/g, '/');
            }
            if (this.fileExists(modFile)) {
                searchPath = potentialPath;
            } else if (this.fileExists(rsFile)) {
                return path.relative(workspacePath, rsFile).replace(/\\/g, '/');
            } else {
                return null;
            }
        }
        
        return null;
    }

    private resolvePythonImport(importPath: string, currentDir: string, workspacePath: string): string | null {
        const parts = importPath.split('.');
        let searchPath = currentDir;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const potentialPath = path.join(searchPath, part);
            const pyFile = potentialPath + '.py';
            const initFile = path.join(potentialPath, '__init__.py');
            
            if (this.fileExists(pyFile)) {
                return path.relative(workspacePath, pyFile).replace(/\\/g, '/');
            }
            if (this.fileExists(initFile)) {
                searchPath = potentialPath;
            } else {
                return null;
            }
        }
        
        return null;
    }

    private resolveJavaImport(importPath: string, currentDir: string, workspacePath: string): string | null {
        const parts = importPath.split('.');
        const className = parts[parts.length - 1];
        const packagePath = parts.slice(0, -1).join(path.sep);
        
        // Search in current directory and parent directories
        let searchDir = currentDir;
        for (let i = 0; i < 10; i++) {
            const potentialPath = path.join(searchDir, packagePath, className + '.java');
            if (this.fileExists(potentialPath)) {
                return path.relative(workspacePath, potentialPath).replace(/\\/g, '/');
            }
            const parent = path.dirname(searchDir);
            if (parent === searchDir) break;
            searchDir = parent;
        }
        
        return null;
    }

    private resolveIncludePath(includePath: string, currentDir: string, workspacePath: string): string | null {
        const fullPath = path.resolve(currentDir, includePath);
        const extensions = ['.h', '.hpp', '.c', '.cpp'];
        
        for (const ext of extensions) {
            const withExt = fullPath + ext;
            if (this.fileExists(withExt)) {
                return path.relative(workspacePath, withExt).replace(/\\/g, '/');
            }
        }
        
        if (this.fileExists(fullPath)) {
            return path.relative(workspacePath, fullPath).replace(/\\/g, '/');
        }
        
        return null;
    }

    private findMatchingNode(depPath: string, nodes: GraphNode[], workspacePath: string): string | null {
        // Try exact match first
        const exactMatch = nodes.find(n => n.path === depPath);
        if (exactMatch) return exactMatch.id;
        
        // Try partial match
        const depBasename = path.basename(depPath);
        const match = nodes.find(n => path.basename(n.path) === depBasename);
        if (match) return match.id;
        
        return null;
    }

    private detectCircularDependencies(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
        const circular: string[][] = [];
        const visited = new Set<string>();
        const recStack = new Set<string>();
        const adjList = new Map<string, string[]>();
        
        // Build adjacency list
        edges.forEach(edge => {
            if (!adjList.has(edge.from)) {
                adjList.set(edge.from, []);
            }
            adjList.get(edge.from)!.push(edge.to);
        });
        
        const dfs = (nodeId: string, path: string[]): void => {
            if (recStack.has(nodeId)) {
                // Found a cycle
                const cycleStart = path.indexOf(nodeId);
                if (cycleStart !== -1) {
                    const cycle = path.slice(cycleStart).concat(nodeId);
                    // Check if this cycle is already found
                    const cycleKey = cycle.sort().join('->');
                    if (!circular.some(c => c.sort().join('->') === cycleKey)) {
                        circular.push(cycle);
                    }
                }
                return;
            }
            
            if (visited.has(nodeId)) {
                return;
            }
            
            visited.add(nodeId);
            recStack.add(nodeId);
            
            const neighbors = adjList.get(nodeId) || [];
            neighbors.forEach(neighbor => {
                dfs(neighbor, [...path, nodeId]);
            });
            
            recStack.delete(nodeId);
        };
        
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id, []);
            }
        });
        
        return circular;
    }

    private fileExists(filePath: string): boolean {
        try {
            return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        } catch {
            return false;
        }
    }
}
