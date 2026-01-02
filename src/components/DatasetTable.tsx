import { Eye, TrendingUp, X, Edit } from 'feather-icons-react';
import type { Dataset, Group } from '../types';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface DatasetTableProps {
  datasets: Dataset[];
  groups: Group[];
  selectedDatasets: Set<string>;
  onSelectDataset: (datasetId: string, selected: boolean) => void;
  onRefresh: () => void;
  onEditDataset?: (dataset: Dataset) => void;
}

const DatasetTable = ({
  datasets,
  groups,
  selectedDatasets,
  onSelectDataset,
  onRefresh,
  onEditDataset,
}: DatasetTableProps) => {
  const navigate = useNavigate();

  const formatNumFeatures = (d: Dataset): string => {
    const nf = d.num_features;

    // Handle array (multi-source)
    if (Array.isArray(nf)) {
      return nf.map(f => String(f)).join(' | ');
    }

    // Handle number (single source)
    if (typeof nf === 'number') {
      return String(nf);
    }

    return 'N/A';
  };

  const getGroupsForDataset = (datasetId: string): Group[] => {
    return groups.filter((group) => (group as any).dataset_ids?.includes(datasetId));
  };

  const handleRemoveFromGroup = async (datasetId: string, groupId: string) => {
    try {
      await apiClient.removeDatasetFromGroup(groupId, datasetId);
      onRefresh();
    } catch (err) {
      console.error('Failed to remove dataset from group:', err);
      alert('Failed to remove dataset from group');
    }
  };

  const handleViewDataset = (dataset: Dataset) => {
    alert(`View dataset: ${dataset.name}\nPath: ${dataset.path}\nSamples: ${dataset.num_samples || 'N/A'}\nFeatures: ${formatNumFeatures(dataset)}`);
  };

  const handleGoToPredictions = (datasetId: string) => {
    // Navigate to predictions page with dataset filter
    navigate(`/predictions?dataset=${datasetId}`);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-6 py-3">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={datasets.length > 0 && selectedDatasets.size === datasets.length}
                onChange={(e) => {
                  datasets.forEach((ds) => onSelectDataset(ds.id, e.target.checked));
                }}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Samples / Features / Targets
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Groups
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {datasets.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                No datasets linked. Click "Link Dataset" to add one.
              </td>
            </tr>
          ) : (
            datasets.map((dataset) => {
              const datasetGroups = getGroupsForDataset(dataset.id);
              return (
                <tr key={dataset.id} className={selectedDatasets.has(dataset.id) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedDatasets.has(dataset.id)}
                      onChange={(e) => onSelectDataset(dataset.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <span
                      className="cursor-help"
                      title={dataset.path}
                    >
                      {dataset.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {dataset.num_samples && dataset.num_features ? (
                      <span className="font-mono">
                        {dataset.num_samples} / {formatNumFeatures(dataset)}{dataset.num_targets !== undefined && dataset.num_targets !== null ? ` / ${dataset.num_targets}` : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {datasetGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {datasetGroups.map((group) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {group.name}
                            <button
                              onClick={() => handleRemoveFromGroup(dataset.id, group.id)}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                              title="Remove from group"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button
                        className="text-gray-600 hover:text-blue-600"
                        title="View dataset details"
                        onClick={() => handleViewDataset(dataset)}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {onEditDataset && (
                        <button
                          className="text-gray-600 hover:text-orange-600"
                          title="Edit dataset configuration"
                          onClick={() => onEditDataset(dataset)}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        className="text-gray-600 hover:text-green-600"
                        title="View predictions for this dataset"
                        onClick={() => handleGoToPredictions(dataset.id)}
                      >
                        <TrendingUp className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DatasetTable;
