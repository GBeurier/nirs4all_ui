import React, { useState, useEffect } from 'react';
import type { ComponentLibraryJSON, ComponentDefinition, ParamDefinition } from './libraryDataLoader';
import { findComponentById } from './libraryDataLoader';

interface NodeConfigPanelProps {
  selectedNodeId: string | null;
  selectedNode: any | null;
  onUpdateParams: (nodeId: string, params: Record<string, any>) => void;
  libraryData?: ComponentLibraryJSON | null;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  selectedNodeId,
  selectedNode,
  onUpdateParams,
  libraryData,
}) => {
  const [params, setParams] = useState<Record<string, any>>({});
  const [componentDef, setComponentDef] = useState<ComponentDefinition | null>(null);

  useEffect(() => {
    if (!selectedNode) {
      setParams({});
      setComponentDef(null);
      return;
    }

    // Load component definition from library
    if (libraryData) {
      const def = findComponentById(libraryData, selectedNode.componentId);
      if (def) {
        setComponentDef(def);
        // Initialize params with defaults, then override with actual values
        const initialParams = { ...def.defaultParams, ...(selectedNode.params || {}) };
        setParams(initialParams);
        return;
      }
    }

    // Fallback if no library data
    setParams(selectedNode.params || {});
    setComponentDef(null);
  }, [selectedNodeId, selectedNode, libraryData]);

  const handleParamChange = (paramName: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleSaveParams = () => {
    if (!selectedNodeId) return;
    onUpdateParams(selectedNodeId, params);
  };

  const renderParamInput = (paramDef: ParamDefinition) => {
    const currentValue = params[paramDef.name] ?? paramDef.default;

    switch (paramDef.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={currentValue === true || currentValue === 'true'}
              onChange={(e) => handleParamChange(paramDef.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{paramDef.description}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={String(currentValue)}
            onChange={(e) => handleParamChange(paramDef.name, e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {paramDef.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'integer':
        return (
          <input
            type="number"
            step="1"
            value={currentValue ?? ''}
            onChange={(e) => handleParamChange(paramDef.name, parseInt(e.target.value) || 0)}
            className="border rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            step="any"
            value={currentValue ?? ''}
            onChange={(e) => handleParamChange(paramDef.name, parseFloat(e.target.value) || 0)}
            className="border rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'array':
        return (
          <input
            type="text"
            value={Array.isArray(currentValue) ? JSON.stringify(currentValue) : currentValue}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleParamChange(paramDef.name, parsed);
              } catch {
                handleParamChange(paramDef.name, e.target.value);
              }
            }}
            placeholder="[value1, value2, ...]"
            className="border rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
          />
        );

      case 'string':
      default:
        return (
          <input
            type="text"
            value={currentValue ?? ''}
            onChange={(e) => handleParamChange(paramDef.name, e.target.value)}
            className="border rounded px-3 py-2 w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-500 text-center py-8">
          Select a node in the pipeline to configure its parameters
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-lg text-gray-900">{selectedNode.label}</div>
          <div className="text-sm text-gray-500">{selectedNode.componentId}</div>
          {componentDef?.description && (
            <div className="text-xs text-gray-400 mt-1">{componentDef.description}</div>
          )}
        </div>
        <div className="text-xs text-gray-400">ID: {selectedNodeId.slice(-8)}</div>
      </div>

      <div className="space-y-4">
        {componentDef && componentDef.editableParams.length > 0 ? (
          <>
            <div className="space-y-3">
              {componentDef.editableParams.map((paramDef) => (
                <div key={paramDef.name} className="space-y-1">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      {paramDef.name}
                      {paramDef.type && (
                        <span className="ml-2 text-xs text-gray-500">({paramDef.type})</span>
                      )}
                    </span>
                    {paramDef.description && paramDef.type !== 'boolean' && (
                      <span className="block text-xs text-gray-500 mb-1">
                        {paramDef.description}
                      </span>
                    )}
                  </label>
                  {renderParamInput(paramDef)}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t">
              <button
                onClick={handleSaveParams}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Save Configuration
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500 py-4 text-center">
            {componentDef ? 'No configurable parameters for this component' : 'Loading component definition...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeConfigPanel;