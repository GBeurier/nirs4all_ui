/**
 * Native file dialog utilities using pywebview API
 */

declare global {
  interface Window {
    pywebview?: {
      api: {
        select_folder: () => Promise<string | null>;
        select_file: (fileTypes?: string[], allowMultiple?: boolean) => Promise<string | string[] | null>;
        save_file: (defaultFilename?: string, fileTypes?: string[]) => Promise<string | null>;
      };
    };
    // File System Access API (modern browsers)
    showDirectoryPicker?: (options?: any) => Promise<any>;
    showOpenFilePicker?: (options?: any) => Promise<any>;
  }
}

/**
 * Check if pywebview API is available
 */
export const isPywebviewAvailable = (): boolean => {
  const available = typeof window !== 'undefined' && !!window.pywebview?.api;
  if (typeof window !== 'undefined') {
    console.log('[FileDialogs] Pywebview check:', {
      windowPywebview: window.pywebview,
      hasApi: !!window.pywebview?.api,
      apiMethods: window.pywebview?.api ? Object.keys(window.pywebview.api) : [],
      available
    });
  }
  return available;
};

/**
 * Open native folder picker dialog
 * @returns Selected folder path or null if canceled
 */
export type FolderPickerResult = string | any | null;

export const selectFolder = async (): Promise<FolderPickerResult> => {
  console.log('[selectFolder] Called');
  if (!isPywebviewAvailable()) {
    console.log('[selectFolder] Pywebview not available, trying File System Access API');
    // Try the File System Access API when available (provides native directory picker in modern browsers)
    if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
      try {
        const handle = await window.showDirectoryPicker();
        console.log('[selectFolder] File System Access API returned:', handle);
        return handle;
      } catch (err) {
        console.warn('[selectFolder] Directory picker canceled or not available:', err);
        return null;
      }
    }

    console.warn('[selectFolder] No folder picker available');
    return null;
  }

  console.log('[selectFolder] Calling pywebview select_folder');
  try {
    const result = await window.pywebview!.api.select_folder();
    console.log('[selectFolder] Pywebview returned:', result);
    return result;
  } catch (error) {
    console.error('[selectFolder] Pywebview error:', error);
    return null;
  }
};

/**
 * Open native file picker dialog
 * @param fileTypes Array of file type descriptions (e.g., ['JSON files (*.json)'])
 * @param allowMultiple Whether to allow selecting multiple files
 * @returns Selected file path(s) or null if canceled
 */
export const selectFile = async (
  fileTypes?: string[],
  allowMultiple: boolean = false
): Promise<string | string[] | null> => {
  console.log(`[selectFile] Called with fileTypes=${fileTypes}, allowMultiple=${allowMultiple}`);
  // Prefer pywebview when available
  if (isPywebviewAvailable()) {
    try {
      const result = await window.pywebview!.api.select_file(fileTypes, allowMultiple);
      console.log('[selectFile] Pywebview returned:', result);
      return result;
    } catch (error) {
      console.error('Failed to open file dialog via pywebview:', error);
      return null;
    }
  }

  // Fallback to File System Access API in modern browsers
  if (typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') {
    try {
      // @ts-ignore
      const handles = await window.showOpenFilePicker({ multiple: false });
      if (!handles || handles.length === 0) return null;
      return handles[0];
    } catch (err) {
      console.warn('Open file picker canceled or unavailable:', err);
      return null;
    }
  }

  console.warn('No native file picker available (pywebview / File System Access API).');
  return null;
};

/**
 * Open native save file dialog
 * @param defaultFilename Default filename to suggest
 * @param fileTypes Array of file type descriptions
 * @returns Selected save path or null if canceled
 */
export const saveFile = async (
  defaultFilename = 'file.json',
  fileTypes?: string[]
): Promise<string | null> => {
  if (!isPywebviewAvailable()) {
    console.warn('pywebview API not available. Using fallback.');
    return null;
  }

  try {
    const result = await window.pywebview!.api.save_file(defaultFilename, fileTypes);
    return result;
  } catch (error) {
    console.error('Failed to open save dialog:', error);
    return null;
  }
};

/**
 * Read file contents from local file system
 * For use after selectFile returns a path
 */
export const readLocalFile = async (filePath: string | any): Promise<string> => {
  try {
    // If it's a FileSystemFileHandle (from File System Access API in browser)
    if (filePath && typeof filePath === 'object' && typeof filePath.getFile === 'function') {
      const f: File = await filePath.getFile();
      return await f.text();
    }

    // If it's a string path (pywebview), use API endpoint to read file
    if (typeof filePath === 'string') {
      // In production with pywebview, use the API endpoint to read files
      // (fetch with file:// doesn't work due to CORS)
      const response = await fetch('/api/files/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to read file');
      }

      const data = await response.json();
      return data.content;
    }

    throw new Error('Unsupported filePath type for readLocalFile');
  } catch (error) {
    console.error('Failed to read local file:', error);
    throw error;
  }
};

/**
 * Write file contents to local file system
 * For use after saveFile returns a path
 */
export const writeLocalFile = async (filePath: string, content: string): Promise<void> => {
  try {
    // In production with pywebview, use the API endpoint to write files
    if (isPywebviewAvailable() && typeof filePath === 'string') {
      const response = await fetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath, content: content })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to write file');
      }

      return;
    }

    // Fallback: use browser download approach
    console.warn('Using browser download fallback for file save.');
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split(/[\\/]/).pop() || 'file.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to write local file:', error);
    throw error;
  }
};
