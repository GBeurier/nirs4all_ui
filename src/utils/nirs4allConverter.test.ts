/**
 * Test file for nirs4all converter
 * To run: import and test manually or set up Jest
 */

import {
  loadNirs4allPipeline,
  exportNirs4allPipeline,
  treeNodesToNirs4all,
  nirs4allToTreeNodes
} from './nirs4allConverter';

// Example pipeline from Q1_regression.py (simplified)
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
      "nirs4all.operators.transformations.signal.Detrend",
      "nirs4all.operators.transformations.nirs.FirstDerivative"
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
  }
];

// Test generator node
const generatorPipeline = [
  {
    "_or_": [
      "nirs4all.operators.transformations.signal.Detrend",
      "nirs4all.operators.transformations.nirs.FirstDerivative",
      "nirs4all.operators.transformations.nirs.Gaussian"
    ],
    "size": 2
  },
  {
    "_range_": [1, 12, 2],
    "param": "n_components",
    "model": {
      "class": "sklearn.cross_decomposition._pls.PLSRegression"
    }
  }
];

function testConverter() {
  console.log('=== Testing nirs4all Converter ===\n');

  // Test 1: Load simple pipeline
  console.log('Test 1: Loading simple pipeline');
  const nodes1 = nirs4allToTreeNodes(examplePipeline);
  console.log(`  Created ${nodes1.length} nodes`);
  console.log('  Nodes:', nodes1.map(n => `${n.label} (${n.componentId})`).join(', '));

  // Test 2: Convert back to nirs4all format
  console.log('\nTest 2: Converting back to nirs4all format');
  const exported1 = treeNodesToNirs4all(nodes1);
  console.log('  Exported pipeline:', JSON.stringify(exported1, null, 2));

  // Test 3: Load generator pipeline
  console.log('\nTest 3: Loading generator pipeline');
  const nodes2 = nirs4allToTreeNodes(generatorPipeline);
  console.log(`  Created ${nodes2.length} nodes`);
  nodes2.forEach(n => {
    console.log(`  - ${n.label} (${n.componentId})`, n.children?.length ? `with ${n.children.length} children` : '');
  });

  // Test 4: Export and re-import
  console.log('\nTest 4: Round-trip test');
  const exported2 = exportNirs4allPipeline(nodes1);
  const nodes3 = loadNirs4allPipeline(exported2);
  console.log(`  Original: ${nodes1.length} nodes, Re-imported: ${nodes3.length} nodes`);
  console.log('  Match:', nodes1.length === nodes3.length ? '✓' : '✗');

  console.log('\n=== Tests Complete ===');
}

// Export for manual testing
export { testConverter, examplePipeline, generatorPipeline };
