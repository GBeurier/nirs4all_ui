// Core types for the application

export interface Dataset {
  id: string;
  name: string;
  path: string;
  linked_at?: string;
  config?: DatasetConfig;
  groups?: string[];
}

export interface DatasetConfig {
  preprocessing?: {
    method?: string;
    params?: Record<string, any>;
  };
  features?: {
    selection?: string;
    params?: Record<string, any>;
  };
}

export interface Group {
  id: string;
  name: string;
  dataset_ids: string[];
  created_at?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface Prediction {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  results?: any;
  error?: string;
}

export interface PipelineConfig {
  model: string;
  params: Record<string, any>;
  datasets: string[];
  groups?: string[];
}

export interface WorkspaceState {
  datasets: Dataset[];
  groups: Group[];
  selectedDatasets: Set<string>;
}
