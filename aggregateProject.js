// aggregateProject.js (summary version - Grok-readable)
import { promises as fs } from 'fs';
import { join, relative, extname } from 'path';

async function aggregateProjectSummary(dir = process.cwd(), outputFile = 'project-summary-grok.txt') {
  let output = 'PROJECT_SUMMARY_START\n';
  output += `GENERATED: ${new Date().toISOString()}\n`;
  output += 'STRUCTURE:\n';
  
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', 'logs', 'public'];
  const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yml'];
  
  let fileCount = 0;
  let totalSize = 0;

  async function walkDir(currentDir, indent = '') {
    const files = await fs.readdir(currentDir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(currentDir, file.name);
      if (file.isDirectory()) {
        if (!ignoreDirs.includes(file.name)) {
          output += `${indent}DIR: ${file.name}\n`;
          await walkDir(fullPath, indent + '  ');
        }
      } else if (allowedExtensions.includes(extname(file.name))) {
        const stats = await fs.stat(fullPath);
        const relativePath = relative(dir, fullPath);
        fileCount++;
        totalSize += stats.size;
        output += `${indent}FILE: ${relativePath}\n`;
        output += `${indent}  SIZE: ${stats.size}\n`;
        output += `${indent}  MODIFIED: ${stats.mtime.toISOString()}\n`;
      }
    }
  }

  try {
    await walkDir(dir);
    output += 'SUMMARY:\n';
    output += `  TOTAL_FILES: ${fileCount}\n`;
    output += `  TOTAL_SIZE: ${totalSize}\n`;
    output += 'PROJECT_SUMMARY_END\n';
    await fs.writeFile(outputFile, output);
    console.log(`Wrote summary to: ${outputFile} (${output.length} bytes)`);
  } catch (error) {
    console.error('Summary generation failed:', error);
    throw error;
  }
}

// Run from the project root
aggregateProjectSummary();
