// Local folder import with recursive subfolder scanning.
// Uses the browser's webkitdirectory API which provides webkitRelativePath for each file.
// Async/batched processing to avoid freezing the UI on large folders.

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm|aiff?)$/i;

export function isAudioFile(file) {
  return (file.type && file.type.startsWith('audio/')) || AUDIO_EXTENSIONS.test(file.name);
}

export function getRelativePath(file) {
  return file.webkitRelativePath || file.name;
}

// Extract root folder name from a FileList produced by webkitdirectory input.
export function getRootFolderName(fileList) {
  if (!fileList || !fileList.length) return '';
  const firstPath = fileList[0].webkitRelativePath || '';
  const separator = firstPath.includes('/') ? '/' : '\\';
  return firstPath.split(separator)[0] || '';
}

// Scan a FileList from directory input.
// Returns array of { file, relativePath, rootFolder, depth } for supported audio files.
// When recursive=false, only includes files directly in the root folder (depth=1).
export function scanFiles(fileList, { recursive = true, onProgress } = {}) {
  const allFiles = Array.from(fileList);
  const audioFiles = [];

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    if (!isAudioFile(file)) continue;

    const relPath = getRelativePath(file);
    const parts = relPath.split(/[/\\]/);
    const depth = parts.length - 1; // 0 = root folder name, 1 = direct child, 2+ = nested

    // If not recursive, only include files directly in root folder
    if (!recursive && depth > 1) continue;

    audioFiles.push({
      file,
      relativePath: parts.slice(1).join('/'),
      rootFolder: parts[0],
      depth,
    });

    if (onProgress && i % 50 === 0) {
      onProgress({ scanned: i + 1, total: allFiles.length, found: audioFiles.length });
    }
  }

  if (onProgress) {
    onProgress({ scanned: allFiles.length, total: allFiles.length, found: audioFiles.length });
  }

  return audioFiles;
}

// Async batched import with controlled concurrency.
// Yields to the event loop between batches to keep the UI responsive.
export async function importFolder(fileList, { recursive = true, onProgress, batchSize = 10 } = {}) {
  const scanned = scanFiles(fileList, { recursive, onProgress });
  const results = [];

  for (let i = 0; i < scanned.length; i += batchSize) {
    const batch = scanned.slice(i, i + batchSize);
    const batchResults = batch.map(({ file, relativePath, rootFolder }) => ({
      file,
      relativePath,
      rootFolder,
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }));
    results.push(...batchResults);

    if (onProgress) {
      onProgress({
        scanned: Math.min(i + batchSize, scanned.length),
        total: scanned.length,
        found: results.length,
        phase: 'importing',
      });
    }
    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}