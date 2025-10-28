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

import type { TreeNode, NodeMetadata } from '../components/pipeline/PipelineCanvas';
import type {
  ComponentLibraryJSON,
  ComponentDefinition,
  CategoryDefinition,
  SubcategoryDefinition,
} from '../components/pipeline/libraryDataLoader';

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
  'nirs4all.operators.transforms.signal.Detrend': 'detrend',
  'nirs4all.operators.transforms.nirs.FirstDerivative': 'first_derivative',
  'nirs4all.operators.transforms.nirs.SecondDerivative': 'second_derivative',
  'nirs4all.operators.transforms.nirs.Gaussian': 'gaussian_filter',
  'nirs4all.operators.transforms.nirs.StandardNormalVariate': 'snv',
  'nirs4all.operators.transforms.nirs.SavitzkyGolay': 'savitzky_golay',
  'nirs4all.operators.transforms.nirs.Haar': 'haar_wavelet',
  'nirs4all.operators.transforms.nirs.MultiplicativeScatterCorrection': 'msc',

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
  'detrend': 'nirs4all.operators.transforms.signal.Detrend',
  'first_derivative': 'nirs4all.operators.transforms.nirs.FirstDerivative',
  'second_derivative': 'nirs4all.operators.transforms.nirs.SecondDerivative',
  'gaussian_filter': 'nirs4all.operators.transforms.nirs.Gaussian',
  'snv': 'nirs4all.operators.transforms.nirs.StandardNormalVariate',
  'savitzky_golay': 'nirs4all.operators.transforms.nirs.SavitzkyGolay',
  'haar_wavelet': 'nirs4all.operators.transforms.nirs.Haar',
  'msc': 'nirs4all.operators.transforms.nirs.MultiplicativeScatterCorrection',
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
  'augmentation_sample',
  'sequential',
  'pipeline',
  'y_processing',
]);

// Visualization nodes
const VIZ_NODES = new Set([
  'chart_2d',
  'chart_3d',
  'fold_chart',
  'y_chart',
  'confusion_matrix',
]);

// Generator keywords
const GENERATOR_KEYWORDS = new Set(['_or_', '_range_']);

interface ComponentMeta {
  definition: ComponentDefinition;
  category?: CategoryDefinition;
  subcategory?: SubcategoryDefinition;
}

interface ComponentMaps {
  byId: Map<string, ComponentMeta>;
  byClassPath: Map<string, ComponentMeta>;
  byFunctionPath: Map<string, ComponentMeta>;
}

function buildComponentMaps(library?: ComponentLibraryJSON | null): ComponentMaps {
  const byId: Map<string, ComponentMeta> = new Map();
  const byClassPath: Map<string, ComponentMeta> = new Map();
  const byFunctionPath: Map<string, ComponentMeta> = new Map();

  if (!library) {
    return { byId, byClassPath, byFunctionPath };
  }

  const categoryMap = new Map(library.categories.map((category) => [category.id, category]));
  const subcategoryMap = new Map(library.subcategories.map((subcategory) => [subcategory.id, subcategory]));

  for (const definition of library.components) {
    const subcategory = subcategoryMap.get(definition.subcategoryId);
    const category = subcategory ? categoryMap.get(subcategory.categoryId) : undefined;
    const meta: ComponentMeta = {
      definition,
      category,
      subcategory,
    };
    byId.set(definition.id, meta);

    if (definition.classPath && !byClassPath.has(definition.classPath)) {
      byClassPath.set(definition.classPath, meta);
    }
    if (definition.functionPath && !byFunctionPath.has(definition.functionPath)) {
      byFunctionPath.set(definition.functionPath, meta);
    }
  }

  return { byId, byClassPath, byFunctionPath };
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

type NodeMeta = NodeMetadata;

function buildNodeMetaFromComponent(meta?: ComponentMeta): NodeMeta | undefined {
  if (!meta) {
    return undefined;
  }
  const defaults = meta.definition.defaultParams ?? {};
  const editable = meta.definition.editableParams ?? [];
  return {
    classPath: meta.definition.classPath,
    functionPath: meta.definition.functionPath,
    defaultParams: cloneValue(defaults),
    editableParams: cloneValue(editable),
    categoryId: meta.category?.id,
    subcategoryId: meta.subcategory?.id,
  };
}

function mergeNodeMeta(base?: NodeMeta, override?: Partial<NodeMeta>): NodeMeta | undefined {
  if (!base && !override) {
    return undefined;
  }
  const result: NodeMeta = { ...(base ?? {}) };
  if (override) {
    if (override.classPath !== undefined) {
      result.classPath = override.classPath;
    }
    if (override.functionPath !== undefined) {
      result.functionPath = override.functionPath;
    }
    if (override.defaultParams !== undefined) {
      result.defaultParams = cloneValue(override.defaultParams);
    }
    if (override.categoryId !== undefined) {
      result.categoryId = override.categoryId;
    }
    if (override.subcategoryId !== undefined) {
      result.subcategoryId = override.subcategoryId;
    }
    if (override.estimatorType !== undefined) {
      result.estimatorType = override.estimatorType;
    }
    if (override.editableParams !== undefined) {
      result.editableParams = cloneValue(override.editableParams);
    }
    if (override.origin !== undefined) {
      result.origin = override.origin;
    }
  }
  if (result.defaultParams) {
    result.defaultParams = cloneValue(result.defaultParams);
  }
  if (result.editableParams) {
    result.editableParams = cloneValue(result.editableParams);
  }
  return result;
}

function stripInternalParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === '_raw' || value === undefined) continue;
    result[key] = value;
  }
  return result;
}

function mergeParams(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = value;
  }
  return result;
}

interface ConvertContext {
  maps: ComponentMaps;
}

/**
 * Generate a unique ID for tree nodes
 */
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Convert nirs4all pipeline array to UI TreeNode array
 */
export function nirs4allToTreeNodes(pipeline: any[], libraryData?: ComponentLibraryJSON | null): TreeNode[] {
  if (!Array.isArray(pipeline)) {
    console.warn('Pipeline is not an array:', pipeline);
    return [];
  }

  const context: ConvertContext = { maps: buildComponentMaps(libraryData) };
  return pipeline.map(step => convertStepToNode(step, context));
}

/**
 * Convert a single pipeline step to a TreeNode
 */
function convertStepToNode(step: any, ctx: ConvertContext): TreeNode {
  // Handle null/undefined
  if (!step) {
    return createUnknownNode('null_step');
  }

  // Handle string nodes (visualization or simple references)
  if (typeof step === 'string') {
    if (VIZ_NODES.has(step)) {
      const vizMeta = ctx.maps.byId.get(step);
      if (vizMeta) {
        return createRegularNode(
          vizMeta.definition.id,
          vizMeta.definition.label ?? step,
          {},
          vizMeta
        );
      }
      return createVisualizationNode(step);
    }

    const metaById = ctx.maps.byId.get(step);
    if (metaById) {
      return createRegularNode(
        metaById.definition.id,
        metaById.definition.label ?? step,
        {},
        metaById
      );
    }

    const metaByClass = ctx.maps.byClassPath.get(step);
    if (metaByClass) {
      return createRegularNode(
        metaByClass.definition.id,
        metaByClass.definition.label ?? step,
        {},
        metaByClass,
        { classPath: step }
      );
    }

    const componentId = CLASS_TO_COMPONENT_ID[step];
    if (componentId) {
      const fallbackMeta = ctx.maps.byId.get(componentId);
      return createRegularNode(
        componentId,
        step,
        {},
        fallbackMeta,
        { classPath: step }
      );
    }

    return createUnknownNode(step);
  }

  // Handle objects
  if (typeof step === 'object') {
    // Check for generator nodes
    if (hasGeneratorKeys(step)) {
      return convertGeneratorNode(step, ctx);
    }

    // Check for workflow/container nodes
    const workflowKey = Object.keys(step).find(k => WORKFLOW_NODES.has(k));
    if (workflowKey) {
      return convertWorkflowNode(workflowKey, step[workflowKey], ctx);
    }

    // Check for model node
    if ('model' in step) {
      return convertModelNode(step, ctx);
    }

    // Check for function specification
    if ('function' in step) {
      return convertFunctionNode(step, ctx);
    }

    // Check for class specification
    if ('class' in step) {
      return convertClassNode(step, ctx);
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
function convertGeneratorNode(step: any, ctx: ConvertContext): TreeNode {
  if ('_or_' in step) {
    // OR generator
    const choices = step._or_;
    const size = step.size;
    const count = step.count;

    const children = Array.isArray(choices)
      ? choices.map(choice => convertStepToNode(choice, ctx))
      : [];

    const meta = ctx.maps.byId.get('_or_');
    return {
      id: genId(),
      label: meta?.definition.label ?? 'OR Generator',
      componentId: '_or_',
      category: meta?.category?.id ?? 'utilities',
      shortName: '_OR_',
      params: {
        size: size || null,
        count: count || null,
      },
      nodeType: 'generation',
      children,
      collapsed: false,
      meta: mergeNodeMeta(buildNodeMetaFromComponent(meta), { origin: 'imported' }),
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
      const modelNode = convertStepToNode({ model }, ctx);
      children.push(modelNode);
    }

    const meta = ctx.maps.byId.get('_range_');
    return {
      id: genId(),
      label: meta?.definition.label ?? 'Range Generator',
      componentId: '_range_',
      category: meta?.category?.id ?? 'utilities',
      shortName: '_RANGE_',
      params: {
        range: rangeArray,
        param: param,
      },
      nodeType: 'generation',
      children,
      collapsed: false,
      meta: mergeNodeMeta(buildNodeMetaFromComponent(meta), { origin: 'imported' }),
    };
  }

  return createUnknownNode('unknown_generator', step);
}

/**
 * Convert workflow/container node (feature_augmentation, etc.)
 */
function convertWorkflowNode(key: string, value: any, ctx: ConvertContext): TreeNode {
  const children: TreeNode[] = [];

  if (Array.isArray(value)) {
    children.push(...value.map(child => convertStepToNode(child, ctx)));
  } else if (typeof value === 'object' && value !== null) {
    children.push(convertStepToNode(value, ctx));
  }

  const meta = ctx.maps.byId.get(key);
  const paramsTemplate = meta ? cloneValue(meta.definition.defaultParams ?? {}) : {};
  const mergedMeta = mergeNodeMeta(buildNodeMetaFromComponent(meta), { origin: 'imported' });

  return {
    id: genId(),
    label: meta?.definition.label ?? formatLabel(key),
    componentId: key,
    category: meta?.category?.id ?? 'special',
    shortName: meta?.definition.shortName ?? key,
    params: paramsTemplate,
    nodeType: meta?.definition.nodeType ?? 'container',
    children,
    collapsed: false,
    meta: mergedMeta,
  };
}

/**
 * Convert model node
 */
function convertModelNode(step: any, ctx: ConvertContext): TreeNode {
  const modelName = step.name || 'Unnamed Model';
  const modelSpec = step.model;

  let classPath: string | undefined;
  let functionPath: string | undefined;
  let baseParams: Record<string, any> = {};

  if (typeof modelSpec === 'string') {
    classPath = modelSpec;
  } else if (typeof modelSpec === 'object' && modelSpec !== null) {
    if (typeof modelSpec.class === 'string') {
      classPath = modelSpec.class;
    }
    if (typeof modelSpec.function === 'string') {
      functionPath = modelSpec.function;
    }
    baseParams = modelSpec.params || {};
  }

  let componentMeta: ComponentMeta | undefined;
  if (classPath) {
    componentMeta = ctx.maps.byClassPath.get(classPath);
  }
  if (!componentMeta && functionPath) {
    componentMeta = ctx.maps.byFunctionPath.get(functionPath);
  }

  let componentId = componentMeta?.definition.id ?? 'unknown_model';
  if (!componentMeta && classPath) {
    componentId = CLASS_TO_COMPONENT_ID[classPath] || classPath;
  } else if (!componentMeta && functionPath) {
    componentId = functionPath;
  }

  const nodeCategory = componentMeta?.category?.id ?? 'model_training';
  const estimatorType = step.estimator_type ?? baseParams.estimator_type;

  const nodeParams: Record<string, any> = {
    ...baseParams,
    model_name: modelName,
    train_params: step.train_params || {},
    finetune_params: step.finetune_params || {},
  };

  const meta = mergeNodeMeta(
    buildNodeMetaFromComponent(componentMeta),
    {
      classPath,
      functionPath,
      defaultParams: cloneValue(baseParams),
      estimatorType,
      categoryId: nodeCategory,
      origin: 'imported',
    }
  );

  if (estimatorType !== undefined) {
    nodeParams.estimator_type = estimatorType;
  }

  return {
    id: genId(),
    label: modelName,
    componentId,
    category: nodeCategory,
    shortName: modelName,
    params: nodeParams,
    nodeType: 'regular',
    children: [],
    meta,
  };
}

/**
 * Convert class node
 */
function convertFunctionNode(step: any, ctx: ConvertContext): TreeNode {
  const functionPath = step.function;
  const params = step.params || {};
  if (typeof functionPath !== 'string') {
    return createUnknownNode('invalid_function', step);
  }

  const metaByFunction = ctx.maps.byFunctionPath.get(functionPath);
  if (metaByFunction) {
    return createRegularNode(
      metaByFunction.definition.id,
      metaByFunction.definition.label ?? functionPath,
      params,
      metaByFunction,
      { functionPath, origin: 'imported' }
    );
  }

  const fallbackId = functionPath.split('.').pop() ?? functionPath;
  return createRegularNode(
    fallbackId,
    fallbackId,
    params,
    undefined,
    { functionPath, origin: 'imported' }
  );
}

/**
 * Convert class node
 */
function convertClassNode(step: any, ctx: ConvertContext): TreeNode {
  const className = step.class;
  const params = step.params || {};
  if (typeof className !== 'string') {
    return createUnknownNode('invalid_class', step);
  }

  const metaByClass = ctx.maps.byClassPath.get(className);
  if (metaByClass) {
    return createRegularNode(
      metaByClass.definition.id,
      metaByClass.definition.label ?? className,
      params,
      metaByClass,
      { classPath: className, origin: 'imported' }
    );
  }

  const componentId = CLASS_TO_COMPONENT_ID[className] || className;

  return createRegularNode(
    componentId,
    className,
    params,
    undefined,
    { classPath: className, origin: 'imported' }
  );
}

/**
 * Create a regular node
 */
function createRegularNode(
  componentId: string,
  label: string,
  params: any,
  meta?: ComponentMeta,
  overrideMeta?: Partial<NodeMeta>
): TreeNode {
  const resolvedMeta = mergeNodeMeta(buildNodeMetaFromComponent(meta), overrideMeta);
  const categoryId = resolvedMeta?.categoryId ?? meta?.category?.id ?? getCategoryForComponent(componentId);
  const shortName = meta?.definition.shortName ?? componentId;
  const displayLabel = meta?.definition.label ?? formatLabel(label);
  return {
    id: genId(),
    label: displayLabel,
    componentId: componentId,
    category: categoryId,
    shortName,
    params: params || {},
    nodeType: 'regular',
    children: [],
    meta: resolvedMeta,
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
export function treeNodesToNirs4all(
  nodes: TreeNode[],
  libraryData?: ComponentLibraryJSON | null
): any[] {
  const context: ConvertContext = {
    maps: buildComponentMaps(libraryData),
  };
  return nodes.map(node => convertNodeToStep(node, context));
}

/**
 * Convert a single TreeNode to pipeline step
 */
function convertNodeToStep(node: TreeNode, ctx: ConvertContext): any {
  // Handle generator nodes
  if (node.componentId === '_or_') {
    const result: any = {
      _or_: node.children?.map(child => convertNodeToStep(child, ctx)) || [],
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
      const modelStep = convertNodeToStep(node.children[0], ctx);
      Object.assign(result, modelStep);
    }
    return result;
  }

  if (WORKFLOW_NODES.has(node.componentId)) {
    const children = node.children?.map(child => convertNodeToStep(child, ctx)) || [];
    return {
      [node.componentId]: children.length === 1 ? children[0] : children,
    };
  }

  const meta = ctx.maps.byId.get(node.componentId);
  const nodeMeta = node.meta;
  const definition = meta?.definition;
  const classPath = definition?.classPath ?? nodeMeta?.classPath;
  const functionPath = definition?.functionPath ?? nodeMeta?.functionPath;
  const defaultParamsSource = definition?.defaultParams ?? nodeMeta?.defaultParams ?? {};
  const defaultParams = cloneValue(defaultParamsSource);
  const categoryId = meta?.category?.id ?? nodeMeta?.categoryId ?? node.category ?? '';
  const rawParams = stripInternalParams(node.params);
  let remainingParams = rawParams;

  if (VIZ_NODES.has(node.componentId)) {
    if (Object.keys(rawParams).length > 0) {
      return {
        id: node.componentId,
        params: rawParams,
      };
    }
    return node.componentId;
  }

  const isModelNode =
    categoryId === 'models_sklearn' ||
    categoryId === 'models_deep' ||
    node.category === 'model_training' ||
    (nodeMeta?.categoryId !== undefined && nodeMeta.categoryId.startsWith('models')) ||
    nodeMeta?.estimatorType !== undefined ||
    !!rawParams.model_name;

  if (isModelNode) {
    const {
      model_name,
      train_params,
      finetune_params,
      estimator_type: estimatorTypeOverride,
      ...modelParamOverrides
    } = rawParams;

    remainingParams = modelParamOverrides;

    const defaultsCopy = cloneValue(defaultParams);
    let estimatorType = estimatorTypeOverride;
    if (estimatorType === undefined && defaultsCopy && typeof defaultsCopy === 'object') {
      estimatorType = (defaultsCopy as Record<string, any>).estimator_type ?? nodeMeta?.estimatorType;
      if (estimatorType !== undefined) {
        delete (defaultsCopy as Record<string, any>).estimator_type;
      }
    } else if (estimatorType === undefined && nodeMeta?.estimatorType !== undefined) {
      estimatorType = nodeMeta.estimatorType;
    }

    const mergedModelParams = mergeParams(
      (defaultsCopy as Record<string, any>) ?? {},
      modelParamOverrides
    );

    const result: any = {
      name: model_name || node.label,
      model: {},
    };

    if (classPath) {
      result.model.class = classPath;
    } else if (functionPath) {
      result.model.function = functionPath;
    } else {
      result.model.class = COMPONENT_ID_TO_CLASS[node.componentId] || node.componentId;
    }

    if (Object.keys(mergedModelParams).length > 0) {
      result.model.params = mergedModelParams;
    }

    if (train_params && Object.keys(train_params).length > 0) {
      result.train_params = train_params;
    }
    if (finetune_params && Object.keys(finetune_params).length > 0) {
      result.finetune_params = finetune_params;
    }
    if (estimatorType !== undefined) {
      result.estimator_type = estimatorType;
    }

    return result;
  }

  if (classPath || functionPath) {
    const mergedParams = mergeParams(defaultParams, remainingParams);
    const step: any = classPath
      ? { class: classPath }
      : { function: functionPath };
    if (Object.keys(mergedParams).length > 0) {
      step.params = mergedParams;
    }
    return step;
  }

  const fallbackClass = COMPONENT_ID_TO_CLASS[node.componentId];
  if (fallbackClass) {
    const mergedParams = mergeParams({}, remainingParams);
    const step: any = { class: fallbackClass };
    if (Object.keys(mergedParams).length > 0) {
      step.params = mergedParams;
    }
    return step;
  }

  if (node.params?._raw) {
    return node.params._raw;
  }

  if (Object.keys(remainingParams).length > 0) {
    return {
      id: node.componentId,
      params: remainingParams,
    };
  }

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
export function loadNirs4allPipeline(data: string | any, libraryData?: ComponentLibraryJSON | null): TreeNode[] {
  try {
    const pipeline = typeof data === 'string' ? JSON.parse(data) : data;

    // Handle different top-level structures
    if (Array.isArray(pipeline)) {
      return nirs4allToTreeNodes(pipeline, libraryData);
    }

    if (pipeline.pipeline) {
      return nirs4allToTreeNodes(pipeline.pipeline, libraryData);
    }

    if (pipeline.steps) {
      return nirs4allToTreeNodes(pipeline.steps, libraryData);
    }

    if (pipeline.nodes) {
      return nirs4allToTreeNodes(pipeline.nodes, libraryData);
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
interface ExportOptions {
  libraryData?: ComponentLibraryJSON | null;
  name?: string;
  description?: string;
  createdAt?: string;
}

export function exportNirs4allPipeline(
  nodes: TreeNode[],
  options: ExportOptions = {}
): string {
  const steps = treeNodesToNirs4all(nodes, options.libraryData);
  const document = {
    name: options.name ?? "pipeline",
    description: options.description ?? "",
    created_at: options.createdAt ?? new Date().toISOString(),
    steps,
  };
  return JSON.stringify(document, null, 2);
}


