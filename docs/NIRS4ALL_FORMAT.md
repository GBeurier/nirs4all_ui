# NIRS4ALL Pipeline Format Support

## Overview

The nirs4all UI pipeline editor now fully supports the nirs4all Python library's pipeline format. You can:
- **Load** pipelines created in nirs4all Python code
- **Edit** them visually in the UI
- **Save** them back in nirs4all-compatible JSON format
- **Run** them through the backend

## Format Specification

### Basic Components

#### 1. Simple Class Reference
```json
{
  "class": "sklearn.preprocessing._data.MinMaxScaler"
}
```

#### 2. Class with Parameters
```json
{
  "class": "sklearn.preprocessing._data.MinMaxScaler",
  "params": {
    "feature_range": [0, 1]
  }
}
```

#### 3. Short Class Names (also supported)
```json
"MinMaxScaler"
```

### Model Nodes

Models are defined with a special structure:
```json
{
  "name": "PLS-1_components",
  "model": {
    "class": "sklearn.cross_decomposition._pls.PLSRegression",
    "params": {
      "n_components": 1
    }
  },
  "train_params": {},
  "finetune_params": {}
}
```

### Workflow/Container Nodes

#### Y Processing
Apply transformations to target variables:
```json
{
  "y_processing": {
    "class": "sklearn.preprocessing._data.MinMaxScaler"
  }
}
```

#### Feature Augmentation
Generate additional features (expands feature space):
```json
{
  "feature_augmentation": [
    "nirs4all.operators.transforms.signal.Detrend",
    "nirs4all.operators.transforms.nirs.FirstDerivative"
  ]
}
```

### Visualization Nodes

Simple string references:
```json
"chart_2d"
```

### Cross-Validation Splitters

```json
{
  "class": "sklearn.model_selection._split.ShuffleSplit",
  "params": {
    "n_splits": 3,
    "test_size": 0.25
  }
}
```

## Generator Nodes

Generator nodes create multiple pipeline configurations from a single definition.

### OR Generator (`_or_`)

Generates combinations of choices:

#### Simple OR (one of many)
```json
{
  "_or_": [
    "nirs4all.operators.transforms.signal.Detrend",
    "nirs4all.operators.transforms.nirs.FirstDerivative",
    "nirs4all.operators.transforms.nirs.Gaussian"
  ]
}
```
Generates 3 pipelines, each with one transformation.

#### OR with Size (combinations)
```json
{
  "_or_": [
    "Detrend",
    "FirstDerivative",
    "Gaussian",
    "SavitzkyGolay",
    "Haar"
  ],
  "size": 2
}
```
Generates pipelines with all combinations of 2 transformations from the 5 choices.

#### OR with Size Range
```json
{
  "_or_": [...],
  "size": [2, 3]
}
```
Generates combinations of size 2 AND size 3.

#### OR with Nested Size (advanced)
```json
{
  "_or_": [...],
  "size": [[2, 3], [1, 2]]
}
```
- First element [2, 3]: outer combinations (2 to 3 groups)
- Second element [1, 2]: inner size (each group has 1 to 2 elements)

Example result: `[[Detrend, FirstDerivative], [Gaussian]]`

#### OR with Count Limit
```json
{
  "_or_": [...],
  "size": 2,
  "count": 5
}
```
Limits to maximum 5 generated configurations.

### Range Generator (`_range_`)

Generates parameter sweeps for models:

#### Basic Range
```json
{
  "_range_": [1, 12, 2],
  "param": "n_components",
  "model": {
    "class": "sklearn.cross_decomposition._pls.PLSRegression"
  }
}
```
Generates models with n_components = 1, 3, 5, 7, 9, 11.

The range format is: `[start, end, step]`
- `start`: first value (inclusive)
- `end`: last value (inclusive)
- `step`: increment

#### Range with Dict Format
```json
{
  "_range_": {
    "from": 1,
    "to": 12,
    "step": 2
  },
  "param": "n_components",
  "model": {
    "class": "sklearn.cross_decomposition._pls.PLSRegression"
  }
}
```

## Complete Example

Here's a complete pipeline from the Q1 regression example:

```json
[
  {
    "class": "sklearn.preprocessing._data.MinMaxScaler"
  },
  {
    "y_processing": {
      "class": "sklearn.preprocessing._data.MinMaxScaler"
    }
  },
  {
    "feature_augmentation": {
      "_or_": [
        "nirs4all.operators.transforms.signal.Detrend",
        "nirs4all.operators.transforms.nirs.FirstDerivative",
        "nirs4all.operators.transforms.nirs.Gaussian",
        "nirs4all.operators.transforms.nirs.SavitzkyGolay",
        "nirs4all.operators.transforms.nirs.Haar"
      ],
      "size": 2
    }
  },
  "chart_2d",
  {
    "class": "sklearn.model_selection._split.ShuffleSplit",
    "params": {
      "n_splits": 3,
      "test_size": 0.25
    }
  },
  {
    "name": "PLS-1_components",
    "model": {
      "class": "sklearn.cross_decomposition._pls.PLSRegression",
      "params": {
        "n_components": 1
      }
    }
  },
  {
    "name": "PLS-13_components",
    "model": {
      "class": "sklearn.cross_decomposition._pls.PLSRegression",
      "params": {
        "n_components": 13
      }
    }
  }
]
```

## Supported NIRS Transformations

The following nirs4all transformations are available in the UI:

- `Detrend` - Remove linear trend
- `FirstDerivative` - First derivative
- `SecondDerivative` - Second derivative
- `Gaussian` - Gaussian smoothing
- `StandardNormalVariate` (SNV) - Standardize spectra
- `SavitzkyGolay` - Savitzky-Golay filter
- `Haar` - Haar wavelet
- `MultiplicativeScatterCorrection` (MSC) - Scatter correction

## Loading Pipelines in the UI

### From File
1. Click the "Load" button in the pipeline toolbar
2. Select a JSON file in nirs4all format
3. The pipeline will be converted to the visual tree representation

### Programmatically
```typescript
import { loadNirs4allPipeline } from './utils/nirs4allConverter';

const pipelineJson = '[ ... ]'; // or JSON object
const treeNodes = loadNirs4allPipeline(pipelineJson);
setNodes(treeNodes);
```

## Saving Pipelines

### Export (Quick Download)
Click the "Export" button to download the current pipeline as a JSON file in nirs4all format.

### Save (With File Dialog)
Click the "Save" button to choose a location and filename.

### Programmatically
```typescript
import { exportNirs4allPipeline } from './utils/nirs4allConverter';

const pipelineJson = exportNirs4allPipeline(nodes);
// Save or send pipelineJson
```

## Notes on Generation

When a pipeline contains generator nodes (`_or_` or `_range_`), the nirs4all backend will expand them at runtime into multiple pipeline configurations. The UI shows them as special "generation" nodes that can contain children (for `_or_`) or be linked to models (for `_range_`).

The actual number of generated configurations depends on:
- Number of choices in `_or_`
- Size parameter (combinations)
- Range specification
- Count limits (if specified)

## Compatibility

The converter handles:
- ✅ Full class paths (e.g., `sklearn.preprocessing._data.MinMaxScaler`)
- ✅ Short class names (e.g., `MinMaxScaler`)
- ✅ Nested structures (containers with children)
- ✅ Generator nodes (`_or_`, `_range_`)
- ✅ Model definitions with parameters
- ✅ Workflow nodes (feature_augmentation, y_processing)
- ✅ Visualization nodes (chart_2d, etc.)
- ✅ Cross-validation splitters

## Troubleshooting

### Unknown Components
If a component is not recognized, it will be created as an "Unknown" node with the raw data preserved in the `_raw` parameter. You can still edit and save it.

### Missing Transformations
If you need a transformation that's not in the library, you can:
1. Add it to `public/component-library.json`
2. Add the mapping in `src/utils/nirs4allConverter.ts` in the `CLASS_TO_COMPONENT_ID` object

### Generator Nodes Not Expanding
Generator nodes are only expanded by the nirs4all backend at runtime. In the UI, they are represented as special nodes that show their configuration but don't actually generate multiple nodes until execution.
