import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, Users, Folder, Database as DBIcon, GitBranch, BarChart2, UserPlus } from 'feather-icons-react';
import { apiClient } from '../api/client';
import type { Dataset, Group, DatasetFile } from '../types';
import DatasetTable from '../components/DatasetTable';
import GroupsModal from '../components/GroupsModal';
import AddDatasetModal from '../components/AddDatasetModal';
import EditDatasetModal from '../components/EditDatasetModal_v2';
import { selectFolder } from '../utils/fileDialogs';

const WorkspacePage = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [stats, setStats] = useState({ datasets: 0, predictions: 0, pipelines: 0 });
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [workspacePathInput, setWorkspacePathInput] = useState<string>('');
  const [datasetPathInput, setDatasetPathInput] = useState<string>('');
  const [selectedGroupForBulk, setSelectedGroupForBulk] = useState<string>('');
  const [showAddDatasetModal, setShowAddDatasetModal] = useState(false);
  const [showEditDatasetModal, setShowEditDatasetModal] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const isDesktop = typeof window !== 'undefined' && !!(window as any).pywebview?.api;

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

  // Periodically check backend availability to provide clearer error messages
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await apiClient.getWorkspace();
        if (mounted) setBackendAvailable(true);
      } catch (e) {
        if (mounted) setBackendAvailable(false);
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // NOTE: We intentionally DO NOT create hidden <input webkitdirectory> fallbacks in browser mode.
  // Those inputs trigger the browser upload confirmation dialog ("Voulez-vous vraiment envoyer tous les fichiers ... ?")
  // and cannot provide absolute filesystem paths to the backend. To link a workspace or a dataset with an
  // absolute path you must run the desktop application (PyWebView) which exposes native OS dialogs and
  // absolute paths to the backend.

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
  const handleLinkDataset = async (path: string, customConfig?: any) => {
    try {
      await apiClient.linkDataset(path, customConfig);
      await loadWorkspace();
    } catch (error) {
      console.error('Failed to link dataset:', error);
      const msg = (error as any)?.message || String(error);
      alert('Failed to link dataset: ' + msg + '\n\nTip: To link local folders with absolute paths use the desktop app (Run the launcher).');
    }
  };

  // Handle edit dataset
  const handleEditDataset = (dataset: Dataset) => {
    setEditingDataset(dataset);
    setShowEditDatasetModal(true);
  };

  // Handle save dataset config
  const handleSaveDatasetConfig = async (datasetId: string, config: any, files: DatasetFile[]) => {
    try {
      // Call load endpoint to save config and load dataset
      await apiClient.loadDataset(datasetId, config, files);
      await loadWorkspace();
    } catch (error) {
      console.error('Failed to save and load dataset:', error);
      throw error;
    }
  };

  // Handle refresh all datasets
  const handleRefreshAll = async () => {
    if (datasets.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // Refresh all datasets in parallel
      await Promise.all(
        datasets.map(ds => apiClient.refreshDataset(ds.id).catch(err => {
          console.error(`Failed to refresh dataset ${ds.name}:`, err);
          return null;
        }))
      );
      await loadWorkspace();
    } catch (error) {
      console.error('Failed to refresh datasets:', error);
      alert('Failed to refresh some datasets. Check console for details.');
    } finally {
      setLoading(false);
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

  // Handle bulk group allocation
  const handleBulkAllocateGroup = async () => {
    if (selectedDatasets.size === 0) {
      alert('Please select datasets to assign to a group');
      return;
    }

    if (!selectedGroupForBulk) {
      alert('Please select a group');
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedDatasets).map((datasetId) =>
          apiClient.addDatasetToGroup(selectedGroupForBulk, datasetId)
        )
      );
      setSelectedDatasets(new Set());
      setSelectedGroupForBulk('');
      await loadWorkspace();
    } catch (error) {
      console.error('Failed to allocate datasets to group:', error);
      alert('Failed to allocate datasets to group');
    }
  };

  // Handle select workspace (change workspace folder)
  const handleSelectWorkspace = async (path: string) => {
    try {
      await apiClient.selectWorkspace(path, { persist_global: true });
      await loadWorkspace();
      await loadStats();
    } catch (error: any) {
      console.error('Failed to select workspace:', error);
      const msg = String(error?.message || error);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('API Error: 0')) {
        alert('Failed to contact backend. Ensure the backend is running on http://localhost:8000 and use `npm run dev:all` to start both frontend and backend.');
      } else {
        alert('Failed to change workspace: ' + msg + '\n\nTip: To pick a local folder path you need to use the desktop app (PyWebView) which provides absolute paths.');
      }
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
      {!backendAvailable && (
        <div className="mb-4 p-3 rounded bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
          Backend not reachable at <code>{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</code>. Please start the backend (see README) or run <code>npm run dev:all</code> to start both frontend and backend.
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {!isDesktop && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            You are running the web version in a browser. To select local folders with absolute
            filesystem paths (required to link datasets and set the workspace) please use the desktop
            application (launcher). The desktop app provides native OS dialogs and will avoid
            browser upload prompts.
            <div className="mt-3">
              <p className="text-sm text-gray-700 mb-2">Development helper: paste an absolute path below to test linking without the desktop app.</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="D:\\path\\to\\workspace"
                  value={workspacePathInput}
                  onChange={(e) => setWorkspacePathInput(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded"
                />
                <button
                  onClick={async () => {
                    if (!workspacePathInput) return alert('Paste a workspace path first');
                    await handleSelectWorkspace(workspacePathInput);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Set workspace
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="D:\\path\\to\\dataset"
                  value={datasetPathInput}
                  onChange={(e) => setDatasetPathInput(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded"
                />
                <button
                  onClick={async () => {
                    if (!datasetPathInput) return alert('Paste a dataset path first');
                    await handleLinkDataset(datasetPathInput);
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded"
                >
                  Link dataset (paste)
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Workspace</h1>
            <p className="text-gray-600">Manage your datasets and workspace settings</p>
          </div>

          {/* Big Change Workspace Button (top-right) */}
          <div>
            {/* Fallback: hidden inputs are created programmatically to avoid TypeScript attribute issues */}
            <button
              onClick={async () => {
                try {
                  const folderPath = await selectFolder();
                  if (!folderPath) {
                    // No native picker available in this browser environment.
                    alert('No native folder picker available in this browser.\n\nTo pick a workspace folder with an absolute path please run the desktop app (launcher).');
                    return;
                  }

                  // If pywebview returned a string path (desktop), use it directly
                  if (typeof folderPath === 'string') {
                    await handleSelectWorkspace(folderPath);
                    return;
                  }

                  // If browser returned a FileSystem handle, show helpful message
                  alert('Browser-based folder selection is not supported for workspace operations. Please use the desktop application for full functionality.');
                  return;
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
          <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            {/* Left side buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAll}
                disabled={loading || datasets.length === 0}
                title="Refresh all datasets"
                className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setShowAddDatasetModal(true)}
                title="Add dataset"
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Dataset
              </button>

              <button
                onClick={handleUnlinkDataset}
                disabled={selectedDatasets.size === 0}
                title="Delete selected datasets"
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Bulk Group Allocation */}
              {selectedDatasets.size > 0 && (
                <>
                  <select
                    value={selectedGroupForBulk}
                    onChange={(e) => setSelectedGroupForBulk(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <option value="">Select group...</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAllocateGroup}
                    disabled={!selectedGroupForBulk}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign to Group
                  </button>
                </>
              )}

              <button
                onClick={() => setShowNewGroupModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </button>

              <button
                onClick={() => setShowGroupsModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Groups
              </button>
            </div>
          </div>
        </div>

        <DatasetTable
          datasets={datasets}
          groups={groups}
          selectedDatasets={selectedDatasets}
          onSelectDataset={handleSelectDataset}
          onRefresh={loadWorkspace}
          onEditDataset={handleEditDataset}
        />

        {/* Modals */}
        {showAddDatasetModal && (
          <AddDatasetModal
            onClose={() => setShowAddDatasetModal(false)}
            onAdd={handleLinkDataset}
          />
        )}

        {showEditDatasetModal && editingDataset && (
          <EditDatasetModal
            dataset={editingDataset}
            onClose={() => {
              setShowEditDatasetModal(false);
              setEditingDataset(null);
            }}
            onSave={handleSaveDatasetConfig}
          />
        )}

        {showGroupsModal && (
          <GroupsModal
            groups={groups}
            datasets={datasets}
            onClose={() => setShowGroupsModal(false)}
            onRefresh={loadWorkspace}
          />
        )}

        {showNewGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">Create New Group</h2>
                <button
                  onClick={() => setShowNewGroupModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('groupName') as string;
                  const description = formData.get('groupDescription') as string;

                  if (!name.trim()) {
                    alert('Please enter a group name');
                    return;
                  }

                  try {
                    await apiClient.createGroup(name.trim());
                    await loadWorkspace();
                    setShowNewGroupModal(false);
                  } catch (error) {
                    console.error('Failed to create group:', error);
                    alert('Failed to create group');
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    name="groupName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="groupDescription"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewGroupModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspacePage;
