import { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw } from 'feather-icons-react';
import type { Dataset, DatasetFile } from '../types';

interface EditDatasetModalProps {
  dataset: Dataset;
  onClose: () => void;
  onSave: (datasetId: string, config: any, files: DatasetFile[]) => Promise<void>;
}

const EditDatasetModal = ({ dataset, onClose, onSave }: EditDatasetModalProps) => {
  const [files, setFiles] = useState<DatasetFile[]>(dataset.files || []);
  const [config, setConfig] = useState({
    delimiter: dataset.config?.delimiter || ';',
    decimalSeparator: dataset.config?.decimal_separator || '.',
    header: dataset.config?.has_header === false ? 'none' : (dataset.config?.header_type || 'text'),
    xSourceMode: dataset.config?.x_source_mode || 'stack',
  });
  const [loading, setLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);

  // Auto-detect files when component mounts if no files configured
  useEffect(() => {
    if (files.length === 0) {
      handleAutoDetect();
    }
  }, []);

  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    try {
      // Call backend to auto-detect files using parse_config
      const response = await fetch(`/api/workspace/dataset/${dataset.id}/detect-files`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.files) {
          setFiles(data.files);
        }
      }
    } catch (error) {
      console.error('Failed to auto-detect files:', error);
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleAddFile = () => {
    const newFile: DatasetFile = {
      path: '',
      type: 'x',
      partition: 'train',
      source_id: undefined,
    };
    setFiles([...files, newFile]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleFileChange = (index: number, field: keyof DatasetFile, value: any) => {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], [field]: value };
    setFiles(newFiles);
  };

  const handleSave = async () => {
    // Validate that all files have paths
    const invalidFiles = files.filter(f => !f.path.trim());
    if (invalidFiles.length > 0) {
      alert('Please provide paths for all files or remove empty entries');
      return;
    }

    setLoading(true);
    try {
      const configToSave = {
        delimiter: config.delimiter,
        decimal_separator: config.decimalSeparator,
        has_header: config.header !== 'none',
        header_type: config.header !== 'none' && config.header !== 'text' ? config.header : undefined,
        x_source_mode: config.xSourceMode,
      };

      await onSave(dataset.id, configToSave, files);
      onClose();
    } catch (error) {
      console.error('Failed to save dataset config:', error);
      alert('Failed to save dataset configuration: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  // Group X files by source_id for the multi-source view
  const xFiles = files.filter(f => f.type === 'x');
  const xSources = new Set(xFiles.map(f => f.source_id).filter(id => id !== undefined));
  const hasMultipleSources = xSources.size > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold">Configure Dataset</h2>
            <p className="text-sm text-gray-600 mt-1">{dataset.name}</p>
            <p className="text-xs text-gray-500">{dataset.path}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* CSV Parsing Options */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">CSV Parsing Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delimiter
                </label>
                <select
                  value={config.delimiter}
                  onChange={(e) => setConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value=";">Semicolon (;)</option>
                  <option value=",">Comma (,)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                  <option value=" ">Space</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimal Separator
                </label>
                <select
                  value={config.decimalSeparator}
                  onChange={(e) => setConfig(prev => ({ ...prev, decimalSeparator: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value=".">Dot (.)</option>
                  <option value=",">Comma (,)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Header
                </label>
                <select
                  value={config.header}
                  onChange={(e) => setConfig(prev => ({ ...prev, header: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="none">None</option>
                  <option value="nm">Wavelengths (nm)</option>
                  <option value="cm-1">Wavenumbers (cm⁻¹)</option>
                  <option value="text">Text</option>
                </select>
              </div>

              {hasMultipleSources && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Multi-Source X Mode
                  </label>
                  <select
                    value={config.xSourceMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, xSourceMode: e.target.value as 'stack' | 'concat' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="stack">Stack (vertical)</option>
                    <option value="concat">Concatenate (horizontal)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Files Configuration */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Files Configuration</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoDetect}
                  disabled={autoDetecting}
                  className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${autoDetecting ? 'animate-spin' : ''}`} />
                  Auto-Detect
                </button>
                <button
                  onClick={handleAddFile}
                  className="inline-flex items-center px-3 py-1 text-sm border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add File
                </button>
              </div>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No files configured. Click "Auto-Detect" or "Add File" to configure files.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-2">
                  <div className="col-span-5">File Path</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Partition</div>
                  <div className="col-span-2">Source ID</div>
                  <div className="col-span-1"></div>
                </div>

                {files.map((file, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white border rounded p-2">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={file.path}
                        onChange={(e) => handleFileChange(index, 'path', e.target.value)}
                        placeholder="path/to/file.csv or file.csv"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={file.type}
                        onChange={(e) => handleFileChange(index, 'type', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="x">X (Features)</option>
                        <option value="y">Y (Targets)</option>
                        <option value="group">Group (Metadata)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={file.partition}
                        onChange={(e) => handleFileChange(index, 'partition', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="train">Train</option>
                        <option value="test">Test</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={file.source_id ?? ''}
                        onChange={(e) => handleFileChange(index, 'source_id', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="Auto"
                        disabled={file.type !== 'x'}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                        min="0"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Tips:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Paths can be relative to the dataset folder or absolute paths</li>
                <li>Use "Auto-Detect" to scan the folder for common file patterns</li>
                <li>Source ID groups multiple X files - leave empty for single source</li>
                <li>Multi-source mode: Stack (rows) or Concatenate (columns)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50 sticky bottom-0">
          <div className="text-sm text-gray-600">
            {files.length} file(s) configured
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || files.length === 0}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving & Loading...' : 'Save & Load Dataset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDatasetModal;
