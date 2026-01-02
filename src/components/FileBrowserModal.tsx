import { useState, useEffect } from 'react';
import { X, Folder, File, ChevronRight, ChevronDown } from 'feather-icons-react';
import type { FileNode } from '../types';
import { apiClient } from '../api/client';
import { selectFolder, selectFile } from '../utils/fileDialogs';

interface FileBrowserModalProps {
  onSelect: (path: string) => void;
  onClose: () => void;
  mode?: 'file' | 'folder';
}

const FileBrowserModal = ({ onSelect, onClose, mode = 'folder' }: FileBrowserModalProps) => {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [useNativeDialog, setUseNativeDialog] = useState(true);

  useEffect(() => {
    if (!useNativeDialog) {
      loadDirectory(currentPath);
    }
  }, [currentPath, useNativeDialog]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const response: any = await apiClient.browseDirectory(path);
      setFiles(response.files || []);
      setCurrentPath(response.path || path);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNativeSelect = async () => {
    setLoading(true);
    try {
      const response: any = mode === 'folder' ? await selectFolder() : await selectFile();

      // No selection or user canceled
      if (!response) {
        setUseNativeDialog(false);
        return;
      }

      // If pywebview returned a path string, use it
      if (typeof response === 'string') {
        onSelect(response);
        return;
      }

      // If File System Access API returned a handle (object), we cannot extract
      // an absolute OS path to send to the backend for security reasons.
      // Inform the user and fallback to the JS file browser UI.
      if (typeof response === 'object') {
        console.warn('Received a FileSystem handle from browser; cannot derive absolute path to pass to backend.');
        alert(
          'Your browser returned a sandboxed file handle that cannot be used to set a workspace path.\n\n' +
          'To use the full workspace/dataset linking features (that require real file system paths), run the desktop app (see README) or use the "Link Dataset" button to upload files.'
        );
        setUseNativeDialog(false);
        return;
      }

      setUseNativeDialog(false);
    } catch (error) {
      console.error('Native dialog failed:', error);
      setUseNativeDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSelect = () => {
    if (mode === 'folder') {
      const pathToReturn = selectedPath || currentPath;
      if (!pathToReturn) return;
      onSelect(pathToReturn);
    } else {
      if (!selectedPath) return;
      onSelect(selectedPath);
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderFileNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDirectory(node.path);
            }
            setSelectedPath(node.path);
          }}
        >
          {node.type === 'directory' && (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-1 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-gray-500" />
              )}
              <Folder className="h-4 w-4 mr-2 text-blue-500" />
            </>
          )}
          {node.type === 'file' && (
            <File className="h-4 w-4 mr-2 ml-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-900">{node.name}</span>
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Try native dialog when requested (triggers on mount since useNativeDialog defaults to true)
  useEffect(() => {
    if (useNativeDialog) {
      handleNativeSelect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNativeDialog]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{mode === 'folder' ? 'Select Folder' : 'Select File'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Current Path */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center text-sm">
            <span className="text-gray-500 mr-2">Path:</span>
            <input
              type="text"
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadDirectory(currentPath)}
              className="flex-1 text-sm font-mono bg-white border-gray-300 rounded-md"
              placeholder="Enter path or browse below"
            />
          </div>
        </div>

        {/* File Browser */}
        <div className="overflow-y-auto max-h-[calc(80vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">No files found</div>
            </div>
          ) : (
            <div className="py-2">
              {files.map((file) => renderFileNode(file))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={() => handleNativeSelect()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Use system {mode === 'folder' ? 'folder' : 'file'} picker
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelect}
              disabled={mode === 'file' ? !selectedPath : !(selectedPath || currentPath)}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowserModal;
