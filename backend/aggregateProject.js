const fs = require('fs').promises;
const path = require('path');

async function aggregateProject(dir, outputFileBase) {
  let output = '';
  let fileCount = 0;
  let currentSize = 0;
  const maxSize = 1000000; // ~1MB per file
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', 'logs']; // Excluded dirs
  const allowedExtensions = ['.js', '.ts', '.json', '.md', '.txt']; // File types

  async function walkDir(currentDir) {
    const files = await fs.readdir(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(file)) {
          await walkDir(fullPath);
        }
      } else if (allowedExtensions.includes(path.extname(file))) {
        const content = await fs.readFile(fullPath, 'utf8');
        const fileSection = `\n\n--- File: ${path.relative(dir, fullPath)} ---\n\n${content}`;
        
        if (currentSize + fileSection.length > maxSize && output.length > 0) {
          await fs.writeFile(`${outputFileBase}-${fileCount}.txt`, output);
          console.log(`Wrote part ${fileCount} to ${outputFileBase}-${fileCount}.txt`);
          output = '';
          currentSize = 0;
          fileCount++;
        }
        
        output += fileSection;
        currentSize += fileSection.length;
      }
    }
  }

  await walkDir(dir);
  if (output.length > 0) {
    const finalFile = fileCount === 0 ? `${outputFileBase}.txt` : `${outputFileBase}-${fileCount}.txt`;
    await fs.writeFile(finalFile, output);
    console.log(`Wrote ${finalFile}`);
  }
  console.log(`Aggregation complete. Total parts: ${fileCount + 1}`);
}

aggregateProject(process.cwd(), 'backend-context');
