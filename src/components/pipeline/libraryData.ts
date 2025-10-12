import type { LibraryGroup, LibraryItem } from './ComponentLibrary';

// Component library grouped and sub-grouped (foldable)
export const LIBRARY_GROUPS: LibraryGroup[] = [
  {
    id: 'preprocessing',
    label: 'Preprocessing',
    className: 'bg-blue-50 border-blue-200',
    subgroups: [
      {
        id: 'scalers',
        label: 'Scalers',
        items: [
          { id: 'minmax_scaler', label: 'MinMax Scaler', shortName: 'MinMax' },
          { id: 'standard_scaler', label: 'Standard Scaler', shortName: 'StdScaler' },
          { id: 'robust_scaler', label: 'Robust Scaler', shortName: 'RobustScaler' },
        ],
      },
      {
        id: 'filters',
        label: 'Filters',
        items: [
          { id: 'bandpass_filter', label: 'Bandpass Filter', shortName: 'Bandpass' },
          { id: 'lowpass_filter', label: 'Lowpass Filter', shortName: 'Lowpass' },
          { id: 'highpass_filter', label: 'Highpass Filter', shortName: 'Highpass' },
        ],
      },
      {
        id: 'baseline',
        label: 'Baseline',
        items: [
          { id: 'detrend', label: 'Detrend', shortName: 'Detrend' },
          { id: 'polynomial_baseline', label: 'Polynomial Baseline', shortName: 'PolyBaseline' },
        ],
      },
    ],
  },
  {
    id: 'feature_extraction',
    label: 'Feature Extraction',
    className: 'bg-green-50 border-green-200',
    subgroups: [
      {
        id: 'statistical',
        label: 'Statistical Features',
        items: [
          { id: 'mean_feature', label: 'Mean', shortName: 'Mean' },
          { id: 'std_feature', label: 'Standard Deviation', shortName: 'StdDev' },
          { id: 'variance_feature', label: 'Variance', shortName: 'Var' },
        ],
      },
      {
        id: 'frequency',
        label: 'Frequency Domain',
        items: [
          { id: 'fft_features', label: 'FFT Features', shortName: 'FFT' },
          { id: 'wavelet_features', label: 'Wavelet Features', shortName: 'Wavelet' },
        ],
      },
    ],
  },
  {
    id: 'model_training',
    label: 'Model Training',
    className: 'bg-purple-50 border-purple-200',
    subgroups: [
      {
        id: 'classical',
        label: 'Classical ML',
        items: [
          { id: 'svm', label: 'SVM', shortName: 'SVM' },
          { id: 'random_forest', label: 'Random Forest', shortName: 'RF' },
          { id: 'logistic_regression', label: 'Logistic Regression', shortName: 'LogReg' },
        ],
      },
      {
        id: 'neural',
        label: 'Neural Networks',
        items: [
          { id: 'cnn', label: 'CNN', shortName: 'CNN' },
          { id: 'lstm', label: 'LSTM', shortName: 'LSTM' },
          { id: 'mlp', label: 'MLP', shortName: 'MLP' },
        ],
      },
    ],
  },
  {
    id: 'prediction',
    label: 'Prediction',
    className: 'bg-red-50 border-red-200',
    subgroups: [
      {
        id: 'prediction_ops',
        label: 'Prediction',
        items: [
          { id: 'batch_prediction', label: 'Batch Prediction', shortName: 'BatchPredict' },
          { id: 'real_time_prediction', label: 'Real-time Prediction', shortName: 'RealTimePredict' },
          { id: 'probability_calibration', label: 'Probability Calibration', shortName: 'CalibProb' },
        ],
      },
    ],
  },
  {
    id: 'special',
    label: 'Special Nodes',
    className: 'bg-yellow-50 border-yellow-200',
    subgroups: [
      {
        id: 'containers',
        label: 'Containers',
        items: [
          { id: 'feature_augmentation', label: 'Feature Augmentation', shortName: 'FeatureAug' },
          { id: 'augmentation_sample', label: 'Sample Augmentation', shortName: 'SampleAug' },
          { id: 'sequential', label: 'Sequential', shortName: 'Sequential' },
          { id: 'pipeline', label: 'Pipeline', shortName: 'Pipeline' },
        ],
      },
      {
        id: 'generators',
        label: 'Generators',
        items: [
          { id: '_or_', label: 'OR Generator', shortName: '_OR_' },
          { id: '_range_', label: 'Range Generator', shortName: '_RANGE_' },
        ],
      },
    ],
  },
];

// Special nodes that support children or have special behavior
export const SPECIAL_NODES: LibraryItem[] = [
  { id: 'feature_augmentation', label: 'Feature Augmentation', shortName: 'FeatureAug' },
  { id: 'augmentation_sample', label: 'Sample Augmentation', shortName: 'SampleAug' },
  { id: 'sequential', label: 'Sequential', shortName: 'Sequential' },
  { id: 'pipeline', label: 'Pipeline', shortName: 'Pipeline' },
  { id: '_or_', label: 'OR Generator', shortName: '_OR_' },
  { id: '_range_', label: 'Range Generator', shortName: '_RANGE_' },
];

// Helper to find library item by ID
export const findLibraryItemById = (id: string): (LibraryItem & { category: string }) | null => {
  // Check special nodes first
  const specialNode = SPECIAL_NODES.find((node) => node.id === id);
  if (specialNode) {
    return { ...specialNode, category: 'special' };
  }

  // Check regular library groups
  for (const g of LIBRARY_GROUPS) {
    for (const sg of g.subgroups) {
      const found = sg.items.find((it) => it.id === id);
      if (found) {
        return { ...found, category: g.id };
      }
    }
  }
  return null;
};

// Check if a node type supports children
export const supportsChildren = (componentId: string): boolean => {
  return ['feature_augmentation', 'augmentation_sample', 'sequential', 'pipeline', '_or_', '_range_'].includes(componentId);
};

// Check if a node is a generator
export const isGeneratorNode = (componentId: string): boolean => {
  return componentId.startsWith('_') && componentId.endsWith('_');
};
