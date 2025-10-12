import { useState, useEffect, useRef } from 'react';
import { X, Folder, File } from 'feather-icons-react';
import { selectFolder, selectFile, isPywebviewAvailable } from '../utils/fileDialogs';

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
  // Step 1: Selection
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [sourceType, setSourceType] = useState<'folder' | 'files' | null>(null);
  const [datasetPath, setDatasetPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Step 2: Configuration
  const [detectedFiles, setDetectedFiles] = useState<any[]>([]);
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
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect configuration when folder is selected
  useEffect(() => {
    if (sourceType === 'folder' && datasetPath && step === 'configure') {
      detectFolderConfig(datasetPath);
    }
  }, [sourceType, datasetPath, step]);

  const detectFolderConfig = async (path: string) => {
    try {
      // TODO: Call backend API to detect folder structure
      // For now, simulate detection
      const mockFiles = [
        { path: 'X_train.csv', type: 'X', split: 'train', source: 1, detected: true },
        { path: 'Y_train.csv', type: 'Y', split: 'train', source: null, detected: true },
        { path: 'X_test.csv', type: 'X', split: 'test', source: 1, detected: true },
        { path: 'Y_test.csv', type: 'Y', split: 'test', source: null, detected: true },
      ];
      setDetectedFiles(mockFiles);
      setConfig(prev => ({
        ...prev,
        path,
        hasTrain: true,
        hasTest: true,
        hasX: true,
        hasY: true,
      }));
    } catch (error) {
      console.error('Failed to auto-detect config:', error);
    }
  };

  const handleSelectFolder = async () => {
    console.log('[AddDatasetModal] handleSelectFolder called');
    if (isPywebviewAvailable()) {
      try {
        const folderPath = await selectFolder();
        console.log('[AddDatasetModal] selectFolder returned:', folderPath);
        if (folderPath && typeof folderPath === 'string') {
          setDatasetPath(folderPath);
          setSourceType('folder');
          setStep('configure');
        }
      } catch (error) {
        console.error('[AddDatasetModal] Failed to select folder:', error);
        alert('Failed to select folder: ' + String(error));
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  const handleSelectFile = async () => {
    console.log('[AddDatasetModal] handleSelectFile called');
    if (isPywebviewAvailable()) {
      try {
        const result = await selectFile(['CSV files (*.csv)', 'All files (*.*)'], true);
        console.log('[AddDatasetModal] selectFile returned:', result);

        if (result) {
          if (Array.isArray(result) && result.length > 0) {
            setSelectedFiles(result);
            setDatasetPath(result[0]);
            setSourceType('files');

            // Auto-detect type, split, and source from filenames
            const files = result.map(filePath => {
              const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() || '';
              let type: 'X' | 'Y' | 'metadata' = 'X'; // default
              let split: 'train' | 'test' = 'train'; // default
              let source: number | null = null;

              // Detect type
              if (filename.includes('y_') || filename.includes('y-')) {
                type = 'Y';
              } else if (filename.includes('metadata')) {
                type = 'metadata';
              } else {
                type = 'X';
              }

              // Detect split
              if (filename.includes('test')) {
                split = 'test';
              } else {
                split = 'train';
              }

              // Detect source number (e.g., X_train_source2.csv, X_train_s2.csv)
              const sourceMatch = filename.match(/(?:source|s)[\s_-]*(\d+)/i);
              if (sourceMatch && type === 'X') {
                source = parseInt(sourceMatch[1]);
              } else if (type === 'X') {
                source = 1; // default source 1 for X files
              }

              return { path: filePath, type, split, source, detected: false };
            });

            setDetectedFiles(files);
            setStep('configure');
          } else if (typeof result === 'string') {
            setSelectedFiles([result]);
            setDatasetPath(result);
            setSourceType('files');
            setDetectedFiles([{ path: result, type: 'X', split: 'train', source: 1, detected: false }]);
            setStep('configure');
          }
        }
      } catch (error) {
        console.error('[AddDatasetModal] Failed to select file:', error);
        alert('Failed to select file: ' + String(error));
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleAdd = async () => {
    if (!datasetPath) {
      alert('Please select a dataset');
      return;
    }

    setLoading(true);
    try {
      const configToSend: any = {
        delimiter: config.delimiter,
        decimal_separator: config.decimalSeparator,
        has_header: config.header !== 'none',
      };

      if (config.header !== 'none' && config.header !== 'text') {
        configToSend.header_type = config.header;
      }

      // Send file structure with type, split, and source
      configToSend.files = detectedFiles.map(file => ({
        path: file.path,
        type: file.type,
        split: file.split,
        source: file.source,
      }));

      await onAdd(datasetPath, configToSend);
      onClose();
    } catch (error) {
      console.error('Failed to add dataset:', error);
      alert('Failed to add dataset: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const updateFileType = (filepath: string, newType: 'X' | 'Y' | 'metadata') => {
    setDetectedFiles(prev =>
      prev.map(f => {
        if (f.path === filepath) {
          // If changing to Y or metadata, clear source
          const source = (newType === 'X') ? (f.source || 1) : null;
          return { ...f, type: newType, source };
        }
        return f;
      })
    );
  };

  const updateFileSplit = (filepath: string, newSplit: 'train' | 'test') => {
    setDetectedFiles(prev =>
      prev.map(f => f.path === filepath ? { ...f, split: newSplit } : f)
    );
  };

  const updateFileSource = (filepath: string, newSource: number | null) => {
    setDetectedFiles(prev =>
      prev.map(f => f.path === filepath ? { ...f, source: newSource } : f)
    );
  };

  const removeFile = (filepath: string) => {
    setDetectedFiles(prev => prev.filter(f => f.path !== filepath));
  };

  const handleAddMoreFiles = async () => {
    if (isPywebviewAvailable()) {
      try {
        const result = await selectFile(['CSV files (*.csv)', 'All files (*.*)'], true);
        if (result) {
          const newFiles = Array.isArray(result) ? result : [result];

          // Auto-detect properties for new files
          const files = newFiles.map(filePath => {
            const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() || '';
            let type: 'X' | 'Y' | 'metadata' = 'X';
            let split: 'train' | 'test' = 'train';
            let source: number | null = null;

            if (filename.includes('y_') || filename.includes('y-')) type = 'Y';
            else if (filename.includes('metadata')) type = 'metadata';
            else type = 'X';

            if (filename.includes('test')) split = 'test';
            else split = 'train';

            const sourceMatch = filename.match(/(?:source|s)[\s_-]*(\d+)/i);
            if (sourceMatch && type === 'X') {
              source = parseInt(sourceMatch[1]);
            } else if (type === 'X') {
              // Find max existing source number and increment
              const maxSource = Math.max(
                0,
                ...detectedFiles
                  .filter(f => f.type === 'X' && f.source !== null)
                  .map(f => f.source as number)
              );
              source = maxSource + 1;
            }

            return { path: filePath, type, split, source, detected: false };
          });

          // Add to existing files
          setDetectedFiles(prev => [...prev, ...files]);
        }
      } catch (error) {
        console.error('[AddDatasetModal] Failed to add more files:', error);
        alert('Failed to add files: ' + String(error));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {step === 'select' ? 'Add Dataset - Select Source' : 'Add Dataset - Configure'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* STEP 1: SELECT SOURCE */}
        {step === 'select' && (
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Choose how you want to add your dataset:
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Folder Option */}
              <button
                onClick={handleSelectFolder}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Folder className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Folder</h3>
                <p className="text-sm text-gray-500 text-center">
                  Choose a folder containing X_train, Y_train, X_test, Y_test files
                </p>
              </button>

              {/* Files Option */}
              <button
                onClick={handleSelectFile}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <File className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Files</h3>
                <p className="text-sm text-gray-500 text-center">
                  Choose one or more CSV files to configure manually
                </p>
              </button>
            </div>

            {/* Hidden inputs for browser fallback */}
            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  alert('Browser mode: Cannot get absolute path. Use desktop app or paste path manually.');
                }
                e.currentTarget.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  alert('Browser mode: Cannot get absolute path. Use desktop app or paste path manually.');
                }
                e.currentTarget.value = '';
              }}
            />
          </div>
        )}

        {/* STEP 2: CONFIGURE */}
        {step === 'configure' && (
          <div className="p-6 space-y-6">
            {/* Source Path Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {sourceType === 'folder' ? 'Folder Path' : 'Selected Files'}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
                {datasetPath}
                {sourceType === 'files' && selectedFiles.length > 1 && (
                  <span className="ml-2 text-gray-500">
                    (+{selectedFiles.length - 1} more)
                  </span>
                )}
              </div>
            </div>

            {/* File List with Three Properties */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Dataset Files
                  {sourceType === 'folder' && <span className="ml-2 text-xs text-green-600">(Auto-detected)</span>}
                </label>
                <button
                  onClick={handleAddMoreFiles}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add More Files
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg divide-y">
                {detectedFiles.map((file, idx) => {
                  const filename = file.path.split(/[/\\]/).pop() || file.path;
                  return (
                    <div key={idx} className="p-3 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <File className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-700 truncate flex-1" title={file.path}>
                              {filename}
                            </span>
                            {file.detected && (
                              <span className="text-xs text-green-600 flex-shrink-0">✓ Auto</span>
                            )}
                            <button
                              onClick={() => removeFile(file.path)}
                              className="text-xs text-red-600 hover:text-red-700 flex-shrink-0"
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Type */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Type</label>
                              <select
                                value={file.type}
                                onChange={(e) => updateFileType(file.path, e.target.value as 'X' | 'Y' | 'metadata')}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                              >
                                <option value="X">X (Spectra)</option>
                                <option value="Y">Y (Analyte)</option>
                                <option value="metadata">Metadata</option>
                              </select>
                            </div>
                            {/* Split */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Split</label>
                              <select
                                value={file.split}
                                onChange={(e) => updateFileSplit(file.path, e.target.value as 'train' | 'test')}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                              >
                                <option value="train">Train</option>
                                <option value="test">Test</option>
                              </select>
                            </div>
                            {/* Source (only for X) */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Source {file.type !== 'X' && <span className="text-gray-400">(N/A)</span>}
                              </label>
                              {file.type === 'X' ? (
                                <select
                                  value={file.source || 1}
                                  onChange={(e) => updateFileSource(file.path, parseInt(e.target.value))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                >
                                  <option value="1">Source 1</option>
                                  <option value="2">Source 2</option>
                                  <option value="3">Source 3</option>
                                  <option value="4">Source 4</option>
                                  <option value="5">Source 5</option>
                                </select>
                              ) : (
                                <div className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-100 text-gray-400">
                                  —
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                <strong>Type:</strong> X (spectra) can have multiple sources (concatenated). Y (analyte) and metadata have no source.
                <br />
                <strong>Split:</strong> Train or test data. Multiple X train files with same source are vstacked.
              </p>
            </div>

            {/* CSV Parsing Options */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">CSV Parsing Options</h3>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Type
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

            {/* Dataset Info (placeholder for n_samples, n_features) */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Dataset Information</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Samples: <span className="font-medium">--</span> (will be calculated)</div>
                <div>Features: <span className="font-medium">--</span> (will be calculated)</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between gap-2 p-6 border-t">
          {step === 'configure' && (
            <button
              onClick={() => setStep('select')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back
            </button>
          )}
          {step === 'select' && <div />}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={handleAdd}
                disabled={loading || detectedFiles.length === 0}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Dataset'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDatasetModal;
