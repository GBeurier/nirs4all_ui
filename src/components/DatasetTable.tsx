import { PlusCircle } from 'feather-icons-react';
import type { Dataset, Group } from '../types';
import { useState } from 'react';
import { apiClient } from '../api/client';

interface DatasetTableProps {
  datasets: Dataset[];
  groups: Group[];
  selectedDatasets: Set<string>;
  onSelectDataset: (datasetId: string, selected: boolean) => void;
  onRefresh: () => void;
}

const DatasetTable = ({
  datasets,
  groups,
  selectedDatasets,
  onSelectDataset,
  onRefresh,
}: DatasetTableProps) => {
  const getGroupsForDataset = (datasetId: string): Group[] => {
    return groups.filter((group) => group.dataset_ids.includes(datasetId));
  };

  const [addingFor, setAddingFor] = useState<string | null>(null);

  const handleAddToGroup = async (datasetId: string, groupId: string) => {
    try {
      await apiClient.addDatasetToGroup(groupId, datasetId);
      setAddingFor(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to add dataset to group:', err);
      alert('Failed to add dataset to group');
    }
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
              Path
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
                    {dataset.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {dataset.path}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {datasetGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {datasetGroups.map((group) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      title="Add to group"
                      onClick={() => setAddingFor(dataset.id)}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </button>
                    {addingFor === dataset.id && (
                      <div className="mt-1 flex gap-2 items-center">
                        {groups.map((group) => (
                          <button
                            key={group.id}
                            className="text-sm font-medium text-gray-500 border rounded px-2 py-1"
                            onClick={() => handleAddToGroup(dataset.id, group.id)}
                          >
                            {group.name}
                          </button>
                        ))}
                        <button onClick={() => setAddingFor(null)} className="text-sm text-red-500">Cancel</button>
                      </div>
                    )}
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
