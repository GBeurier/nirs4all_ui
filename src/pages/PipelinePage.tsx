import React, { useEffect, useState } from 'react';
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
import { saveFile as saveFileDialog } from '../utils/fileDialogs';
import { removeItemById, setTreeItemProperties } from '@clevertask/react-sortable-tree';


const PipelinePage = () => {
  const [nodes, setNodes] = useState<TreeItems<TreeNode>>([]);
  const [libraryData, setLibraryData] = useState<ComponentLibraryJSON | null>(null);
  const [libraryGroups, setLibraryGroups] = useState<LibraryGroup[]>([]);
  // Start with all groups collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [datasetsList, setDatasetsList] = useState<Dataset[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(new Set());
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [running, setRunning] = useState(false);

  const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
    const lib = findLibraryItemById(componentId) || {
      id: componentId,
      label: componentId,
      category: 'preprocessing',
      shortName: componentId,
    };

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
      params: {},
      nodeType,
      children: [],
    };

    setNodes((prev) => [...prev, node]);
    setSelectedNodeId(node.id);
  };

  // Add component as child of a specific container
  const addComponentToContainer = (parentId: string, componentId: string) => {
    const lib = findLibraryItemById(componentId) || {
      id: componentId,
      label: componentId,
      category: 'preprocessing',
      shortName: componentId,
    };

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
      params: {},
      nodeType,
      children: [],
    };

    // Add the node as a child of the specified parent
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

  // Flatten tree for export
  const flattenTreeForExport = (items: TreeNode[]): any[] => {
    const result: any[] = [];
    for (const item of items) {
      result.push({ component: item.componentId, params: item.params || {} });
      if (item.children && item.children.length > 0) {
        result.push(...flattenTreeForExport(item.children));
      }
    }
    return result;
  };

  // Export pipeline
  const exportPipeline = () => {
    const exported = flattenTreeForExport(nodes);
    const blob = new Blob([JSON.stringify({ nodes: exported }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Save pipeline
  const savePipeline = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `pipeline_${timestamp}.json`;

      const filePath = await saveFileDialog(defaultFilename, ['JSON files (*.json)']);

      if (filePath) {
        const exported = flattenTreeForExport(nodes);
        const content = JSON.stringify({ nodes: exported }, null, 2);

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

  // Normalize pipeline to TreeNodes
  const normalizePipelineToNodes = (pipeline: any): TreeNode[] => {
    const candidate =
      (Array.isArray(pipeline) && pipeline) ||
      pipeline?.steps ||
      pipeline?.nodes ||
      pipeline?.components ||
      [];
    if (!Array.isArray(candidate)) return [];

    return candidate.map((s: any) => {
      const comp = s.component || s.name || s.type || s.op || s;
      const lib = findLibraryItemById(comp) || {
        id: comp,
        label: String(comp),
        category: 'preprocessing',
        shortName: comp,
      };

      const nodeType = isGeneratorNode(comp)
        ? 'generation'
        : supportsChildren(comp)
        ? 'container'
        : 'regular';

      return {
        id: genId(),
        componentId: lib.id,
        label: lib.label,
        category: lib.category,
        shortName: lib.shortName,
        params: s.params || s.config || {},
        nodeType,
        children: [],
      } as TreeNode;
    });
  };

  // Load pipeline from session storage or URL
  useEffect(() => {
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

    try {
      const qp = new URLSearchParams(window.location.search);
      const pid = qp.get('prediction_id');
      if (pid) {
        apiClient
          .loadPipelineFromPrediction(pid)
          .then((res: any) => {
            if (res && res.pipeline) {
              const nodesToLoad = normalizePipelineToNodes(res.pipeline);
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
    const nodesToLoad = normalizePipelineToNodes(p);
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
      const cfg: any = { nodes: flattenTreeForExport(nodes) };
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
    setNodes([]);
    setProgress(0);
    setSelectedNodeId(null);
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
                onExport={exportPipeline}
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
          pipeline={flattenTreeForExport(nodes)}
          onClose={() => setShowPinModal(false)}
          onPinned={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
};

export default PipelinePage;
