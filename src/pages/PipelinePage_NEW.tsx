import React, { useEffect, useRef, useState } from 'react';
import type { Dataset } from '../types';
import { Folder, Save, Download, Trash2, Play, Filter, MapPin, Layers as LayersIcon, Cpu, Activity, ChevronDown, Database } from 'feather-icons-react';
import LoadPipelineModal from '../components/LoadPipelineModal';
import PinPipelineModal from '../components/PinPipelineModal';
import { apiClient } from '../api/client';
import { saveFile as saveFileDialog } from '../utils/fileDialogs';

// Component library grouped and sub-grouped (foldable)
const LIBRARY_GROUPS = [
  {
    id: 'preprocessing',
    label: 'Preprocessing',
    className: 'bg-blue-50 border-blue-200',
    subgroups: [
      { id: 'scalers', label: 'Scalers', items: [
        { id: 'minmax_scaler', label: 'MinMax Scaler' },
        { id: 'standard_scaler', label: 'Standard Scaler' },
        { id: 'robust_scaler', label: 'Robust Scaler' },
      ]},
      { id: 'filters', label: 'Filters', items: [
        { id: 'bandpass_filter', label: 'Bandpass Filter' },
        { id: 'lowpass_filter', label: 'Lowpass Filter' },
        { id: 'highpass_filter', label: 'Highpass Filter' },
      ]},
      { id: 'baseline', label: 'Baseline', items: [
        { id: 'detrend', label: 'Detrend' },
        { id: 'polynomial_baseline', label: 'Polynomial Baseline' },
      ]},
    ],
  },
  {
    id: 'feature_extraction',
    label: 'Feature Extraction',
    className: 'bg-green-50 border-green-200',
    subgroups: [
      { id: 'statistical', label: 'Statistical Features', items: [
        { id: 'mean_feature', label: 'Mean' },
        { id: 'std_feature', label: 'Standard Deviation' },
        { id: 'variance_feature', label: 'Variance' },
      ]},
      { id: 'frequency', label: 'Frequency Domain', items: [
        { id: 'fft_features', label: 'FFT Features' },
        { id: 'wavelet_features', label: 'Wavelet Features' },
      ]},
    ],
  },
  {
    id: 'model_training',
    label: 'Model Training',
    className: 'bg-purple-50 border-purple-200',
    subgroups: [
      { id: 'classical', label: 'Classical ML', items: [
        { id: 'svm', label: 'SVM' },
        { id: 'random_forest', label: 'Random Forest' },
        { id: 'logistic_regression', label: 'Logistic Regression' },
      ]},
      { id: 'neural', label: 'Neural Networks', items: [
        { id: 'cnn', label: 'CNN' },
        { id: 'lstm', label: 'LSTM' },
        { id: 'mlp', label: 'MLP' },
      ]},
    ],
  },
  {
    id: 'prediction',
    label: 'Prediction',
    className: 'bg-red-50 border-red-200',
    subgroups: [
      { id: 'prediction_ops', label: 'Prediction', items: [
        { id: 'batch_prediction', label: 'Batch Prediction' },
        { id: 'real_time_prediction', label: 'Real-time Prediction' },
        { id: 'probability_calibration', label: 'Probability Calibration' },
      ]},
    ],
  },
];

// Visual helpers for the library
const GROUP_ICONS: Record<string, any> = {
  preprocessing: Filter,
  feature_extraction: LayersIcon,
  model_training: Cpu,
  prediction: Activity,
};

const GROUP_ICON_COLORS: Record<string, string> = {
  preprocessing: 'text-blue-600',
  feature_extraction: 'text-green-600',
  model_training: 'text-purple-600',
  prediction: 'text-red-600',
};

const GROUP_HOVER_CLASSES: Record<string, string> = {
  preprocessing: 'hover:bg-blue-100',
  feature_extraction: 'hover:bg-green-100',
  model_training: 'hover:bg-purple-100',
  prediction: 'hover:bg-red-100',
};

const CATEGORY_CLASSES: Record<string, string> = {
  preprocessing: 'bg-blue-50',
  feature_extraction: 'bg-green-50',
  model_training: 'bg-purple-50',
  prediction: 'bg-red-50',
};
const GROUP_ITEM_CLASSES: Record<string, string> = {
  preprocessing: 'bg-blue-50 border-blue-200 text-gray-700',
  feature_extraction: 'bg-green-50 border-green-200 text-gray-700',
  model_training: 'bg-purple-50 border-purple-200 text-gray-700',
  prediction: 'bg-red-50 border-red-200 text-gray-700',
};

interface Node {
  id: string;
  componentId: string;
  label: string;
  category: string;
  params?: any;
}

const PipelinePage = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  // Default to collapsed groups/subgroups like the mockup
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(LIBRARY_GROUPS.map((g) => g.id)));
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set(LIBRARY_GROUPS.flatMap((g) => g.subgroups.map((s) => s.id))));
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [paramEntries, setParamEntries] = useState<Array<{ id: string; key: string; value: string }>>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [datasetsList, setDatasetsList] = useState<Dataset[]>([]);
  // multi-select datasets (grouped chooser)
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(new Set());
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);
  const datasetDropdownRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // generate simple unique id
  const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const addComponentToCanvas = (componentId: string) => {
    const lib = findLibraryItemById(componentId) || { id: componentId, label: componentId, category: 'preprocessing' };
    const node: Node = {
      id: genId(),
      componentId: lib.id,
      label: lib.label,
      category: lib.category,
      params: {},
    };
    setNodes((n) => {
      const newList = [...n, node];
      return newList;
    });
    // Select the newly added node so its configuration panel opens
    setSelectedNodeId(node.id);
    // Scroll canvas into view after a short delay so DOM is updated
    setTimeout(() => {
      try { canvasRef.current?.scrollTo({ top: canvasRef.current.scrollHeight, behavior: 'smooth' }); } catch (e) { /* ignore */ }
    }, 60);
  };

  const removeNode = (id: string) => {
    setNodes((n) => n.filter((x) => x.id !== id));
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const s = new Set(prev);
      if (s.has(groupId)) s.delete(groupId);
      else s.add(groupId);
      return s;
    });
  };
  const toggleSubgroup = (subId: string) => {
    setCollapsedSubgroups((prev) => {
      const s = new Set(prev);
      if (s.has(subId)) s.delete(subId);
      else s.add(subId);
      return s;
    });
  };

  const onLibraryDragStart = (e: React.DragEvent, componentId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'library', componentId }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onNodeDragStart = (e: React.DragEvent, nodeId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'node', nodeId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingNodeId(nodeId);
  };

  const onNodeDragOver = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    setDragOverNodeId(nodeId);
  };

  const moveNode = (dragId: string, targetId: string | null) => {
    setNodes((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((x) => x.id === dragId);
      if (from === -1) return prev;
      const [item] = arr.splice(from, 1);
      if (!targetId) {
        arr.push(item);
      } else {
        const to = arr.findIndex((x) => x.id === targetId);
        const insertAt = to === -1 ? arr.length : to;
        arr.splice(insertAt, 0, item);
      }
      return arr;
    });
  };

  const onNodeDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type === 'library' && parsed.componentId) {
        addComponentToCanvas(parsed.componentId);
      } else if (parsed && parsed.type === 'node' && parsed.nodeId) {
        moveNode(parsed.nodeId, targetId);
      }
    } catch (err) {
      // fallback: plain text component id
      if (raw) addComponentToCanvas(raw);
    }
    setDraggingNodeId(null);
    setDragOverNodeId(null);
  };

  const onNodeDragEnd = () => {
    setDraggingNodeId(null);
    setDragOverNodeId(null);
  };

  // Selection/config
  useEffect(() => {
    if (!selectedNodeId) {
      setParamEntries([]);
      return;
    }
    const node = nodes.find((n) => n.id === selectedNodeId);
    const entries = Object.entries(node?.params || {}).map(([k, v]) => ({ id: genId(), key: k, value: String(v) }));
    setParamEntries(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const updateNodeParams = (nodeId: string, newParams: Record<string, any>) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, params: newParams } : n)));
  };

  const exportPipeline = () => {
    const exported = nodes.map((n) => ({ component: n.componentId, params: n.params }));
    const blob = new Blob([JSON.stringify({ nodes: exported }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const savePipeline = async () => {
    // Save-as: Open native save dialog
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `pipeline_${timestamp}.json`;

      const filePath = await saveFileDialog(defaultFilename, ['JSON files (*.json)']);

      if (filePath) {
        // User selected a save location
        const exported = nodes.map((n) => ({ component: n.componentId, params: n.params }));
        const content = JSON.stringify({ nodes: exported }, null, 2);

        // Create a download link (pywebview limitation - cannot write directly)
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split(/[\\/]/).pop() || defaultFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to save pipeline:', error);
      alert('Failed to save pipeline');
    }
  };

  const normalizePipelineToNodes = (pipeline: any): Node[] => {
    const candidate = (Array.isArray(pipeline) && pipeline) || pipeline?.steps || pipeline?.nodes || pipeline?.components || [];
    if (!Array.isArray(candidate)) return [];
    return candidate.map((s: any) => {
      const comp = s.component || s.name || s.type || s.op || s;
      const lib = findLibraryItemById(comp) || { id: comp, label: String(comp), category: 'preprocessing' };
      return {
        id: genId(),
        componentId: lib.id,
        label: lib.label,
        category: lib.category,
        params: s.params || s.config || {},
      } as Node;
    });
  };

  const findLibraryItemById = (id: string) => {
    for (const g of LIBRARY_GROUPS) {
      for (const sg of g.subgroups) {
        const found = sg.items.find((it: any) => it.id === id);
        if (found) {
          return { ...found, category: g.id };
        }
      }
    }
    return null;
  };

  useEffect(() => {
    // if pipeline loaded from prediction is present in session storage, load it
    try {
      const stored = sessionStorage.getItem('pipeline_from_prediction');
      if (stored) {
        const parsed = JSON.parse(stored);
        const nodesToLoad = normalizePipelineToNodes(parsed);
        if (nodesToLoad.length > 0) setNodes(nodesToLoad);
        sessionStorage.removeItem('pipeline_from_prediction');
      }
    } catch (e) {
      // ignore
    }

    // also check URL for prediction_id param
    try {
      const qp = new URLSearchParams(window.location.search);
      const pid = qp.get('prediction_id');
      if (pid) {
        apiClient.loadPipelineFromPrediction(pid).then((res: any) => {
          if (res && res.pipeline) {
            const nodesToLoad = normalizePipelineToNodes(res.pipeline);
            if (nodesToLoad.length > 0) setNodes(nodesToLoad);
          }
        }).catch((e) => console.error('load from prediction failed', e));
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadSavedPipeline = (p: any) => {
    const nodesToLoad = normalizePipelineToNodes(p);
    if (nodesToLoad.length > 0) setNodes(nodesToLoad);
    setShowLoadModal(false);
  };

  const handlePinPipeline = () => {
    setShowPinModal(true);
  };

  // Save/pin will be handled by PinPipelineModal using apiClient.savePipeline

  // Load datasets and groups for the grouped dataset selector
  useEffect(() => {
    (async () => {
      try {
        const [ws, gr] = await Promise.all([
          apiClient.getWorkspace().catch(() => ({})),
          apiClient.getGroups().catch(() => ({ groups: [] })),
        ]);
  const ds: Dataset[] = ((ws as any) && ((ws as any).datasets || [])) || [];
        setDatasetsList(ds);
        setGroupsList((gr && gr.groups) || []);
        if (ds.length > 0 && selectedDatasetIds.size === 0) setSelectedDatasetIds(new Set([ds[0].id]));
      } catch (e) {
        console.error('failed to load datasets/groups for selector', e);
      }
    })();
  }, []);

  // Reusable run handler so Launch/Clear/Progress are colocated at the top
  const handleRunPipeline = async () => {
    if (running) return;
    setRunning(true);
    setProgress(2);
    try {
  const cfg: any = { nodes: nodes.map((n) => ({ component: n.componentId, params: n.params })) };
  const selected = Array.from(selectedDatasetIds || []);
  if (selected.length === 1) cfg.dataset_id = selected[0];
  else if (selected.length > 1) cfg.dataset_ids = selected;
      if (apiClient.runPrediction) {
        await apiClient.runPrediction(cfg);
        setProgress(100);
      } else {
        // Simulated progress
        for (let p = 5; p <= 95; p += 10) {
          // small delay
          // eslint-disable-next-line no-await-in-loop
          await new Promise((res) => setTimeout(res, 250));
          setProgress(p);
        }
        setProgress(100);
      }
    } catch (e) {
      console.error('Run failed', e);
      setProgress(0);
      alert('Pipeline run failed');
    } finally {
      setRunning(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  // Keep linter happy and provide debug output: progress is updated while the pipeline runs
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('Pipeline progress:', progress);
  }, [progress]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Pipeline Editor</h1>
            <p className="text-gray-600">Drag components from the library to build your pipeline</p>
          </div>

          {/* controls moved to the Pipeline Canvas header (avoids duplication) */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Component Library */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6 overflow-auto max-h-[70vh]">
              <h2 className="text-lg font-semibold mb-4">Component Library</h2>
              <div className="space-y-3">
                {LIBRARY_GROUPS.map((g) => (
                  <div key={g.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* group header - full width clickable, p-4 to match mockup */}
                    <button type="button" onClick={() => toggleGroup(g.id)} aria-expanded={!collapsedGroups.has(g.id)} className={`w-full flex justify-between items-center p-4 ${g.className} ${GROUP_HOVER_CLASSES[g.id]} transition-colors cursor-pointer`}>
                      <div className="flex items-center">
                        {GROUP_ICONS[g.id] && React.createElement(GROUP_ICONS[g.id], { className: `mr-3 w-6 h-6 ${GROUP_ICON_COLORS[g.id]}`, stroke: 'currentColor', fill: 'none' })}
                        <span className="font-medium text-gray-900">{g.label}</span>
                      </div>
                      <div className="text-sm font-medium">
                        <ChevronDown className={`w-5 h-5 transform transition-transform ${collapsedGroups.has(g.id) ? '' : 'rotate-180'}`} aria-hidden />
                      </div>
                    </button>

                    {!collapsedGroups.has(g.id) && (
                      <div className="p-3 space-y-2">
                        {g.subgroups.map((sg) => (
                          <div key={sg.id} className="mb-2">
                            <div className={`pl-4 border-l-2 ${g.id === 'preprocessing' ? 'border-blue-200' : g.id === 'feature_extraction' ? 'border-green-200' : g.id === 'model_training' ? 'border-purple-200' : 'border-red-200'}`}>
                              <button type="button" onClick={() => toggleSubgroup(sg.id)} aria-expanded={!collapsedSubgroups.has(sg.id)} className="w-full text-left text-sm font-medium text-gray-700 mb-2">
                                {sg.label}
                              </button>
                              {!collapsedSubgroups.has(sg.id) && (
                                <div className="pl-4 space-y-1">
                                  {sg.items.map((item: any) => (
                                    <div
                                      key={item.id}
                                      draggable
                                      onDragStart={(e) => onLibraryDragStart(e, item.id)}
                                      onClick={() => addComponentToCanvas(item.id)}
                                      className={`component-card ${GROUP_ITEM_CLASSES[g.id]} border rounded p-2 cursor-move text-sm`}
                                    >
                                      {item.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                {/* Left: Clear + Launch */}
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => { setNodes([]); setProgress(0); setSelectedNodeId(null); }} className="inline-flex items-center px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50" title="Clear pipeline">
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button type="button" onClick={handleRunPipeline} className={`inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${running ? 'opacity-70' : ''}`} title="Launch pipeline">
                    <Play className="w-5 h-5" />
                  </button>
                </div>

                {/* Center: dataset chooser (button only) */}
                <div className="flex-1 flex justify-center">
                  <div className="relative" ref={datasetDropdownRef}>
                    <button type="button" onClick={() => setDatasetDropdownOpen((v) => !v)} className="inline-flex items-center px-3 py-2 border rounded-lg bg-white shadow-sm" title="Select datasets">
                      <Database className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">{selectedDatasetIds.size === 0 ? 'Datasets' : `${selectedDatasetIds.size} selected`}</span>
                    </button>
                    {datasetDropdownOpen && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-96 bg-white border rounded shadow-lg z-50 p-3">
                        <div className="space-y-2 max-h-64 overflow-auto">
                          {groupsList.map((g: any) => (
                            <div key={g.id} className="border-b last:border-b-0 pb-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">{g.name}</div>
                              <div className="space-y-1 pl-2">
                                {(g.dataset_ids || []).map((did: string) => {
                                  const ds = datasetsList.find((d) => d.id === did);
                                  if (!ds) return null;
                                  return (
                                    <label key={did} className="flex items-center gap-2 text-sm">
                                      <input type="checkbox" checked={selectedDatasetIds.has(did)} onChange={() => {
                                        setSelectedDatasetIds((prev) => {
                                          const s = new Set(prev);
                                          if (s.has(did)) s.delete(did);
                                          else s.add(did);
                                          return s;
                                        });
                                      }} />
                                      <span>{ds.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {datasetsList.filter((d) => !(d.groups && d.groups.length)).length > 0 && (
                            <div className="pt-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">Ungrouped</div>
                              <div className="space-y-1 pl-2">
                                {datasetsList.filter((d) => !(d.groups && d.groups.length)).map((d) => (
                                  <label key={d.id} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={selectedDatasetIds.has(d.id)} onChange={() => setSelectedDatasetIds((prev) => {
                                      const s = new Set(prev);
                                      if (s.has(d.id)) s.delete(d.id);
                                      else s.add(d.id);
                                      return s;
                                    })} />
                                    <span>{d.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex justify-between">
                          <button type="button" onClick={() => setSelectedDatasetIds(new Set())} className="text-sm text-gray-600">Clear</button>
                          <button type="button" onClick={() => setDatasetDropdownOpen(false)} className="text-sm text-blue-600">Done</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: icon-only actions */}
                <div className="flex items-center gap-3">
                  <button title="Load pipeline" onClick={() => setShowLoadModal(true)} className="px-3 py-2 rounded bg-white border text-gray-700 hover:bg-gray-50" aria-label="Load pipeline">
                    <Folder className="w-5 h-5" />
                  </button>
                  <button title="Pin pipeline (save to workspace)" onClick={handlePinPipeline} className="px-3 py-2 rounded bg-white border text-gray-700 hover:bg-gray-50" aria-label="Pin pipeline">
                    <MapPin className="w-5 h-5 text-gray-700" />
                  </button>
                  <button title="Save pipeline (save as JSON file)" onClick={savePipeline} className="px-3 py-2 rounded bg-white border text-gray-700 hover:bg-gray-50" aria-label="Save pipeline">
                    <Save className="w-5 h-5 text-gray-700" />
                  </button>
                  <button title="Export pipeline (quick download)" onClick={exportPipeline} className="px-3 py-2 rounded bg-white border text-gray-700 hover:bg-gray-50" aria-label="Export pipeline">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                ref={canvasRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onNodeDrop(e, null)}
                className="max-h-[60vh] overflow-auto border-2 border-dashed border-gray-300 rounded-lg p-4"
              >
                {nodes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Drag components from the library to build your pipeline</p>
                ) : (
                  <div className="space-y-3">
                    {nodes.map((n) => (
                      <div
                        key={n.id}
                        draggable
                        onDragStart={(e) => onNodeDragStart(e, n.id)}
                        onDragOver={(e) => onNodeDragOver(e, n.id)}
                        onDrop={(e) => onNodeDrop(e, n.id)}
                        onDragEnd={onNodeDragEnd}
                        onClick={() => setSelectedNodeId(n.id)}
                        className={`p-3 border rounded flex items-center justify-between cursor-move ${CATEGORY_CLASSES[n.category] || 'bg-gray-50'} ${dragOverNodeId === n.id ? 'ring-2 ring-blue-400' : ''} ${draggingNodeId === n.id ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-semibold">{n.label}</div>
                          <div className="text-xs font-mono text-gray-600">{n.componentId}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} className="text-red-500 flex items-center gap-1">
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configuration panel for selected node (appears below canvas) */}
              <div className="mt-4">
                {selectedNodeId ? (
                  <div className="bg-white border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Component configuration</div>
                      <div className="text-sm text-gray-500">Node: {selectedNodeId}</div>
                    </div>

                    <div className="space-y-3">
                      {paramEntries.length === 0 ? (
                        <div className="text-sm text-gray-500">No parameters yet. Add key/value pairs.</div>
                      ) : (
                        <>
                          {paramEntries.map((pe) => (
                            <div key={pe.id} className="flex gap-2">
                              <input value={pe.key} onChange={(e) => setParamEntries((prev) => prev.map((p) => p.id === pe.id ? { ...p, key: e.target.value } : p))} className="border rounded px-2 py-1 w-1/3" />
                              <input value={pe.value} onChange={(e) => setParamEntries((prev) => prev.map((p) => p.id === pe.id ? { ...p, value: e.target.value } : p))} className="border rounded px-2 py-1 flex-1" />
                              <button onClick={() => setParamEntries((prev) => prev.filter((p) => p.id !== pe.id))} className="text-red-500">Remove</button>
                            </div>
                          ))}

                          <div className="flex gap-2">
                            <button onClick={() => setParamEntries((prev) => [...prev, { id: genId(), key: '', value: '' }])} className="px-3 py-1 border rounded">Add param</button>
                            <button onClick={() => { const nodeId = selectedNodeId; const params: any = {}; paramEntries.forEach((p) => { if (p.key) params[p.key] = p.value; }); if (nodeId) updateNodeParams(nodeId, params); }} className="px-3 py-1 bg-blue-600 text-white rounded">Save params</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Select a node to edit its parameters.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {showLoadModal && <LoadPipelineModal onLoad={handleLoadSavedPipeline} onClose={() => setShowLoadModal(false)} />}
      {showPinModal && <PinPipelineModal pipeline={nodes.map((n) => ({ component: n.componentId, params: n.params }))} onClose={() => setShowPinModal(false)} onPinned={() => setShowPinModal(false)} />}
    </div>
  );
};

export default PipelinePage;
