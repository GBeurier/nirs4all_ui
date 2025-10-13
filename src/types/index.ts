// Core types for the application

export interface DatasetFile {
  path: string;
  type: 'x' | 'y' | 'group';  // x=features, y=targets, group=metadata
  partition: 'train' | 'test';
  source_id?: number;  // For multiple X sources
}

export interface Dataset {
  id: string;
  name: string;
  path: string;  // Base path (folder or primary file)
  linked_at?: string;
  config?: DatasetConfig;
  files?: DatasetFile[];  // Individual file configurations
  groups?: string[];
  num_samples?: number;
  num_features?: number | number[];  // Single source: int, Multi-source: array of ints
  num_targets?: number;
  num_sources?: number;
  last_loaded?: string;
}

export interface DatasetConfig {
  // CSV parsing options
  delimiter?: string;
  decimal_separator?: string;
  has_header?: boolean;
  header_type?: string;

  // Multi-source X handling
  x_source_mode?: 'stack' | 'concat';  // stack=vertical (default), concat=horizontal

  // Legacy preprocessing/features
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

export interface SavedPipeline {
  id: string;
  name: string;
  description?: string;
  pipeline: any;
  created_at?: string;
}
