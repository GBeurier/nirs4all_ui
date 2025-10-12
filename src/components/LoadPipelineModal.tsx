import { useEffect, useState, useRef } from 'react';
import { X } from 'feather-icons-react';
import type { SavedPipeline } from '../types';
import { apiClient } from '../api/client';
import { selectFile, readLocalFile, isPywebviewAvailable } from '../utils/fileDialogs';

interface LoadPipelineModalProps {
  onLoad: (pipeline: any) => void;
  onClose: () => void;
}

const LoadPipelineModal = ({ onLoad, onClose }: LoadPipelineModalProps) => {
  const [pipelines, setPipelines] = useState<SavedPipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient.listPipelines()
      .then(async (res: any) => {
        const pipelinesList = res.pipelines || [];
        // Fetch full pipeline data for each item
        const fullPipelines = await Promise.all(
          pipelinesList.map(async (p: any) => {
            try {
              const fullData = await apiClient.getPipeline(p.id);
              return {
                ...p,
                pipeline: fullData.pipeline?.steps || fullData.pipeline || []
              };
            } catch (e) {
              console.error(`Failed to load pipeline ${p.id}:`, e);
              return { ...p, pipeline: [] };
            }
          })
        );
        setPipelines(fullPipelines);
      })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const renderPreview = (p: SavedPipeline) => {
    try {
      const nodes = extractNodesFromPipeline(p.pipeline);
      return (
        <div className="flex gap-2 items-center flex-wrap">
          {nodes.slice(0, 8).map((n: any, i: number) => (
            <span key={i} className="px-2 py-1 rounded bg-gray-100 text-xs font-mono">{n.component || n.name || n.type}</span>
          ))}
          {nodes.length > 8 && <span className="text-xs text-gray-500">+{nodes.length - 8}</span>}
        </div>
      );
    } catch (e) {
      return <pre className="text-xs text-gray-500">Invalid pipeline</pre>;
    }
  };

  const extractNodesFromPipeline = (pipeline: any) => {
    if (!pipeline) return [];
    if (Array.isArray(pipeline)) return pipeline;
    if (pipeline.steps && Array.isArray(pipeline.steps)) return pipeline.steps;
    if (pipeline.nodes && Array.isArray(pipeline.nodes)) return pipeline.nodes;
    if (pipeline.components && Array.isArray(pipeline.components)) return pipeline.components;
    return [pipeline];
  };

  const handleOpenFile = async () => {
    if (isPywebviewAvailable()) {
      // Use native dialog via pywebview
      try {
        setImporting(true);
        setError(null);

        const filePath = await selectFile(['JSON files (*.json)']);
        if (!filePath) {
          setImporting(false);
          return;
        }

        const content = await readLocalFile(filePath);
        const parsed = JSON.parse(content);
        onLoad(parsed);
      } catch (err: any) {
        setError(err.message || 'Failed to load file');
      } finally {
        setImporting(false);
      }
    } else {
      // Fallback to HTML file input
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Load Pipeline</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        <div className="p-4 overflow-auto max-h-[60vh]">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Pinned Pipelines (from workspace)</h4>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : pipelines.length === 0 ? (
            <div className="text-sm text-gray-500 mb-4">No pinned pipelines yet.</div>
          ) : (
            <div className="space-y-3">
              {pipelines.map((p) => (
                <div key={p.id} className="border rounded p-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.description}</div>
                      </div>
                      <div className="text-xs text-gray-400">{p.created_at}</div>
                    </div>

                    <div className="mt-2">
                      {previewId === p.id ? (
                        <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(p.pipeline, null, 2)}</pre>
                      ) : renderPreview(p)}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <button onClick={() => onLoad(p.pipeline)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Load</button>
                    <button onClick={() => setPreviewId((v) => (v === p.id ? null : p.id))} className="px-3 py-1 border rounded text-sm">{previewId === p.id ? 'Hide' : 'Preview'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              setImporting(true);
              setError(null);
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const parsed = JSON.parse(String(reader.result));
                  onLoad(parsed);
                } catch (err: any) {
                  setError('Invalid JSON file');
                } finally {
                  setImporting(false);
                }
              };
              reader.onerror = () => { setError('Failed to read file'); setImporting(false); };
              reader.readAsText(file);
              // reset the input so the same file can be picked again if needed
              e.currentTarget.value = '';
            }} />

            <button onClick={handleOpenFile} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              {importing ? 'Loading...' : 'Open JSON file'}
            </button>
            {error && <div className="text-sm text-red-500 ml-2">{error}</div>}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadPipelineModal;
