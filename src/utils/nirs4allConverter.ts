/**
 * Utilities to convert between nirs4all pipeline format and UI tree format
 *
 * nirs4all format supports:
 * - Direct class references: MinMaxScaler
 * - Class with params: { "class": "sklearn.preprocessing.MinMaxScaler", "params": {...} }
 * - Models: { "name": "PLS-1", "model": { "class": "...", "params": {...} } }
 * - Workflow nodes: { "feature_augmentation": [...] }
 * - Generators: { "_or_": [...], "size": 2 } or { "_range_": [1, 12, 2], "param": "n_component", "model": PLSRegression }
 * - Special nodes: "chart_2d", "fold_chart", etc.
 */

import type { TreeNode } from '../components/pipeline/PipelineCanvas';

// Mapping from nirs4all class names to UI component IDs
const CLASS_TO_COMPONENT_ID: Record<string, string> = {
  // Scalers
  'sklearn.preprocessing._data.MinMaxScaler': 'minmax_scaler',
  'sklearn.preprocessing.MinMaxScaler': 'minmax_scaler',
  'MinMaxScaler': 'minmax_scaler',
  'sklearn.preprocessing._data.StandardScaler': 'standard_scaler',
  'sklearn.preprocessing.StandardScaler': 'standard_scaler',
  'StandardScaler': 'standard_scaler',
  'sklearn.preprocessing._data.RobustScaler': 'robust_scaler',
  'sklearn.preprocessing.RobustScaler': 'robust_scaler',
  'RobustScaler': 'robust_scaler',

  // NIRS transformations
  'nirs4all.operators.transformations.signal.Detrend': 'detrend',
  'nirs4all.operators.transformations.nirs.FirstDerivative': 'first_derivative',
  'nirs4all.operators.transformations.nirs.SecondDerivative': 'second_derivative',
  'nirs4all.operators.transformations.nirs.Gaussian': 'gaussian_filter',
  'nirs4all.operators.transformations.nirs.StandardNormalVariate': 'snv',
  'nirs4all.operators.transformations.nirs.SavitzkyGolay': 'savitzky_golay',
  'nirs4all.operators.transformations.nirs.Haar': 'haar_wavelet',
  'nirs4all.operators.transformations.nirs.MultiplicativeScatterCorrection': 'msc',

  // Models
  'sklearn.cross_decomposition._pls.PLSRegression': 'pls_regression',
  'sklearn.cross_decomposition.PLSRegression': 'pls_regression',
  'PLSRegression': 'pls_regression',
  'sklearn.ensemble._forest.RandomForestClassifier': 'random_forest',
  'sklearn.ensemble.RandomForestClassifier': 'random_forest',
  'sklearn.svm._classes.SVC': 'svm',
  'sklearn.svm.SVC': 'svm',
  'sklearn.linear_model._logistic.LogisticRegression': 'logistic_regression',
  'sklearn.linear_model.LogisticRegression': 'logistic_regression',

  // Splitters
  'sklearn.model_selection._split.ShuffleSplit': 'shuffle_split',
  'sklearn.model_selection.ShuffleSplit': 'shuffle_split',
  'sklearn.model_selection._split.KFold': 'kfold',
  'sklearn.model_selection.KFold': 'kfold',
};

// Reverse mapping
const COMPONENT_ID_TO_CLASS: Record<string, string> = {
  'minmax_scaler': 'sklearn.preprocessing._data.MinMaxScaler',
  'standard_scaler': 'sklearn.preprocessing._data.StandardScaler',
  'robust_scaler': 'sklearn.preprocessing._data.RobustScaler',
  'detrend': 'nirs4all.operators.transformations.signal.Detrend',
  'first_derivative': 'nirs4all.operators.transformations.nirs.FirstDerivative',
  'second_derivative': 'nirs4all.operators.transformations.nirs.SecondDerivative',
  'gaussian_filter': 'nirs4all.operators.transformations.nirs.Gaussian',
  'snv': 'nirs4all.operators.transformations.nirs.StandardNormalVariate',
  'savitzky_golay': 'nirs4all.operators.transformations.nirs.SavitzkyGolay',
  'haar_wavelet': 'nirs4all.operators.transformations.nirs.Haar',
  'msc': 'nirs4all.operators.transformations.nirs.MultiplicativeScatterCorrection',
  'pls_regression': 'sklearn.cross_decomposition._pls.PLSRegression',
  'random_forest': 'sklearn.ensemble._forest.RandomForestClassifier',
  'svm': 'sklearn.svm._classes.SVC',
  'logistic_regression': 'sklearn.linear_model._logistic.LogisticRegression',
  'shuffle_split': 'sklearn.model_selection._split.ShuffleSplit',
  'kfold': 'sklearn.model_selection._split.KFold',
};

// Special workflow nodes
const WORKFLOW_NODES = new Set([
  'feature_augmentation',
  'sample_augmentation',
  'y_processing',
]);

// Visualization nodes
const VIZ_NODES = new Set([
  'chart_2d',
  'fold_chart',
  'confusion_matrix',
]);

// Generator keywords
const GENERATOR_KEYWORDS = new Set(['_or_', '_range_']);

/**
 * Generate a unique ID for tree nodes
 */
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Convert nirs4all pipeline array to UI TreeNode array
 */
export function nirs4allToTreeNodes(pipeline: any[]): TreeNode[] {
  if (!Array.isArray(pipeline)) {
    console.warn('Pipeline is not an array:', pipeline);
    return [];
  }

  return pipeline.map(step => convertStepToNode(step));
}

/**
 * Convert a single pipeline step to a TreeNode
 */
function convertStepToNode(step: any): TreeNode {
  // Handle null/undefined
  if (!step) {
    return createUnknownNode('null_step');
  }

  // Handle string nodes (visualization or simple references)
  if (typeof step === 'string') {
    if (VIZ_NODES.has(step)) {
      return createVisualizationNode(step);
    }
    // Try to map class name
    const componentId = CLASS_TO_COMPONENT_ID[step];
    if (componentId) {
      return createRegularNode(componentId, step, {});
    }
    return createUnknownNode(step);
  }

  // Handle objects
  if (typeof step === 'object') {
    // Check for generator nodes
    if (hasGeneratorKeys(step)) {
      return convertGeneratorNode(step);
    }

    // Check for workflow/container nodes
    const workflowKey = Object.keys(step).find(k => WORKFLOW_NODES.has(k));
    if (workflowKey) {
      return convertWorkflowNode(workflowKey, step[workflowKey]);
    }

    // Check for model node
    if ('model' in step) {
      return convertModelNode(step);
    }

    // Check for class specification
    if ('class' in step) {
      return convertClassNode(step);
    }

    // Unknown object structure
    return createUnknownNode('unknown_object', step);
  }

  return createUnknownNode('unknown_type');
}

/**
 * Check if an object has generator keys
 */
function hasGeneratorKeys(obj: any): boolean {
  if (typeof obj !== 'object' || !obj) return false;
  return Object.keys(obj).some(k => GENERATOR_KEYWORDS.has(k));
}

/**
 * Convert generator node (_or_ or _range_)
 */
function convertGeneratorNode(step: any): TreeNode {
  if ('_or_' in step) {
    // OR generator
    const choices = step._or_;
    const size = step.size;
    const count = step.count;

    const children = Array.isArray(choices)
      ? choices.map(choice => convertStepToNode(choice))
      : [];

    return {
      id: genId(),
      label: 'OR Generator',
      componentId: '_or_',
      category: 'special',
      shortName: '_OR_',
      params: {
        size: size || null,
        count: count || null,
      },
      nodeType: 'generation',
      children,
    };
  }

  if ('_range_' in step) {
    // Range generator
    const rangeSpec = step._range_;
    const param = step.param || 'value';
    const model = step.model;

    let rangeArray: number[] = [];
    if (Array.isArray(rangeSpec)) {
      rangeArray = rangeSpec;
    } else if (typeof rangeSpec === 'object') {
      rangeArray = [rangeSpec.from || 0, rangeSpec.to || 10, rangeSpec.step || 1];
    }

    // If model is specified, create model child
    const children: TreeNode[] = [];
    if (model) {
      const modelNode = convertStepToNode({ model });
      children.push(modelNode);
    }

    return {
      id: genId(),
      label: 'Range Generator',
      componentId: '_range_',
      category: 'special',
      shortName: '_RANGE_',
      params: {
        range: rangeArray,
        param: param,
      },
      nodeType: 'generation',
      children,
    };
  }

  return createUnknownNode('unknown_generator', step);
}

/**
 * Convert workflow/container node (feature_augmentation, etc.)
 */
function convertWorkflowNode(key: string, value: any): TreeNode {
  const children: TreeNode[] = [];

  if (Array.isArray(value)) {
    children.push(...value.map(child => convertStepToNode(child)));
  } else if (typeof value === 'object' && value !== null) {
    children.push(convertStepToNode(value));
  }

  return {
    id: genId(),
    label: formatLabel(key),
    componentId: key,
    category: 'special',
    shortName: key,
    params: {},
    nodeType: 'container',
    children,
  };
}

/**
 * Convert model node
 */
function convertModelNode(step: any): TreeNode {
  const modelName = step.name || 'Unnamed Model';
  const modelSpec = step.model;

  let componentId = 'unknown_model';
  let className = '';
  let params: any = {};

  if (typeof modelSpec === 'string') {
    className = modelSpec;
    componentId = CLASS_TO_COMPONENT_ID[modelSpec] || 'unknown_model';
  } else if (typeof modelSpec === 'object' && modelSpec.class) {
    className = modelSpec.class;
    componentId = CLASS_TO_COMPONENT_ID[className] || 'unknown_model';
    params = modelSpec.params || {};
  }

  return {
    id: genId(),
    label: modelName,
    componentId: componentId,
    category: 'model_training',
    shortName: modelName,
    params: {
      ...params,
      model_name: modelName,
      train_params: step.train_params || {},
      finetune_params: step.finetune_params || {},
    },
    nodeType: 'regular',
    children: [],
  };
}

/**
 * Convert class node
 */
function convertClassNode(step: any): TreeNode {
  const className = step.class;
  const params = step.params || {};
  const componentId = CLASS_TO_COMPONENT_ID[className] || 'unknown_class';

  return createRegularNode(componentId, className, params);
}

/**
 * Create a regular node
 */
function createRegularNode(componentId: string, label: string, params: any): TreeNode {
  return {
    id: genId(),
    label: formatLabel(label),
    componentId: componentId,
    category: getCategoryForComponent(componentId),
    shortName: componentId,
    params: params || {},
    nodeType: 'regular',
    children: [],
  };
}

/**
 * Create a visualization node
 */
function createVisualizationNode(vizType: string): TreeNode {
  return {
    id: genId(),
    label: formatLabel(vizType),
    componentId: vizType,
    category: 'visualization',
    shortName: vizType,
    params: {},
    nodeType: 'regular',
    children: [],
  };
}

/**
 * Create an unknown node as fallback
 */
function createUnknownNode(label: string, data?: any): TreeNode {
  return {
    id: genId(),
    label: `Unknown: ${label}`,
    componentId: 'unknown',
    category: 'unknown',
    shortName: label,
    params: data ? { _raw: data } : {},
    nodeType: 'regular',
    children: [],
  };
}

/**
 * Convert UI TreeNode array to nirs4all pipeline format
 */
export function treeNodesToNirs4all(nodes: TreeNode[]): any[] {
  return nodes.map(node => convertNodeToStep(node));
}

/**
 * Convert a single TreeNode to pipeline step
 */
function convertNodeToStep(node: TreeNode): any {
  // Handle generator nodes
  if (node.componentId === '_or_') {
    const result: any = {
      _or_: node.children?.map(child => convertNodeToStep(child)) || [],
    };
    if (node.params?.size != null) result.size = node.params.size;
    if (node.params?.count != null) result.count = node.params.count;
    return result;
  }

  if (node.componentId === '_range_') {
    const result: any = {
      _range_: node.params?.range || [0, 10, 1],
    };
    if (node.params?.param) result.param = node.params.param;
    if (node.children && node.children.length > 0) {
      // Merge model from first child
      const modelStep = convertNodeToStep(node.children[0]);
      Object.assign(result, modelStep);
    }
    return result;
  }

  // Handle workflow/container nodes
  if (WORKFLOW_NODES.has(node.componentId)) {
    const children = node.children?.map(child => convertNodeToStep(child)) || [];
    return {
      [node.componentId]: children.length === 1 ? children[0] : children,
    };
  }

  // Handle visualization nodes
  if (VIZ_NODES.has(node.componentId)) {
    return node.componentId;
  }

  // Handle model nodes
  if (node.params?.model_name || node.category === 'model_training') {
    const className = COMPONENT_ID_TO_CLASS[node.componentId];
    const result: any = {
      name: node.params?.model_name || node.label,
      model: {
        class: className || node.componentId,
      },
    };

    // Extract model params (exclude special keys)
    const { model_name, train_params, finetune_params, _raw, ...modelParams } = node.params || {};
    if (Object.keys(modelParams).length > 0) {
      result.model.params = modelParams;
    }

    if (train_params && Object.keys(train_params).length > 0) {
      result.train_params = train_params;
    }
    if (finetune_params && Object.keys(finetune_params).length > 0) {
      result.finetune_params = finetune_params;
    }

    return result;
  }

  // Handle regular class nodes
  const className = COMPONENT_ID_TO_CLASS[node.componentId];
  if (className) {
    const { _raw, ...params } = node.params || {};
    if (Object.keys(params).length > 0) {
      return {
        class: className,
        params: params,
      };
    }
    return {
      class: className,
    };
  }

  // Fallback: return raw data if available
  if (node.params?._raw) {
    return node.params._raw;
  }

  // Last resort: just the component ID
  return node.componentId;
}

/**
 * Format label for display
 */
function formatLabel(text: string): string {
  if (!text) return 'Unknown';

  // Extract last part of class path
  const parts = text.split('.');
  const lastPart = parts[parts.length - 1];

  // Convert snake_case to Title Case
  return lastPart
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get category for component
 */
function getCategoryForComponent(componentId: string): string {
  if (componentId.includes('scaler')) return 'preprocessing';
  if (componentId.includes('filter')) return 'preprocessing';
  if (componentId.includes('derivative') || componentId.includes('detrend')) return 'preprocessing';
  if (componentId.includes('regression') || componentId.includes('forest') || componentId.includes('svm')) return 'model_training';
  if (componentId.includes('split') || componentId.includes('fold')) return 'special';
  return 'preprocessing';
}

/**
 * Validate nirs4all pipeline format
 */
export function validateNirs4allPipeline(pipeline: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(pipeline)) {
    errors.push('Pipeline must be an array');
    return { valid: false, errors };
  }

  // Add more validation as needed

  return { valid: errors.length === 0, errors };
}

/**
 * Load pipeline from JSON string or object
 */
export function loadNirs4allPipeline(data: string | any): TreeNode[] {
  try {
    const pipeline = typeof data === 'string' ? JSON.parse(data) : data;

    // Handle different top-level structures
    if (Array.isArray(pipeline)) {
      return nirs4allToTreeNodes(pipeline);
    }

    if (pipeline.pipeline) {
      return nirs4allToTreeNodes(pipeline.pipeline);
    }

    if (pipeline.steps) {
      return nirs4allToTreeNodes(pipeline.steps);
    }

    if (pipeline.nodes) {
      return nirs4allToTreeNodes(pipeline.nodes);
    }

    return [];
  } catch (error) {
    console.error('Failed to load nirs4all pipeline:', error);
    return [];
  }
}

/**
 * Export pipeline to nirs4all JSON format
 */
export function exportNirs4allPipeline(nodes: TreeNode[]): string {
  const pipeline = treeNodesToNirs4all(nodes);
  return JSON.stringify(pipeline, null, 2);
}
