import { useState, useEffect } from 'react';
import { RefreshCw, Link2, X, Users, Folder, Database as DBIcon, GitBranch, BarChart2 } from 'feather-icons-react';
import { apiClient } from '../api/client';
import type { Dataset, Group } from '../types';
import DatasetTable from '../components/DatasetTable';
import GroupsModal from '../components/GroupsModal';
import { selectFolder } from '../utils/fileDialogs';

const WorkspacePage = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [stats, setStats] = useState({ datasets: 0, predictions: 0, pipelines: 0 });

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
    loadStats();
  }, []);

  useEffect(() => {
    loadStats();
  }, [datasets]);

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

  // Handle select workspace (change workspace folder)
  const handleSelectWorkspace = async (path: string) => {
    try {
      await apiClient.selectWorkspace(path, { persist_global: true });
      await loadWorkspace();
      await loadStats();
    } catch (error) {
      console.error('Failed to select workspace:', error);
      alert('Failed to change workspace');
    }
  };

  const loadStats = async () => {
    try {
      const [ws, pc] = await Promise.all([apiClient.getWorkspace(), apiClient.getPredictionsCounts().catch(() => ({ total: 0 }))]);
      setStats((s) => ({ ...s, datasets: (ws.datasets || []).length, predictions: pc.total || 0 }));
      // pipelines count
      try {
        const pl = await apiClient.listPipelines();
        setStats((s) => ({ ...s, pipelines: (pl.pipelines || []).length }));
      } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Workspace</h1>
            <p className="text-gray-600">Manage and analyze your NIRS prediction results</p>
          </div>

          {/* Big Change Workspace Button (top-right) */}
          <div>
            <button
              onClick={async () => {
                try {
                  const folderPath = await selectFolder();
                  if (folderPath) {
                    await handleSelectWorkspace(folderPath);
                  }
                } catch (err) {
                  console.error('Failed to select workspace folder', err);
                  alert('Failed to select workspace folder');
                }
              }}
              title="Open folder to set as workspace"
              className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
              <Folder className="h-6 w-6 mr-2" />
              <span className="font-semibold">Change Workspace</span>
            </button>
          </div>
        </div>

        {/* Stats and Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Stats Cards with circular icons */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Predictions</div>
                <div className="text-2xl font-bold text-gray-900">{stats.predictions}</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <DBIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Datasets</div>
                <div className="text-2xl font-bold text-gray-900">{stats.datasets}</div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <GitBranch className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Pipelines</div>
                <div className="text-2xl font-bold text-gray-900">{stats.pipelines}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <button
              onClick={loadWorkspace}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={async () => {
                try {
                  const folderPath = await selectFolder();
                  if (folderPath) {
                    await handleLinkDataset(folderPath);
                  }
                } catch (err) {
                  console.error('Failed to select dataset folder', err);
                  alert('Failed to select dataset folder');
                }
              }}
              title="Open folder or select files to link as dataset"
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
      </div>
    </div>
  );
};

export default WorkspacePage;
