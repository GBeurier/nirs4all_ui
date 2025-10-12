# nirs4all Pipeline Format Integration - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NIRS4ALL ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐                           ┌─────────────────┐  │
│  │  Python Library │                           │   UI Frontend   │  │
│  │   (nirs4all)    │                           │    (React)      │  │
│  └────────┬────────┘                           └────────┬────────┘  │
│           │                                              │           │
│           │ Serialization                   Visual Tree │           │
│           │    (.json)                      Representation           │
│           ▼                                              ▼           │
│  ┌─────────────────┐                           ┌─────────────────┐  │
│  │ Pipeline Format │◄─────── Converter ───────►│   TreeNodes     │  │
│  │                 │                           │                 │  │
│  │ [                │                           │ nodes: [        │  │
│  │   {class: ...}  │                           │   {id, label,   │  │
│  │   {model: ...}  │                           │    componentId, │  │
│  │   {_or_: ...}   │                           │    params,      │  │
│  │ ]               │                           │    children}]   │  │
│  └────────┬────────┘                           └────────┬────────┘  │
│           │                                              │           │
│           │                                              │           │
│           │          ┌────────────────┐                 │           │
│           └─────────►│ Backend API    │◄────────────────┘           │
│                      │ (FastAPI)      │                             │
│                      └────────────────┘                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                         UI Pipeline Editor                            │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Component Lib   │  │  Pipeline Canvas │  │  Config Panel    │   │
│  │  (component-     │  │  (TreeView)      │  │  (Parameters)    │   │
│  │   library.json)  │  │                  │  │                  │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘   │
│           │                     │                      │              │
│           │                     │                      │              │
│           └──────────┬──────────┴──────────┬───────────┘              │
│                      │                     │                          │
│                      ▼                     ▼                          │
│         ┌────────────────────────────────────────────┐               │
│         │         nirs4allConverter.ts               │               │
│         │  ┌──────────────────────────────────────┐  │               │
│         │  │  loadNirs4allPipeline()              │  │               │
│         │  │  - Parse JSON/object                 │  │               │
│         │  │  - Map classes → component IDs       │  │               │
│         │  │  - Handle generators, models         │  │               │
│         │  │  - Create TreeNode hierarchy         │  │               │
│         │  └──────────────────────────────────────┘  │               │
│         │  ┌──────────────────────────────────────┐  │               │
│         │  │  exportNirs4allPipeline()            │  │               │
│         │  │  - Convert TreeNodes → steps         │  │               │
│         │  │  - Map component IDs → classes       │  │               │
│         │  │  - Reconstruct models, containers    │  │               │
│         │  │  - Format as JSON                    │  │               │
│         │  └──────────────────────────────────────┘  │               │
│         └────────────────────────────────────────────┘               │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Loading Pipeline (JSON → UI)

```
┌─────────────┐
│ JSON File   │
│  or API     │
└──────┬──────┘
       │
       │ 1. Read JSON
       ▼
┌─────────────────────────────────┐
│ loadNirs4allPipeline(data)      │
│                                  │
│ Step 1: Parse structure          │
│   ├─ Array?                      │
│   ├─ Object with .pipeline?      │
│   └─ Object with .steps?         │
│                                  │
│ Step 2: Convert each element     │
│   ├─ Class node?                 │
│   ├─ Model node?                 │
│   ├─ Generator node?             │
│   ├─ Container node?             │
│   └─ Viz node?                   │
│                                  │
│ Step 3: Map class → componentId  │
│   "sklearn...MinMaxScaler"       │
│   └─> "minmax_scaler"            │
│                                  │
│ Step 4: Build TreeNode structure │
│   {                              │
│     id: "abc123",                │
│     label: "MinMax Scaler",      │
│     componentId: "minmax_scaler",│
│     params: {...},               │
│     children: [...]              │
│   }                              │
└──────────┬───────────────────────┘
           │
           │ 2. TreeNode[]
           ▼
┌─────────────────────────────────┐
│ React State: setNodes(nodes)    │
└──────────┬───────────────────────┘
           │
           │ 3. Render
           ▼
┌─────────────────────────────────┐
│ Visual Pipeline Editor          │
│  🔧 MinMax Scaler               │
│  📦 Y Processing                │
│    └─ MinMax Scaler             │
│  📦 Feature Augmentation        │
│    ├─ Detrend                   │
│    └─ First Derivative          │
│  🤖 PLS-5 (n_components: 5)     │
└─────────────────────────────────┘
```

### Saving Pipeline (UI → JSON)

```
┌─────────────────────────────────┐
│ Visual Pipeline Editor          │
│  [User edits components]        │
└──────────┬───────────────────────┘
           │
           │ 1. TreeNode[]
           ▼
┌─────────────────────────────────┐
│ exportNirs4allPipeline(nodes)   │
│                                  │
│ Step 1: Iterate TreeNodes        │
│                                  │
│ Step 2: Convert each node        │
│   ├─ Generator? → {_or_: ...}   │
│   ├─ Model? → {name, model}     │
│   ├─ Container? → {key: [...]}  │
│   └─ Regular? → {class, params} │
│                                  │
│ Step 3: Map componentId → class  │
│   "minmax_scaler"                │
│   └─> "sklearn...MinMaxScaler"  │
│                                  │
│ Step 4: Format as JSON           │
│   [                              │
│     {"class": "sklearn..."},     │
│     {"model": {...}},            │
│     ...                          │
│   ]                              │
└──────────┬───────────────────────┘
           │
           │ 2. JSON string
           ▼
┌─────────────────────────────────┐
│ Download / Save / API Send      │
└─────────────────────────────────┘
```

## Class Mapping System

```
┌───────────────────────────────────────────────────────────┐
│              CLASS_TO_COMPONENT_ID (Load)                 │
├───────────────────────────────────────────────────────────┤
│  Python Class Path                    UI Component ID     │
│  ─────────────────────────────────    ─────────────────   │
│  sklearn.preprocessing...MinMaxScaler → minmax_scaler     │
│  nirs4all.operators...Detrend         → detrend           │
│  sklearn.cross_decomp...PLSRegression → pls_regression    │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│              COMPONENT_ID_TO_CLASS (Save)                 │
├───────────────────────────────────────────────────────────┤
│  UI Component ID                      Python Class Path   │
│  ─────────────────                    ──────────────────  │
│  minmax_scaler         → sklearn.preprocessing...MinMax   │
│  detrend               → nirs4all.operators...Detrend     │
│  pls_regression        → sklearn.cross_decomp...PLSReg    │
└───────────────────────────────────────────────────────────┘
```

## Node Type Handling

```
┌────────────────────────────────────────────────────────────┐
│                      Node Types                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. REGULAR (transformations, scalers)                     │
│     JSON: {"class": "...", "params": {...}}                │
│     Tree: {componentId, params, nodeType: "regular"}       │
│                                                            │
│  2. MODEL (ML models with training config)                 │
│     JSON: {"name": "...", "model": {...}}                  │
│     Tree: {componentId, params: {model_name, ...}}         │
│                                                            │
│  3. CONTAINER (workflow nodes with children)               │
│     JSON: {"feature_augmentation": [...]}                  │
│     Tree: {componentId, children: [...]}                   │
│                                                            │
│  4. GENERATION (generators for combinations)               │
│     JSON: {"_or_": [...], "size": 2}                       │
│     Tree: {componentId: "_or_", children: [...]}           │
│                                                            │
│  5. VISUALIZATION (charts, plots)                          │
│     JSON: "chart_2d"                                       │
│     Tree: {componentId: "chart_2d"}                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Generator Expansion

```
┌─────────────────────────────────────────────────────────────┐
│                    Generator Nodes                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IN UI:                                                     │
│  ⚙️ OR Generator                                            │
│     └─ Detrend                                              │
│     └─ FirstDerivative                                      │
│     └─ Gaussian                                             │
│     size: 2                                                 │
│                                                             │
│  IN JSON:                                                   │
│  {                                                          │
│    "_or_": ["Detrend", "FirstDerivative", "Gaussian"],      │
│    "size": 2                                                │
│  }                                                          │
│                                                             │
│  AT RUNTIME (Backend):                                      │
│  Pipeline 1: [Detrend, FirstDerivative]                     │
│  Pipeline 2: [Detrend, Gaussian]                            │
│  Pipeline 3: [FirstDerivative, Gaussian]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Range Generator                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IN UI:                                                     │
│  ⚙️ Range Generator                                         │
│     └─ PLS Regression                                       │
│     range: [1, 10, 2]                                       │
│     param: n_components                                     │
│                                                             │
│  IN JSON:                                                   │
│  {                                                          │
│    "_range_": [1, 10, 2],                                   │
│    "param": "n_components",                                 │
│    "model": {"class": "PLSRegression"}                      │
│  }                                                          │
│                                                             │
│  AT RUNTIME (Backend):                                      │
│  Model 1: PLSRegression(n_components=1)                     │
│  Model 2: PLSRegression(n_components=3)                     │
│  Model 3: PLSRegression(n_components=5)                     │
│  Model 4: PLSRegression(n_components=7)                     │
│  Model 5: PLSRegression(n_components=9)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
nirs4all_ui/
├── src/
│   ├── utils/
│   │   ├── nirs4allConverter.ts ───────► Main converter logic
│   │   └── nirs4allConverter.test.ts ──► Test utilities
│   ├── pages/
│   │   └── PipelinePage.tsx ───────────► Uses converter
│   └── components/
│       └── pipeline/
│           └── *.tsx ───────────────────► UI components
├── public/
│   └── component-library.json ─────────► Component definitions
├── NIRS4ALL_FORMAT.md ─────────────────► Full format docs
├── NIRS4ALL_INTEGRATION_SUMMARY.md ────► Implementation summary
├── QUICK_START_NIRS4ALL.md ────────────► Quick start guide
└── demo-converter.ts ──────────────────► Demo script
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Points                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Load Modal                                              │
│     User uploads JSON → loadNirs4allPipeline() → setNodes() │
│                                                             │
│  2. Session Storage                                         │
│     Prediction page → stores JSON → loads in PipelinePage   │
│                                                             │
│  3. URL Parameters                                          │
│     ?prediction_id=X → fetch pipeline → load → display      │
│                                                             │
│  4. Export Button                                           │
│     Click → exportNirs4allPipeline() → download JSON        │
│                                                             │
│  5. Save Button                                             │
│     Click → file dialog → exportNirs4allPipeline() → save   │
│                                                             │
│  6. Run Button                                              │
│     Click → treeNodesToNirs4all() → API request → execute   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Future Enhancements

```
┌─────────────────────────────────────────────────────────────┐
│                   Possible Enhancements                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✨ Generator Preview                                       │
│     Show sample expanded pipelines before running           │
│                                                             │
│  ✅ Pipeline Validation                                     │
│     Check for errors before save/run                        │
│                                                             │
│  📚 Template Library                                        │
│     Pre-built pipeline templates for common tasks           │
│                                                             │
│  🐍 Python Code Import                                      │
│     Parse Python files directly                             │
│                                                             │
│  🔍 Component Search                                        │
│     Search/filter components by name or type                │
│                                                             │
│  📊 Generation Statistics                                   │
│     Show how many configs will be generated                 │
│                                                             │
│  🎨 Visual Generator Builder                                │
│     Drag-and-drop interface for generator config            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
