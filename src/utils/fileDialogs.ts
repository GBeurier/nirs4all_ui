/**
 * Native file dialog utilities using pywebview API
 */

declare global {
  interface Window {
    pywebview?: {
      api: {
        select_folder: () => Promise<string | null>;
        select_file: (fileTypes?: string[]) => Promise<string | null>;
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
  return typeof window !== 'undefined' && !!window.pywebview?.api;
};

/**
 * Open native folder picker dialog
 * @returns Selected folder path or null if canceled
 */
export type FolderPickerResult = string | any | null;

export const selectFolder = async (): Promise<FolderPickerResult> => {
  if (!isPywebviewAvailable()) {
    // Try the File System Access API when available (provides native directory picker in modern browsers)
    if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
      try {
        const handle = await window.showDirectoryPicker();
        return handle;
      } catch (err) {
        console.warn('Directory picker canceled or not available:', err);
        return null;
      }
    }

    console.warn('pywebview API not available and File System Access API not present.');
    return null;
  }

  try {
  const result = await window.pywebview!.api.select_folder();
  return result;
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    return null;
  }
};

/**
 * Open native file picker dialog
 * @param fileTypes Array of file type descriptions (e.g., ['JSON files (*.json)'])
 * @returns Selected file path or null if canceled
 */
export const selectFile = async (fileTypes?: string[]): Promise<string | null> => {
  // Prefer pywebview when available
  if (isPywebviewAvailable()) {
    try {
      const result = await window.pywebview!.api.select_file(fileTypes);
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
  // In pywebview, we need to use fetch with file:// protocol
  try {
    // If it's a FileSystemFileHandle (from File System Access API)
    if (filePath && typeof filePath === 'object' && typeof filePath.getFile === 'function') {
      const f: File = await filePath.getFile();
      return await f.text();
    }

    // If it's a string path (pywebview), fetch via file://
    if (typeof filePath === 'string') {
      const response = await fetch(`file://${filePath}`);
      if (!response.ok) throw new Error(`Failed to read file: ${response.statusText}`);
      return await response.text();
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
  // Note: pywebview doesn't provide direct file write from JS
  // We need to use fetch POST to a local server or add a Python API method
  // For now, we'll use the browser download approach as fallback
  console.warn('Direct file write not implemented. Using download fallback.');

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePath.split(/[\\/]/).pop() || 'file.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
