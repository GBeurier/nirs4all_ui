# Quick Start: Using nirs4all Pipeline Format in the UI

## What's New

The pipeline editor now **fully supports nirs4all Python pipeline format**! You can seamlessly move pipelines between Python code and the visual UI.

## Quick Examples

### Load an Existing Pipeline

```typescript
// In your component
import { loadNirs4allPipeline } from './utils/nirs4allConverter';

// From file or API
const pipelineData = await fetch('path/to/pipeline.json').then(r => r.json());
const nodes = loadNirs4allPipeline(pipelineData);
setNodes(nodes);
```

### Save Pipeline

```typescript
import { exportNirs4allPipeline } from './utils/nirs4allConverter';

// Convert current UI state to nirs4all format
const pipelineJson = exportNirs4allPipeline(nodes);

// Download or save
const blob = new Blob([pipelineJson], { type: 'application/json' });
// ... create download link
```

## Common Pipeline Patterns

### 1. Basic Preprocessing Chain

```json
[
  {
    "class": "sklearn.preprocessing._data.MinMaxScaler"
  },
  {
    "class": "nirs4all.operators.transforms.signal.Detrend"
  }
]
```

**UI Display**:
- MinMax Scaler
- Detrend

### 2. Feature Augmentation (Parallel Processing)

```json
{
  "feature_augmentation": [
    "nirs4all.operators.transforms.signal.Detrend",
    "nirs4all.operators.transforms.nirs.FirstDerivative"
  ]
}
```

**UI Display**:
- 📦 Feature Augmentation
  - └─ Detrend
  - └─ First Derivative

### 3. Y Processing (Target Scaling)

```json
{
  "y_processing": {
    "class": "sklearn.preprocessing._data.MinMaxScaler"
  }
}
```

**UI Display**:
- 📦 Y Processing
  - └─ MinMax Scaler

### 4. Model with Parameters

```json
{
  "name": "PLS-5-components",
  "model": {
    "class": "sklearn.cross_decomposition._pls.PLSRegression",
    "params": {
      "n_components": 5
    }
  }
}
```

**UI Display**:
- 🤖 PLS-5-components
  - n_components: 5

### 5. OR Generator (Try Multiple Options)

```json
{
  "_or_": [
    "nirs4all.operators.transforms.signal.Detrend",
    "nirs4all.operators.transforms.nirs.FirstDerivative",
    "nirs4all.operators.transforms.nirs.Gaussian"
  ],
  "size": 2
}
```

**UI Display**:
- ⚙️ OR Generator (size: 2)
  - └─ Detrend
  - └─ First Derivative
  - └─ Gaussian

**At Runtime**: Generates 3 pipelines with all combinations of 2 transforms

### 6. Range Generator (Parameter Sweep)

```json
{
  "_range_": [1, 10, 2],
  "param": "n_components",
  "model": {
    "class": "sklearn.cross_decomposition._pls.PLSRegression"
  }
}
```

**UI Display**:
- ⚙️ Range Generator
  - range: [1, 10, 2]
  - param: n_components
  - └─ PLS Regression

**At Runtime**: Generates 5 models with n_components = 1, 3, 5, 7, 9

## Class Name Mapping

The converter automatically maps between Python classes and UI components:

| Python Class | UI Component |
|-------------|--------------|
| `sklearn.preprocessing._data.MinMaxScaler` | `minmax_scaler` |
| `nirs4all.operators.transforms.signal.Detrend` | `detrend` |
| `nirs4all.operators.transforms.nirs.FirstDerivative` | `first_derivative` |
| `sklearn.cross_decomposition._pls.PLSRegression` | `pls_regression` |
| ... and more (see converter.ts) |

Short names also work:
- `MinMaxScaler` → `minmax_scaler`
- `Detrend` → `detrend`

## Workflow in UI

### Loading
1. Click **"Load"** button
2. Select JSON file with nirs4all pipeline
3. Pipeline appears in visual editor
4. Edit visually (drag/drop, parameter editing)

### Saving
1. Build/edit pipeline visually
2. Click **"Save"** or **"Export"**
3. Downloads JSON in nirs4all format
4. Use in Python or backend API

### Running
1. Build pipeline
2. Select dataset(s)
3. Click **"Run"**
4. UI converts to nirs4all format
5. Backend executes and returns results

## Testing Your Pipeline

### In Browser Console
```javascript
// Copy pipeline JSON
const pipeline = [ /* your pipeline */ ];

// Test conversion
const nodes = loadNirs4allPipeline(pipeline);
console.log('Loaded nodes:', nodes);

// Test export
const exported = exportNirs4allPipeline(nodes);
console.log('Exported:', JSON.parse(exported));
```

### With Demo Script
```bash
cd nirs4all_ui
# Edit demo-converter.ts with your pipeline
node demo-converter.ts
```

## Supported Components

### Scalers
- MinMaxScaler
- StandardScaler
- RobustScaler

### NIRS Transformations
- Detrend
- FirstDerivative
- SecondDerivative
- Gaussian
- SNV (Standard Normal Variate)
- SavitzkyGolay
- Haar (wavelet)
- MSC (Multiplicative Scatter Correction)

### Models
- PLSRegression
- RandomForest
- SVM
- LogisticRegression

### Cross-Validation
- ShuffleSplit
- KFold

### Workflow Nodes
- feature_augmentation
- y_processing
- sample_augmentation

### Generators
- _or_ (combinations)
- _range_ (parameter sweep)

### Visualization
- chart_2d
- fold_chart

## Tips & Tricks

### Tip 1: Unknown Components
If a component isn't recognized, it's saved as "Unknown" with the original data in `_raw` param. You can still use it!

### Tip 2: Adding New Components
1. Add to `component-library.json`:
```json
{
  "id": "my_new_transform",
  "label": "My Transform",
  ...
}
```

2. Add mapping in `nirs4allConverter.ts`:
```typescript
const CLASS_TO_COMPONENT_ID = {
  'my.module.MyTransform': 'my_new_transform',
  ...
};
```

### Tip 3: Complex Generators
For nested generators, build them step by step:
1. Create OR generator node
2. Add children one by one
3. Set size/count parameters
4. Export and verify JSON structure

### Tip 4: Debugging
Enable console logging in converter:
```typescript
// In nirs4allConverter.ts, add:
console.log('Converting:', step);
```

## Common Issues

### Issue: Component not found
**Solution**: Check spelling of class name, add mapping if needed

### Issue: Parameters lost
**Solution**: Make sure parameters are in `params` object in JSON

### Issue: Generator not working
**Solution**: Generators expand at runtime, not in UI. Check backend logs.

### Issue: Model name missing
**Solution**: Model definitions need `name` field in JSON

## Examples from nirs4all Repo

Load these pipelines directly:

```bash
# Q1 - Basic regression
d:/tmp/nirs4all_wk/results/regression/Q1_*/pipeline.json

# With generators
{
  "_or_": ["Detrend", "FirstDerivative", "Gaussian", "SavitzkyGolay", "Haar"],
  "size": 2
}
```

## Need Help?

- 📖 Full documentation: `NIRS4ALL_FORMAT.md`
- 🔍 Implementation details: `NIRS4ALL_INTEGRATION_SUMMARY.md`
- 🧪 Test utilities: `nirs4allConverter.test.ts`
- 💻 Source code: `src/utils/nirs4allConverter.ts`

## What's Next?

Possible enhancements:
- [ ] Generator preview (show sample expansions)
- [ ] Pipeline validation
- [ ] Template library
- [ ] Direct Python code import
- [ ] More component mappings

---

**Happy Pipeline Building! 🚀**
