// Quick test script to demonstrate pipeline conversion
// Run this in browser console or Node.js (with TypeScript support)

import { loadNirs4allPipeline, exportNirs4allPipeline } from './src/utils/nirs4allConverter';

// Example pipeline from d:\tmp\nirs4all_wk\results\regression\Q1_457156\pipeline.json
const examplePipeline = [
  {
    "class": "sklearn.preprocessing._data.MinMaxScaler"
  },
  {
    "y_processing": {
      "class": "sklearn.preprocessing._data.MinMaxScaler"
    }
  },
  {
    "feature_augmentation": [
      "nirs4all.operators.transforms.signal.Detrend",
      "nirs4all.operators.transforms.nirs.FirstDerivative"
    ]
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
  },
  {
    "name": "PLS-25_components",
    "model": {
      "class": "sklearn.cross_decomposition._pls.PLSRegression",
      "params": {
        "n_components": 25
      }
    }
  }
];

console.log('=== NIRS4ALL Pipeline Conversion Demo ===\n');

console.log('1. Loading pipeline from nirs4all format...');
const treeNodes = loadNirs4allPipeline(examplePipeline);
console.log(`   Created ${treeNodes.length} tree nodes\n`);

console.log('2. Tree structure:');
treeNodes.forEach((node, i) => {
  console.log(`   [${i}] ${node.label}`);
  console.log(`       Component ID: ${node.componentId}`);
  console.log(`       Category: ${node.category}`);
  console.log(`       Type: ${node.nodeType}`);
  if (node.params && Object.keys(node.params).length > 0) {
    console.log(`       Params: ${JSON.stringify(node.params)}`);
  }
  if (node.children && node.children.length > 0) {
    console.log(`       Children: ${node.children.length}`);
    node.children.forEach((child, j) => {
      console.log(`         [${j}] ${child.label} (${child.componentId})`);
    });
  }
  console.log('');
});

console.log('3. Converting back to nirs4all format...');
const exported = exportNirs4allPipeline(treeNodes);
console.log('   Export preview:');
console.log(exported.substring(0, 500) + '...\n');

console.log('4. Verification:');
const reloaded = loadNirs4allPipeline(exported);
console.log(`   Original nodes: ${treeNodes.length}`);
console.log(`   Reloaded nodes: ${reloaded.length}`);
console.log(`   Round-trip: ${treeNodes.length === reloaded.length ? '✓ Success' : '✗ Failed'}\n`);

console.log('=== Demo Complete ===');

// Show what would be displayed in UI
console.log('\n=== UI Display Preview ===');
console.log('Pipeline Steps:');
treeNodes.forEach((node, i) => {
  const icon = node.nodeType === 'container' ? '📦' :
               node.nodeType === 'generation' ? '⚙️' :
               node.category === 'model_training' ? '🤖' : '🔧';
  console.log(`${icon} ${i + 1}. ${node.label}`);
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      console.log(`   └─ ${child.label}`);
    });
  }
});
