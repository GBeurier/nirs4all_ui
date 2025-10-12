import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import type { Dataset } from '../types';
import type { TreeItems } from '@clevertask/react-sortable-tree';
import LoadPipelineModal from '../components/LoadPipelineModal';
import PinPipelineModal from '../components/PinPipelineModal';
import ComponentLibrary from '../components/pipeline/ComponentLibrary';
import type { LibraryGroup } from '../components/pipeline/ComponentLibrary';
import PipelineCanvas, { type TreeNode } from '../components/pipeline/PipelineCanvas';
import PipelineToolbar from '../components/pipeline/PipelineToolbar';
import NodeConfigPanel from '../components/pipeline/NodeConfigPanel';
import {
  loadComponentLibrary,
  convertToLibraryGroups,
  findComponentById,
  isGeneratorNode as isGeneratorNodeFromLib,
  supportsChildren as supportsChildrenFromLib,
  type ComponentLibraryJSON
} from '../components/pipeline/libraryDataLoader';
import { apiClient } from '../api/client';
import { saveFile as saveFileDialog, writeLocalFile, isPywebviewAvailable } from '../utils/fileDialogs';
import { removeItemById, setTreeItemProperties } from '@clevertask/react-sortable-tree';
import {
  loadNirs4allPipeline,
  exportNirs4allPipeline,
  treeNodesToNirs4all
} from '../utils/nirs4allConverter';



const PipelinePage = () => {
  // Use global state for pipeline nodes and selection
  const { state, updatePipelineNodes, updatePipelineSelectedNodeId, updatePipelineSelectedDatasetIds, clearPipelineState } = useAppState();

  // Local state for UI-specific things
  const [libraryData, setLibraryData] = useState<ComponentLibraryJSON | null>(null);
  const [libraryGroups, setLibraryGroups] = useState<LibraryGroup[]>([]);
  // Start with all groups collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set());
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [datasetsList, setDatasetsList] = useState<Dataset[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [running, setRunning] = useState(false);

  // Use global state values
  const nodes = state.pipelineNodes;
  const selectedNodeId = state.pipelineSelectedNodeId;
  const selectedDatasetIds = state.pipelineSelectedDatasetIds;

  // Use global state setters
  const setNodes = (nodes: TreeItems<TreeNode> | ((prev: TreeItems<TreeNode>) => TreeItems<TreeNode>)) => {
    if (typeof nodes === 'function') {
      updatePipelineNodes(nodes(state.pipelineNodes));
    } else {
      updatePipelineNodes(nodes);
    }
  };

  const setSelectedNodeId = updatePipelineSelectedNodeId;
  const setSelectedDatasetIds = updatePipelineSelectedDatasetIds;

  const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const cloneDeep = <T,>(value: T): T => {
    if (value === undefined) {
      return value;
    }
    return JSON.parse(JSON.stringify(value)) as T;
  };
  const buildNodeMeta = (component: ReturnType<typeof findComponentById> | null): TreeNode['meta'] => {
    if (!component) {
      return undefined;
    }
    const defaults = cloneDeep(component.defaultParams ?? {});
    let estimatorType: string | undefined;
    if (defaults && typeof defaults === 'object' && 'estimator_type' in defaults) {
      estimatorType = (defaults as Record<string, any>).estimator_type;
      delete (defaults as Record<string, any>).estimator_type;
    }

    return {
      classPath: component.classPath,
      functionPath: component.functionPath,
      defaultParams: defaults,
      editableParams: component.editableParams ? cloneDeep(component.editableParams) : undefined,
      categoryId: component.category.id,
      subcategoryId: component.subcategory?.id,
      estimatorType,
      origin: 'library',
    };
  };

  // Load component library from JSON
  useEffect(() => {
    (async () => {
      const library = await loadComponentLibrary();
      setLibraryData(library);
      const groups = convertToLibraryGroups(library);
      setLibraryGroups(groups);
      // Start with all groups collapsed
      setCollapsedGroups(new Set(groups.map(g => g.id)));
    })();
  }, []);

  // Helper functions that use the library data
  const findLibraryItemById = (componentId: string) => {
    if (!libraryData) return null;
    const comp = findComponentById(libraryData, componentId);
    if (!comp) return null;
    return {
      id: comp.id,
      label: comp.label,
      category: comp.category.id,
      shortName: comp.shortName,
    };
  };

  const isGeneratorNode = (componentId: string) => {
    if (!libraryData) return false;
    return isGeneratorNodeFromLib(libraryData, componentId);
  };

  const supportsChildren = (componentId: string) => {
    if (!libraryData) return false;
    return supportsChildrenFromLib(libraryData, componentId);
  };

  // Add component to canvas
  const addComponentToCanvas = (componentId: string) => {
    const def = libraryData ? findComponentById(libraryData, componentId) : null;
    const lib = def
      ? {
          id: def.id,
          label: def.label,
          category: def.category.id,
          shortName: def.shortName,
        }
      : findLibraryItemById(componentId) || {
          id: componentId,
          label: componentId,
          category: 'preprocessing',
          shortName: componentId,
        };

    const paramsTemplate = def ? cloneDeep(def.defaultParams ?? {}) : {};
    const meta = buildNodeMeta(def);

    const nodeType = isGeneratorNode(componentId)
      ? 'generation'
      : supportsChildren(componentId)
      ? 'container'
      : 'regular';

    const node: TreeNode = {
      id: genId(),
      label: lib.label,
      componentId: lib.id,
      category: lib.category,
      shortName: lib.shortName,
      params: paramsTemplate,
      nodeType,
      children: [],
      meta,
    };

    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
  };

  // Add component as child of a specific container
  const addComponentToContainer = (parentId: string, componentId: string) => {
    const def = libraryData ? findComponentById(libraryData, componentId) : null;
    const lib = def
      ? {
          id: def.id,
          label: def.label,
          category: def.category.id,
          shortName: def.shortName,
        }
      : findLibraryItemById(componentId) || {
          id: componentId,
          label: componentId,
          category: 'preprocessing',
          shortName: componentId,
        };

    const paramsTemplate = def ? cloneDeep(def.defaultParams ?? {}) : {};
    const meta = buildNodeMeta(def);

    const nodeType = isGeneratorNode(componentId)
      ? 'generation'
      : supportsChildren(componentId)
      ? 'container'
      : 'regular';

    const newNode: TreeNode = {
      id: genId(),
      label: lib.label,
      componentId: lib.id,
      category: lib.category,
      shortName: lib.shortName,
      params: paramsTemplate,
      nodeType,
      children: [],
      meta,
    };

    setNodes((prev) =>
      setTreeItemProperties(prev, parentId, (parent) => ({
        ...parent,
        children: [...(parent.children || []), newNode],
      }))
    );
    setSelectedNodeId(newNode.id);
  };

  // Remove node by ID
  const handleRemoveNode = (nodeId: string) => {
    setNodes((prev) => removeItemById(prev, nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Update node parameters
  const handleUpdateNodeParams = (nodeId: string, params: Record<string, any>) => {
    setNodes((prev) =>
      setTreeItemProperties(prev, nodeId, (node) => ({
        ...node,
        params,
      }))
    );
  };

  // Toggle library group
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const s = new Set(prev);
      if (s.has(groupId)) s.delete(groupId);
      else s.add(groupId);
      return s;
    });
  };

  // Toggle library subgroup
  const toggleSubgroup = (subgroupId: string) => {
    setCollapsedSubgroups((prev) => {
      const s = new Set(prev);
      if (s.has(subgroupId)) s.delete(subgroupId);
      else s.add(subgroupId);
      return s;
    });
  };

  // Handle drag start from library (HTML5 DnD)
  const onLibraryDragStart = (e: React.DragEvent, componentId: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-component-id', componentId);
    console.log('Library drag started:', componentId);
  };

  // Handle drop on canvas
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const componentId = e.dataTransfer.getData('application/x-component-id');
    if (componentId) {
      console.log('Dropped component:', componentId);
      addComponentToCanvas(componentId);
    }
  };

  // Save pipeline in nirs4all format
  const savePipeline = async () => {
    try {
      console.log('[PipelinePage] savePipeline called');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `pipeline_${timestamp}.json`;

      console.log('[PipelinePage] Calling saveFileDialog with:', defaultFilename);
      const filePath = await saveFileDialog(defaultFilename, ['JSON files (*.json)']);
      console.log('[PipelinePage] saveFileDialog returned:', filePath);

      if (!libraryData) {
        alert('Component library is still loading. Please try again once it finishes.');
        return;
      }

      const rawFileName = typeof filePath === 'string' && filePath.length > 0
        ? filePath.split(/[\\/]/).pop() || defaultFilename
        : defaultFilename;
      const derivedName = rawFileName.replace(/\.json$/i, '');

      const pipelineNameInput = window.prompt('Pipeline name', derivedName || 'pipeline');
      if (!pipelineNameInput) {
        console.log('[PipelinePage] Save cancelled - no name provided');
        return;
      }
      const pipelineName = pipelineNameInput.trim() || 'pipeline';
      const pipelineDescription = window.prompt('Pipeline description', '') ?? '';

      const pipelineJson = exportNirs4allPipeline(nodes, {
        libraryData,
        name: pipelineName,
        description: pipelineDescription,
      });
      console.log('[PipelinePage] Pipeline JSON length:', pipelineJson.length);

      const canUsePywebviewPath = isPywebviewAvailable() && typeof filePath === 'string' && filePath.length > 0;

      if (canUsePywebviewPath) {
        console.log('[PipelinePage] Using writeLocalFile to:', filePath);
        await writeLocalFile(filePath, pipelineJson);
        alert(`Pipeline saved successfully to:\n${filePath}`);
        return;
      }

      console.log('[PipelinePage] Using browser download fallback');
      const downloadName = rawFileName.endsWith('.json') ? rawFileName : `${rawFileName}.json`;
      const blob = new Blob([pipelineJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[PipelinePage] Error in savePipeline:', error);
      alert(`Failed to save pipeline: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Load pipeline from session storage or URL
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pipeline_from_prediction');
      if (stored) {
        const parsed = JSON.parse(stored);
        const nodesToLoad = loadNirs4allPipeline(parsed, libraryData);
        if (nodesToLoad.length > 0) setNodes(nodesToLoad);
        sessionStorage.removeItem('pipeline_from_prediction');
      }
    } catch (e) {
      // ignore
    }

    try {
      const qp = new URLSearchParams(window.location.search);
      const pid = qp.get('prediction_id');
      if (pid) {
        apiClient
          .loadPipelineFromPrediction(pid)
          .then((res: any) => {
            if (res && res.pipeline) {
              const nodesToLoad = loadNirs4allPipeline(res.pipeline, libraryData);
              if (nodesToLoad.length > 0) setNodes(nodesToLoad);
            }
          })
          .catch((e) => console.error('load from prediction failed', e));
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle load saved pipeline
  const handleLoadSavedPipeline = (p: any) => {
    const nodesToLoad = loadNirs4allPipeline(p, libraryData);
    if (nodesToLoad.length > 0) setNodes(nodesToLoad);
    setShowLoadModal(false);
  };

  // Load datasets and groups
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
        if (ds.length > 0 && selectedDatasetIds.size === 0)
          setSelectedDatasetIds(new Set([ds[0].id]));
      } catch (e) {
        console.error('failed to load datasets/groups for selector', e);
      }
    })();
  }, []);

  // Run pipeline
  const handleRunPipeline = async () => {
    if (running) return;
    setRunning(true);
    setProgress(2);
    try {
      // Convert to nirs4all format for backend
      const pipeline = treeNodesToNirs4all(nodes, libraryData);
      const cfg: any = { pipeline };
      const selected = Array.from(selectedDatasetIds || []);
      if (selected.length === 1) cfg.dataset_id = selected[0];
      else if (selected.length > 1) cfg.dataset_ids = selected;

      if (apiClient.runPrediction) {
        await apiClient.runPrediction(cfg);
        setProgress(100);
      } else {
        for (let p = 5; p <= 95; p += 10) {
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

  // Get selected node
  const findNodeById = (items: TreeNode[], id: string): TreeNode | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children && item.children.length > 0) {
        const found = findNodeById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = selectedNodeId ? findNodeById(nodes, selectedNodeId) : null;

  // Clear pipeline
  const handleClear = () => {
    clearPipelineState();
    setProgress(0);
  };

  // Keep linter happy
  React.useEffect(() => {
    console.debug('Pipeline progress:', progress);
  }, [progress]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Pipeline Editor</h1>
          <p className="text-gray-600">
            Drag components from the library to build your hierarchical pipeline
          </p>
        </div>

          <div className="grid grid-cols-[300px_1fr] gap-6">
            {/* Component Library - Fixed width sidebar */}
            <div className="w-[300px]">
              <ComponentLibrary
                groups={libraryGroups}
                collapsedGroups={collapsedGroups}
                collapsedSubgroups={collapsedSubgroups}
                onToggleGroup={toggleGroup}
                onToggleSubgroup={toggleSubgroup}
                onDragStart={onLibraryDragStart}
                onItemClick={addComponentToCanvas}
              />
            </div>

          {/* Pipeline Canvas - Takes remaining space */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-md p-6">
              <PipelineToolbar
                onClear={handleClear}
                onRun={handleRunPipeline}
                onLoad={() => setShowLoadModal(true)}
                onPin={() => setShowPinModal(true)}
                onSave={savePipeline}
                running={running}
                datasetsList={datasetsList}
                groupsList={groupsList}
                selectedDatasetIds={selectedDatasetIds}
                onDatasetSelectionChange={setSelectedDatasetIds}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={onCanvasDrop}
              >
                <PipelineCanvas
                  nodes={nodes}
                  selectedNodeId={selectedNodeId}
                  onNodesChange={setNodes}
                  onNodeSelect={setSelectedNodeId}
                  onNodeRemove={handleRemoveNode}
                  onLibraryDropIntoContainer={addComponentToContainer}
                  libraryData={libraryData}
                />
              </div>

              {/* Configuration Panel */}
              <div className="mt-6">
                <NodeConfigPanel
                  selectedNodeId={selectedNodeId}
                  selectedNode={selectedNode}
                  onUpdateParams={handleUpdateNodeParams}
                  libraryData={libraryData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLoadModal && (
        <LoadPipelineModal
          onLoad={handleLoadSavedPipeline}
          onClose={() => setShowLoadModal(false)}
        />
      )}
      {showPinModal && (
        <PinPipelineModal
          pipeline={treeNodesToNirs4all(nodes, libraryData)}
          onClose={() => setShowPinModal(false)}
          onPinned={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
};

export default PipelinePage;
