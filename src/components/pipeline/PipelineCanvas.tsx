import React from 'react';
import { SortableTree, type TreeItem as BaseTreeItem, type RenderItemProps, type TreeItems, TreeItemStructure } from '@clevertask/react-sortable-tree';
import '@clevertask/react-sortable-tree/dist/react-sortable-tree.css';
import { Trash2 } from 'feather-icons-react';
import type { ComponentLibraryJSON } from './libraryDataLoader';
import { getCategoryInfo, isChildAllowed } from './libraryDataLoader';

export interface TreeNode extends BaseTreeItem {
  id: string;
  label: string;
  componentId: string;
  category: string;
  params?: Record<string, any>;
  shortName?: string;
  nodeType?: 'container' | 'generation' | 'regular';
  children: TreeNode[];
}

interface PipelineCanvasProps {
  nodes: TreeNode[];
  selectedNodeId: string | null;
  onNodesChange: React.Dispatch<React.SetStateAction<TreeItems<TreeNode>>>;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeRemove: (nodeId: string) => void;
  onLibraryDropIntoContainer?: (parentId: string, componentId: string) => void;
  libraryData?: ComponentLibraryJSON | null;
}

const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  nodes,
  selectedNodeId,
  onNodesChange,
  onNodeSelect,
  onNodeRemove,
  onLibraryDropIntoContainer,
  libraryData,
}) => {
  const [dragOverContainerId, setDragOverContainerId] = React.useState<string | null>(null);

  // Get category colors from library data
  const getCategoryColors = (componentId: string) => {
    if (libraryData) {
      const categoryInfo = getCategoryInfo(libraryData, componentId);
      if (categoryInfo) {
        return {
          color: categoryInfo.color,
          bgColor: categoryInfo.bgColor,
        };
      }
    }
    // Fallback to hardcoded colors if library not loaded
    const category = nodes.find(n => n.componentId === componentId)?.category || '';
    return {
      color: category === 'preprocessing' ? '#60a5fa' :
             category === 'feature_extraction' ? '#4ade80' :
             category === 'model_training' ? '#a78bfa' :
             category === 'prediction' ? '#f87171' :
             category === 'special' ? '#fbbf24' : '#9ca3af',
      bgColor: category === 'preprocessing' ? '#eff6ff' :
               category === 'feature_extraction' ? '#f0fdf4' :
               category === 'model_training' ? '#faf5ff' :
               category === 'prediction' ? '#fef2f2' :
               category === 'special' ? '#fffbeb' : '#f9fafb',
    };
  };
  // Helper to check if a tree structure is valid (only containers have children)
  const isValidTreeStructure = (items: TreeNode[]): boolean => {
    for (const item of items) {
      // If item has children, it must be a container
      if (item.children && item.children.length > 0) {
        if (item.nodeType !== 'container') {
          console.warn(`Invalid structure: Node "${item.label}" (type: ${item.nodeType}) cannot have children`);
          return false;
        }

        // Check if children are allowed in this container
        if (libraryData) {
          for (const child of item.children) {
            if (!isChildAllowed(libraryData, item.componentId, child.componentId)) {
              console.warn(`Invalid structure: "${child.label}" (${child.componentId}) is not allowed in "${item.label}" (${item.componentId})`);
              return false;
            }
          }
        }

        // Recursively check children
        if (!isValidTreeStructure(item.children)) {
          return false;
        }
      }
    }
    return true;
  };

  // Wrapped onChange that validates the tree structure
  const handleNodesChange = (newNodesOrUpdater: TreeItems<TreeNode> | ((prev: TreeItems<TreeNode>) => TreeItems<TreeNode>)) => {
    if (typeof newNodesOrUpdater === 'function') {
      onNodesChange((prev) => {
        const newNodes = newNodesOrUpdater(prev);
        // Validate before applying
        if (isValidTreeStructure(newNodes)) {
          return newNodes;
        } else {
          console.warn('Drop rejected: Only container nodes can have children');
          return prev; // Keep previous state
        }
      });
    } else {
      // Direct value
      if (isValidTreeStructure(newNodesOrUpdater)) {
        onNodesChange(newNodesOrUpdater);
      } else {
        console.warn('Drop rejected: Only container nodes can have children');
        // Don't update state
      }
    }
  };

  const renderItem = (props: RenderItemProps<TreeNode>) => {
    const { treeItem: item, dragListeners, onCollapse, collapsed } = props;
    const isSelected = item.id === selectedNodeId;
    const displayName = item.shortName || item.label;
    const isGeneration = item.nodeType === 'generation';
    const isContainer = item.nodeType === 'container';
    const isDragOver = dragOverContainerId === item.id;

    // HTML5 DnD handlers for containers to accept library drops
    const handleContainerDragOver = (e: React.DragEvent) => {
      if (!isContainer) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setDragOverContainerId(item.id as string);
    };

    const handleContainerDragLeave = (e: React.DragEvent) => {
      if (!isContainer) return;
      e.stopPropagation();
      // Only clear if leaving the container itself, not child elements
      if (e.currentTarget === e.target) {
        setDragOverContainerId(null);
      }
    };

    const handleContainerDrop = (e: React.DragEvent) => {
      if (!isContainer) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOverContainerId(null);

      const componentId = e.dataTransfer.getData('application/x-component-id');
      if (componentId && onLibraryDropIntoContainer) {
        // Validate if this child is allowed
        if (libraryData && !isChildAllowed(libraryData, item.componentId, componentId)) {
          alert(`Cannot add this component: "${componentId}" is not allowed in "${item.label}".\n\nOnly preprocessing components are allowed in containers.`);
          return;
        }
        console.log('Library component dropped into container:', componentId, '→', item.id);
        onLibraryDropIntoContainer(item.id as string, componentId);
      }
    };

    const colors = getCategoryColors(item.componentId);

    return (
      <TreeItemStructure
        {...props}
        draggableItemStyle={{
          padding: '1rem',
          marginBottom: '0.75rem', // Add spacing between rows
          borderRadius: '0.5rem',
          transition: 'all 0.2s',
          borderLeft: `4px solid ${colors.color}`,
          backgroundColor: colors.bgColor,
          outline: isSelected ? '4px solid #3b82f6' : 'none',
          outlineOffset: '4px', // Increased offset so border doesn't get clipped
        }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 flex-1">
            {/* Drag Handle */}
            <button
              {...dragListeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
              title="Drag to reorder"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="4" cy="4" r="1.5"/>
                <circle cx="4" cy="8" r="1.5"/>
                <circle cx="4" cy="12" r="1.5"/>
                <circle cx="12" cy="4" r="1.5"/>
                <circle cx="12" cy="8" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
              </svg>
            </button>

            {/* Collapse Button */}
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="text-gray-500 hover:text-gray-700 p-1"
                type="button"
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? '▶' : '▼'}
              </button>
            )}

            {/* Clickable Content */}
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(item.id as string);
              }}
            >
              <div className="font-semibold text-gray-900">{displayName}</div>
              {isContainer && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">
                  CONTAINER 📦
                </span>
              )}
              {isGeneration && (
                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-medium">
                  GENERATOR ⚡
                </span>
              )}
              {!isContainer && !isGeneration && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                  COMPONENT
                </span>
              )}
              <div className="text-xs font-mono text-gray-600">{item.componentId}</div>
            </div>
          </div>

          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeRemove(item.id as string);
            }}
            className="text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
            title="Remove node"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Container empty state */}
        {isContainer && (!item.children || item.children.length === 0) && (
          <div
            className={`mt-3 p-4 bg-white bg-opacity-50 rounded border-2 border-dashed transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-100'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            onDrop={handleContainerDrop}
          >
            <div className={`text-sm font-medium ${isDragOver ? 'text-blue-700' : 'text-gray-500'}`}>
              📦 {isDragOver ? 'Release to drop here' : 'Drop preprocessing components here'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {isDragOver ? 'Add component to this container' : 'Only preprocessing components (scalers, filters, baseline) are allowed'}
            </div>
          </div>
        )}

        {/* Child count with drop zone for non-empty containers */}
        {isContainer && item.children && item.children.length > 0 && (
          <div
            className={`mt-2 p-2 rounded border-2 border-dashed transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-100'
                : 'border-transparent hover:border-blue-300'
            }`}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            onDrop={handleContainerDrop}
          >
            <div className={`text-xs font-medium ${isDragOver ? 'text-blue-700' : 'text-gray-500'}`}>
              {isDragOver
                ? '➕ Release to add preprocessing component'
                : `Contains ${item.children.length} child node${item.children.length !== 1 ? 's' : ''} (drop preprocessing here to add more)`
              }
            </div>
          </div>
        )}
      </TreeItemStructure>
    );
  };

  return (
    <div className="min-h-[70vh] overflow-auto border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
      {nodes.length === 0 ? (
        <div className="text-center py-16 h-full flex items-center justify-center">
          <div>
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg mb-2 font-medium">Your pipeline is empty</p>
            <p className="text-gray-400 text-sm">
              Drag components from the library here or click to add
            </p>
          </div>
        </div>
      ) : (
        <SortableTree
          items={nodes}
          setItems={handleNodesChange}
          renderItem={renderItem}
          isCollapsible={true}
          isRemovable={false}
          allowNestedItemAddition={true}
          indentationWidth={40}
          showDropIndicator={true}
        />
      )}
    </div>
  );
};

export default PipelineCanvas;
