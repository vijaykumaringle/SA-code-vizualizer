import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface CodeFile {
    path: string;
    relativePath: string;
    content: string;
    language: string;
}

export class CodeScanner {
    private readonly supportedExtensions = [
        '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.cpp', '.c', '.h', '.hpp',
        '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.dart', '.vue', '.svelte'
    ];

    private readonly ignorePatterns = [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.vscode',
        'out',
        'bin',
        'obj',
        '__pycache__',
        '.next',
        '.cache'
    ];

    async scanWorkspace(workspacePath: string): Promise<CodeFile[]> {
        const files: CodeFile[] = [];
        
        await this.scanDirectory(workspacePath, workspacePath, files);
        
        return files;
    }

    private async scanDirectory(rootPath: string, currentPath: string, files: CodeFile[]): Promise<void> {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(rootPath, fullPath);

            // Skip ignored patterns
            if (this.shouldIgnore(relativePath)) {
                continue;
            }

            if (entry.isDirectory()) {
                await this.scanDirectory(rootPath, fullPath, files);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (this.supportedExtensions.includes(ext)) {
                    try {
                        const content = await fs.promises.readFile(fullPath, 'utf-8');
                        const language = this.getLanguageFromExtension(ext);
                        files.push({
                            path: fullPath,
                            relativePath: relativePath,
                            content: content,
                            language: language
                        });
                    } catch (error) {
                        // Skip files that can't be read
                        console.warn(`Could not read file ${fullPath}: ${error}`);
                    }
                }
            }
        }
    }

    private shouldIgnore(relativePath: string): boolean {
        const parts = relativePath.split(path.sep);
        return this.ignorePatterns.some(pattern => parts.includes(pattern));
    }

    private getLanguageFromExtension(ext: string): string {
        const languageMap: { [key: string]: string } = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.java': 'java',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.dart': 'dart',
            '.vue': 'vue',
            '.svelte': 'svelte'
        };
        return languageMap[ext] || 'unknown';
    }
}
