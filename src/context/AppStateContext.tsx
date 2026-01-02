import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { TreeItems } from '@clevertask/react-sortable-tree';
import type { TreeNode } from '../components/pipeline/PipelineCanvas';

// Define the shape of our app state
interface AppState {
  // Pipeline page state
  pipelineNodes: TreeItems<TreeNode>;
  pipelineSelectedNodeId: string | null;
  pipelineSelectedDatasetIds: Set<string>;

  // Add more page states here as needed
  // workspaceFilters: any;
  // predictionsView: any;
}

interface AppStateContextType {
  state: AppState;
  updatePipelineNodes: (nodes: TreeItems<TreeNode>) => void;
  updatePipelineSelectedNodeId: (id: string | null) => void;
  updatePipelineSelectedDatasetIds: (ids: Set<string>) => void;
  clearPipelineState: () => void;
}

const defaultState: AppState = {
  pipelineNodes: [],
  pipelineSelectedNodeId: null,
  pipelineSelectedDatasetIds: new Set(),
};

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const updatePipelineNodes = (nodes: TreeItems<TreeNode>) => {
    setState(prev => ({ ...prev, pipelineNodes: nodes }));
  };

  const updatePipelineSelectedNodeId = (id: string | null) => {
    setState(prev => ({ ...prev, pipelineSelectedNodeId: id }));
  };

  const updatePipelineSelectedDatasetIds = (ids: Set<string>) => {
    setState(prev => ({ ...prev, pipelineSelectedDatasetIds: ids }));
  };

  const clearPipelineState = () => {
    setState(prev => ({
      ...prev,
      pipelineNodes: [],
      pipelineSelectedNodeId: null,
      pipelineSelectedDatasetIds: new Set(),
    }));
  };

  return (
    <AppStateContext.Provider
      value={{
        state,
        updatePipelineNodes,
        updatePipelineSelectedNodeId,
        updatePipelineSelectedDatasetIds,
        clearPipelineState,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
