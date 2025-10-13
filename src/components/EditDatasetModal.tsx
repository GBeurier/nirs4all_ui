import { useState, useEffect } from 'react';
import { X } from 'feather-icons-react';
import type { Dataset, DatasetFile } from '../types';
import { apiClient } from '../api/client';

interface DatasetEditConfig {
  path: string;
  delimiter: string;
  decimalSeparator: string;
  header: string;
  trainXPath: string;
  trainYPath: string;
  testXPath: string;
  testYPath: string;
  trainGroupPath: string;
  testGroupPath: string;
}

interface EditDatasetModalProps {
  dataset: Dataset;
  onClose: () => void;
  onSave: (datasetId: string, config: any, files: DatasetFile[]) => Promise<void>;
}

const EditDatasetModal = ({ dataset, onClose, onSave }: EditDatasetModalProps) => {
  const [config, setConfig] = useState<DatasetEditConfig>({
    path: dataset.path || '',
    delimiter: ';',
    decimalSeparator: '.',
    header: 'text',
    trainXPath: '',
    trainYPath: '',
    testXPath: '',
    testYPath: '',
    trainGroupPath: '',
    testGroupPath: '',
  });
  const [loading, setLoading] = useState(false);

  // Load existing config from dataset
  useEffect(() => {
    if (dataset.config) {
      const cfg = dataset.config as any;
      setConfig(prev => ({
        ...prev,
        delimiter: cfg.delimiter || ';',
        decimalSeparator: cfg.decimal_separator || '.',
        header: cfg.has_header === false ? 'none' : (cfg.header_type || 'text'),
        trainXPath: cfg.train_x || '',
        trainYPath: cfg.train_y || '',
        testXPath: cfg.test_x || '',
        testYPath: cfg.test_y || '',
        trainGroupPath: cfg.train_group || '',
        testGroupPath: cfg.test_group || '',
      }));
    }
  }, [dataset]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const configToSave: any = {
        delimiter: config.delimiter,
        decimal_separator: config.decimalSeparator,
        has_header: config.header !== 'none',
      };

      // Add header type if specified
      if (config.header !== 'none' && config.header !== 'text') {
        configToSave.header_type = config.header;
      }

      // Add file paths if specified
      if (config.trainXPath) configToSave.train_x = config.trainXPath;
      if (config.trainYPath) configToSave.train_y = config.trainYPath;
      if (config.testXPath) configToSave.test_x = config.testXPath;
      if (config.testYPath) configToSave.test_y = config.testYPath;
      if (config.trainGroupPath) configToSave.train_group = config.trainGroupPath;
      if (config.testGroupPath) configToSave.test_group = config.testGroupPath;

      // Detect files from the dataset using the backend
      const detectedFilesResponse = await apiClient.detectDatasetFiles(dataset.id);
      const detectedFiles: DatasetFile[] = detectedFilesResponse.files || [];

      // Call save with config and detected files
      await onSave(dataset.id, configToSave, detectedFiles);
      onClose();
    } catch (error) {
      console.error('Failed to save dataset config:', error);
      alert('Failed to save dataset configuration: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Edit Dataset Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">{dataset.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Path (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Path
            </label>
            <input
              type="text"
              value={config.path}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
            <p className="mt-1 text-sm text-gray-500">
              Path cannot be changed. To use a different path, add a new dataset.
            </p>
          </div>

          {/* CSV Parsing Options */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">CSV Parsing Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

          {/* File Path Configuration */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              File Paths (optional - leave empty for auto-detection)
            </h3>

            <div className="space-y-4">
              {/* Training Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Train X (Features)
                  </label>
                  <input
                    type="text"
                    value={config.trainXPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, trainXPath: e.target.value }))}
                    placeholder="e.g., Xcal.csv or path/to/X_train.csv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Train Y (Targets)
                  </label>
                  <input
                    type="text"
                    value={config.trainYPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, trainYPath: e.target.value }))}
                    placeholder="e.g., Ycal.csv or path/to/Y_train.csv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Test Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test X (Features)
                  </label>
                  <input
                    type="text"
                    value={config.testXPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, testXPath: e.target.value }))}
                    placeholder="e.g., Xval.csv or path/to/X_test.csv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Y (Targets)
                  </label>
                  <input
                    type="text"
                    value={config.testYPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, testYPath: e.target.value }))}
                    placeholder="e.g., Yval.csv or path/to/Y_test.csv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Group Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Train Groups (Metadata)
                  </label>
                  <input
                    type="text"
                    value={config.trainGroupPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, trainGroupPath: e.target.value }))}
                    placeholder="e.g., Gcal.csv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Groups (Metadata)
                  </label>
                  <input
                    type="text"
                    value={config.testGroupPath}
                    onChange={(e) => setConfig(prev => ({ ...prev, testGroupPath: e.target.value }))}
                    placeholder="e.g., Gval.csv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Leave file paths empty to use auto-detection based on common naming patterns.
                  Paths can be relative to the dataset folder or absolute paths.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDatasetModal;
