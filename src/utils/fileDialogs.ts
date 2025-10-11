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
export const selectFolder = async (): Promise<string | null> => {
  if (!isPywebviewAvailable()) {
    console.warn('pywebview API not available. Using fallback.');
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
  if (!isPywebviewAvailable()) {
    console.warn('pywebview API not available. Using fallback.');
    return null;
  }

  try {
    const result = await window.pywebview!.api.select_file(fileTypes);
    return result;
  } catch (error) {
    console.error('Failed to open file dialog:', error);
    return null;
  }
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
export const readLocalFile = async (filePath: string): Promise<string> => {
  // In pywebview, we need to use fetch with file:// protocol
  try {
    const response = await fetch(`file://${filePath}`);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    return await response.text();
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
