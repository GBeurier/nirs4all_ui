import { useState, useEffect, useRef } from 'react';
import { X, Folder } from 'feather-icons-react';
import { selectFolder, isPywebviewAvailable } from '../utils/fileDialogs';

interface DatasetConfig {
  path: string;
  hasTrain: boolean;
  hasTest: boolean;
  hasX: boolean;
  hasY: boolean;
  hasMetadata: boolean;
  delimiter: string;
  decimalSeparator: string;
  header: string;
}

interface AddDatasetModalProps {
  onClose: () => void;
  onAdd: (path: string, config?: any) => Promise<void>;
}

const AddDatasetModal = ({ onClose, onAdd }: AddDatasetModalProps) => {
  const [datasetPath, setDatasetPath] = useState('');
  const [isFolder, setIsFolder] = useState(true);
  const [config, setConfig] = useState<DatasetConfig>({
    path: '',
    hasTrain: true,
    hasTest: true,
    hasX: true,
    hasY: true,
    hasMetadata: false,
    delimiter: ';',
    decimalSeparator: '.',
    header: 'text',
  });
  const [loading, setLoading] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect configuration when path changes (for folders)
  useEffect(() => {
    if (datasetPath && isFolder) {
      detectFolderConfig(datasetPath);
    }
  }, [datasetPath, isFolder]);

  const detectFolderConfig = async (path: string) => {
    try {
      // Call parse_config equivalent via backend API
      // For now, we'll use default detection
      setConfig(prev => ({
        ...prev,
        path,
        hasTrain: true,
        hasTest: true,
        hasX: true,
        hasY: true,
        hasMetadata: false,
      }));
      setAutoDetected(true);
    } catch (error) {
      console.error('Failed to auto-detect config:', error);
      setAutoDetected(false);
    }
  };

  const handleSelectFolder = async () => {
    // Try pywebview first (desktop app)
    if (isPywebviewAvailable()) {
      try {
        const folderPath = await selectFolder();
        if (folderPath && typeof folderPath === 'string') {
          setDatasetPath(folderPath);
          setConfig(prev => ({ ...prev, path: folderPath }));
        }
      } catch (error) {
        console.error('Failed to select folder:', error);
        alert('Failed to select folder');
      }
    } else {
      // Fallback to HTML input (browser/dev mode)
      folderInputRef.current?.click();
    }
  };

  const handleAdd = async () => {
    if (!datasetPath) {
      alert('Please provide a dataset path');
      return;
    }

    setLoading(true);
    try {
      // Build config object
      const configToSend: any = {
        delimiter: config.delimiter,
        decimal_separator: config.decimalSeparator,
        has_header: config.header !== 'none',
      };

      // Add header type if specified
      if (config.header !== 'none' && config.header !== 'text') {
        configToSend.header_type = config.header; // 'nm' or 'cm-1'
      }

      // For folders, pass config for parsing options
      // For files, pass the full config with data type info
      if (!isFolder) {
        configToSend.data_types = {
          has_x: config.hasX,
          has_y: config.hasY,
          has_metadata: config.hasMetadata,
        };
      }

      await onAdd(datasetPath, configToSend);
      onClose();
    } catch (error) {
      console.error('Failed to add dataset:', error);
      alert('Failed to add dataset: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Add Dataset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Hidden file input for browser fallback */}
          <input
            ref={folderInputRef}
            type="file"
            {...({ webkitdirectory: '', directory: '' } as any)}
            multiple
            className="hidden"
            onChange={(e) => {
              // In browser mode, we can't get absolute paths, but we can show a message
              const files = e.target.files;
              if (files && files.length > 0) {
                // Try to extract a common path (won't be absolute, but can show folder name)
                const firstFile = files[0];
                const path = (firstFile as any).webkitRelativePath || firstFile.name;
                const folderName = path.split('/')[0];
                alert(`Browser mode limitation: Cannot get absolute path.\n\nSelected folder: ${folderName}\n\nPlease use the desktop app for full functionality, or paste the absolute path manually.`);
              }
              e.currentTarget.value = '';
            }}
          />

          {/* Path selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={datasetPath}
                onChange={(e) => setDatasetPath(e.target.value)}
                placeholder="Click Browse or paste absolute path..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={handleSelectFolder}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Folder className="h-4 w-4 mr-2" />
                Browse
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isPywebviewAvailable()
                ? "Click Browse to select a folder with native dialog"
                : "Browse opens limited browser picker. For full functionality, use desktop app or paste absolute path"}
            </p>
          </div>

          {/* Folder vs File toggle */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isFolder}
                onChange={(e) => setIsFolder(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">
                This is a folder (auto-detect train/test/X/Y files)
              </span>
            </label>
          </div>

          {/* Folder mode: show detected config */}
          {isFolder && autoDetected && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Auto-detected files:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {config.hasTrain && <div className="text-blue-700">✓ Train data</div>}
                {config.hasTest && <div className="text-blue-700">✓ Test data</div>}
                {config.hasX && <div className="text-blue-700">✓ X (features)</div>}
                {config.hasY && <div className="text-blue-700">✓ Y (targets)</div>}
                {config.hasMetadata && <div className="text-blue-700">✓ Metadata</div>}
              </div>
            </div>
          )}

          {/* File mode: show CSV parsing options */}
          {!isFolder && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900">CSV Parsing Options</h3>

              {/* Data type checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.hasX}
                      onChange={(e) => setConfig(prev => ({ ...prev, hasX: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">X (Features)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.hasY}
                      onChange={(e) => setConfig(prev => ({ ...prev, hasY: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Y (Targets)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.hasMetadata}
                      onChange={(e) => setConfig(prev => ({ ...prev, hasMetadata: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Metadata</span>
                  </label>
                </div>
              </div>

              {/* Delimiter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delimiter
                </label>
                <select
                  value={config.delimiter}
                  onChange={(e) => setConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value=";">Semicolon (;)</option>
                  <option value=",">Comma (,)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                  <option value=" ">Space</option>
                </select>
              </div>

              {/* Decimal Separator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimal Separator
                </label>
                <select
                  value={config.decimalSeparator}
                  onChange={(e) => setConfig(prev => ({ ...prev, decimalSeparator: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value=".">Dot (.)</option>
                  <option value=",">Comma (,)</option>
                </select>
              </div>

              {/* Header */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Header
                </label>
                <select
                  value={config.header}
                  onChange={(e) => setConfig(prev => ({ ...prev, header: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="none">None</option>
                  <option value="nm">Wavelengths (nm)</option>
                  <option value="cm-1">Wavenumbers (cm⁻¹)</option>
                  <option value="text">Text</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!datasetPath || loading}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDatasetModal;
