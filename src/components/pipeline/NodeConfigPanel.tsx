import React, { useState, useEffect } from 'react';

interface ParamEntry {
  id: string;
  key: string;
  value: string;
}

interface NodeConfigPanelProps {
  selectedNodeId: string | null;
  selectedNode: any | null;
  onUpdateParams: (nodeId: string, params: Record<string, any>) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  selectedNodeId,
  selectedNode,
  onUpdateParams,
}) => {
  const [paramEntries, setParamEntries] = useState<ParamEntry[]>([]);

  const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    if (!selectedNode) {
      setParamEntries([]);
      return;
    }
    const entries = Object.entries(selectedNode.params || {}).map(([k, v]) => ({
      id: genId(),
      key: k,
      value: String(v),
    }));
    setParamEntries(entries);
  }, [selectedNodeId, selectedNode]);

  const handleSaveParams = () => {
    if (!selectedNodeId) return;
    const params: Record<string, any> = {};
    paramEntries.forEach((p) => {
      if (p.key) params[p.key] = p.value;
    });
    onUpdateParams(selectedNodeId, params);
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
        </div>
        <div className="text-xs text-gray-400">ID: {selectedNodeId}</div>
      </div>

      <div className="space-y-3">
        {paramEntries.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            No parameters configured. Add key/value pairs below.
          </div>
        ) : (
          <div className="space-y-2">
            {paramEntries.map((pe) => (
              <div key={pe.id} className="flex gap-2">
                <input
                  type="text"
                  value={pe.key}
                  onChange={(e) =>
                    setParamEntries((prev) =>
                      prev.map((p) => (p.id === pe.id ? { ...p, key: e.target.value } : p))
                    )
                  }
                  placeholder="Parameter name"
                  className="border rounded px-3 py-2 w-1/3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={pe.value}
                  onChange={(e) =>
                    setParamEntries((prev) =>
                      prev.map((p) => (p.id === pe.id ? { ...p, value: e.target.value } : p))
                    )
                  }
                  placeholder="Parameter value"
                  className="border rounded px-3 py-2 flex-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setParamEntries((prev) => prev.filter((p) => p.id !== pe.id))}
                  className="text-red-500 hover:text-red-700 px-3 py-2 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={() =>
              setParamEntries((prev) => [...prev, { id: genId(), key: '', value: '' }])
            }
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            + Add Parameter
          </button>
          <button
            onClick={handleSaveParams}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigPanel;
