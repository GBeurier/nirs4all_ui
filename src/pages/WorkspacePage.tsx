import { useState, useEffect } from 'react';
import { RefreshCw, Link2, X, Users } from 'feather-icons-react';
import { apiClient } from '../api/client';
import type { Dataset, Group } from '../types';
import DatasetTable from '../components/DatasetTable';
import GroupsModal from '../components/GroupsModal';
import FileBrowserModal from '../components/FileBrowserModal';

const WorkspacePage = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [fileBrowserMode, setFileBrowserMode] = useState<'file' | 'folder' | null>(null);

  // Load workspace data
  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const [workspaceData, groupsData] = await Promise.all([
        apiClient.getWorkspace(),
        apiClient.getGroups(),
      ]);
      setDatasets(workspaceData.datasets || []);
      setGroups(groupsData.groups || []);
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  // Handle dataset selection
  const handleSelectDataset = (datasetId: string, selected: boolean) => {
    setSelectedDatasets((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(datasetId);
      } else {
        newSet.delete(datasetId);
      }
      return newSet;
    });
  };

  // Handle link dataset
  const handleLinkDataset = async (path: string) => {
    try {
      await apiClient.linkDataset(path);
      await loadWorkspace();
      setFileBrowserMode(null);
    } catch (error) {
      console.error('Failed to link dataset:', error);
      alert('Failed to link dataset');
    }
  };

  // Handle unlink dataset
  const handleUnlinkDataset = async () => {
    if (selectedDatasets.size === 0) {
      alert('Please select datasets to unlink');
      return;
    }

    if (!confirm(`Unlink ${selectedDatasets.size} dataset(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedDatasets).map((id) => apiClient.unlinkDataset(id))
      );
      setSelectedDatasets(new Set());
      await loadWorkspace();
    } catch (error) {
      console.error('Failed to unlink datasets:', error);
      alert('Failed to unlink datasets');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workspace</h1>
          <p className="text-gray-600">Manage and analyze your NIRS prediction results</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={loadWorkspace}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setFileBrowserMode('folder')}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Link Dataset
          </button>

          <button
            onClick={handleUnlinkDataset}
            disabled={selectedDatasets.size === 0}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="h-4 w-4 mr-2" />
            Unlink
          </button>

          <button
            onClick={() => setShowGroupsModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Users className="h-4 w-4 mr-2" />
            Groups
          </button>
        </div>

        <DatasetTable
          datasets={datasets}
          groups={groups}
          selectedDatasets={selectedDatasets}
          onSelectDataset={handleSelectDataset}
          onRefresh={loadWorkspace}
        />

        {/* Modals */}
        {showGroupsModal && (
          <GroupsModal
            groups={groups}
            datasets={datasets}
            onClose={() => setShowGroupsModal(false)}
            onRefresh={loadWorkspace}
          />
        )}

        {fileBrowserMode && (
          <FileBrowserModal
            mode={fileBrowserMode}
            onSelect={handleLinkDataset}
            onClose={() => setFileBrowserMode(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WorkspacePage;
