import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const zip = new JSZip();

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.vite',
  '.cache'
]);

const IGNORED_FILES = new Set([
  '.DS_Store',
  'vcrlt-gamepad-complete-project.zip'
]);

function addDirectoryToZip(currentDir, relativePath = '') {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const zipPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        addDirectoryToZip(fullPath, zipPath);
      }
    } else if (entry.isFile()) {
      if (!IGNORED_FILES.has(entry.name)) {
        const fileData = fs.readFileSync(fullPath);
        zip.file(zipPath, fileData);
      }
    }
  }
}

console.log('Scanning all files in workspace...');
addDirectoryToZip(rootDir);

console.log('Generating complete zip archive...');
zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 }
}).then((buffer) => {
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const outputPath = path.join(publicDir, 'vcrlt-gamepad-complete-project.zip');
  fs.writeFileSync(outputPath, buffer);
  const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`Successfully created 100% complete project zip at: ${outputPath} (${sizeMb} MB)`);
}).catch((err) => {
  console.error('Failed to create zip:', err);
  process.exit(1);
});
