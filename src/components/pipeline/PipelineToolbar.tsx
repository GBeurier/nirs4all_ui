import React, { useRef, useState } from 'react';
import { Trash2, Play, Database, Folder, MapPin, Save, Target } from 'feather-icons-react';
import type { Dataset } from '../../types';

interface PipelineToolbarProps {
  onClear: () => void;
  onRun: () => void;
  onLoad: () => void;
  onPin: () => void;
  onSave: () => void;
  running: boolean;
  datasetsList: Dataset[];
  groupsList: any[];
  selectedDatasetIds: Set<string>;
  onDatasetSelectionChange: (ids: Set<string>) => void;
  onPredict: () => void;
}

const PipelineToolbar: React.FC<PipelineToolbarProps> = ({
  onClear,
  onRun,
  onLoad,
  onPin,
  onSave,
  running,
  datasetsList,
  groupsList,
  selectedDatasetIds,
  onDatasetSelectionChange,
  onPredict,
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
        {/* Predict: launch pipeline in predict (inference) mode */}
        <button
          type="button"
          onClick={onPredict}
          className={`inline-flex items-center px-3 py-2 rounded-lg text-white transition-colors ${
            running ? 'bg-indigo-400 opacity-70 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          title="Launch pipeline in predict mode"
          aria-label="Launch predict"
          disabled={running}
        >
          <Target className="w-5 h-5" />
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
                {/* Groups Section */}
                {groupsList.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Groups</div>
                    <div className="space-y-1">
                      {groupsList.map((g: any) => {
                        const groupDatasetIds = g.dataset_ids || [];
                        const allGroupDatasetsSelected = groupDatasetIds.length > 0 &&
                          groupDatasetIds.every((did: string) => selectedDatasetIds.has(did));
                        const someGroupDatasetsSelected = groupDatasetIds.some((did: string) => selectedDatasetIds.has(did));

                        return (
                          <label key={g.id} className="flex items-center gap-2 text-sm hover:bg-blue-50 p-2 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allGroupDatasetsSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = !allGroupDatasetsSelected && someGroupDatasetsSelected;
                              }}
                              onChange={() => {
                                if (allGroupDatasetsSelected) {
                                  // Uncheck all datasets in this group
                                  onDatasetSelectionChange(
                                    new Set(
                                      Array.from(selectedDatasetIds).filter((id) => !groupDatasetIds.includes(id))
                                    )
                                  );
                                } else {
                                  // Check all datasets in this group
                                  onDatasetSelectionChange(
                                    new Set([...Array.from(selectedDatasetIds), ...groupDatasetIds])
                                  );
                                }
                              }}
                              className="rounded"
                            />
                            <span className="font-medium">{g.name}</span>
                            <span className="text-xs text-gray-500 ml-auto">({groupDatasetIds.length} datasets)</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="border-t border-gray-300 my-3"></div>
                  </>
                )}

                {/* Datasets Section */}
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Datasets</div>
                <div className="space-y-1">
                  {datasetsList.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded cursor-pointer">
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
                      {d.groups && d.groups.length > 0 && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {d.groups.map((gid: string) => {
                            const grp = groupsList.find((g: any) => g.id === gid);
                            return grp?.name;
                          }).filter(Boolean).join(', ')}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
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
      </div>
    </div>
  );
};

export default PipelineToolbar;
