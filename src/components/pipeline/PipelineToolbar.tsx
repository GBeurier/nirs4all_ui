import React, { useRef, useState } from 'react';
import { Trash2, Play, Database, Folder, MapPin, Save, Download } from 'feather-icons-react';
import type { Dataset } from '../../types';

interface PipelineToolbarProps {
  onClear: () => void;
  onRun: () => void;
  onLoad: () => void;
  onPin: () => void;
  onSave: () => void;
  onExport: () => void;
  running: boolean;
  datasetsList: Dataset[];
  groupsList: any[];
  selectedDatasetIds: Set<string>;
  onDatasetSelectionChange: (ids: Set<string>) => void;
}

const PipelineToolbar: React.FC<PipelineToolbarProps> = ({
  onClear,
  onRun,
  onLoad,
  onPin,
  onSave,
  onExport,
  running,
  datasetsList,
  groupsList,
  selectedDatasetIds,
  onDatasetSelectionChange,
}) => {
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const datasetDropdownRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Left: Clear + Launch */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
          title="Clear pipeline"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onRun}
          className={`inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
            running ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          title="Launch pipeline"
          disabled={running}
        >
          <Play className="w-5 h-5" />
        </button>
      </div>

      {/* Center: dataset chooser */}
      <div className="flex-1 flex justify-center">
        <div className="relative" ref={datasetDropdownRef}>
          <button
            type="button"
            onClick={() => setDatasetDropdownOpen((v) => !v)}
            className="inline-flex items-center px-4 py-2 border rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors"
            title="Select datasets"
          >
            <Database className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">
              {selectedDatasetIds.size === 0 ? 'Select Datasets' : `${selectedDatasetIds.size} selected`}
            </span>
          </button>
          {datasetDropdownOpen && (
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border rounded-lg shadow-xl z-50 p-4">
              <div className="space-y-3 max-h-80 overflow-auto">
                {groupsList.map((g: any) => (
                  <div key={g.id} className="border-b last:border-b-0 pb-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">{g.name}</div>
                    <div className="space-y-1 pl-3">
                      {(g.dataset_ids || []).map((did: string) => {
                        const ds = datasetsList.find((d) => d.id === did);
                        if (!ds) return null;
                        return (
                          <label key={did} className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedDatasetIds.has(did)}
                              onChange={() => {
                                onDatasetSelectionChange(
                                  new Set(
                                    selectedDatasetIds.has(did)
                                      ? Array.from(selectedDatasetIds).filter((id) => id !== did)
                                      : [...Array.from(selectedDatasetIds), did]
                                  )
                                );
                              }}
                              className="rounded"
                            />
                            <span>{ds.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {datasetsList.filter((d) => !(d.groups && d.groups.length)).length > 0 && (
                  <div className="pt-2">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Ungrouped</div>
                    <div className="space-y-1 pl-3">
                      {datasetsList.filter((d) => !(d.groups && d.groups.length)).map((d) => (
                        <label key={d.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedDatasetIds.has(d.id)}
                            onChange={() => {
                              onDatasetSelectionChange(
                                new Set(
                                  selectedDatasetIds.has(d.id)
                                    ? Array.from(selectedDatasetIds).filter((id) => id !== d.id)
                                    : [...Array.from(selectedDatasetIds), d.id]
                                )
                              );
                            }}
                            className="rounded"
                          />
                          <span>{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-between pt-3 border-t">
                <button
                  type="button"
                  onClick={() => onDatasetSelectionChange(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setDatasetDropdownOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: icon-only actions */}
      <div className="flex items-center gap-2">
        <button
          title="Load pipeline"
          onClick={onLoad}
          className="px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Load pipeline"
        >
          <Folder className="w-5 h-5" />
        </button>
        <button
          title="Pin pipeline (save to workspace)"
          onClick={onPin}
          className="px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Pin pipeline"
        >
          <MapPin className="w-5 h-5" />
        </button>
        <button
          title="Save pipeline (save as JSON file)"
          onClick={onSave}
          className="px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Save pipeline"
        >
          <Save className="w-5 h-5" />
        </button>
        <button
          title="Export pipeline (quick download)"
          onClick={onExport}
          className="px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Export pipeline"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PipelineToolbar;
