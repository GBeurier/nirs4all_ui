import { useState } from 'react';
import { X, Plus, Edit2, Trash2 } from 'feather-icons-react';
import type { Group, Dataset } from '../types';
import { apiClient } from '../api/client';

interface GroupsModalProps {
  groups: Group[];
  datasets: Dataset[];
  onClose: () => void;
  onRefresh: () => void;
}

const GroupsModal = ({ groups, datasets, onClose, onRefresh }: GroupsModalProps) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await apiClient.createGroup(newGroupName);
      setNewGroupName('');
      await onRefresh();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    }
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!editingGroupName.trim()) return;

    try {
      await apiClient.renameGroup(groupId, editingGroupName);
      setEditingGroupId(null);
      setEditingGroupName('');
      await onRefresh();
    } catch (error) {
      console.error('Failed to rename group:', error);
      alert('Failed to rename group');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Delete group "${groupName}"?`)) return;

    try {
      await apiClient.deleteGroup(groupId);
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group');
    }
  };

  const handleRemoveDatasetFromGroup = async (groupId: string, datasetId: string) => {
    try {
      await apiClient.removeDatasetFromGroup(groupId, datasetId);
      await onRefresh();
    } catch (error) {
      console.error('Failed to remove dataset from group:', error);
      alert('Failed to remove dataset from group');
    }
  };

  const getDatasetName = (datasetId: string): string => {
    return datasets.find((ds) => ds.id === datasetId)?.name || datasetId;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Groups</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Create new group */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create New Group
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                placeholder="Group name"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateGroup}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </button>
            </div>
          </div>

          {/* Groups list */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Existing Groups</h3>

            {groups.length === 0 ? (
              <p className="text-gray-500 text-sm">No groups yet. Create one above.</p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    {editingGroupId === group.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRenameGroup(group.id)}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameGroup(group.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingGroupId(null);
                            setEditingGroupName('');
                          }}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-medium text-gray-900">{group.name}</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingGroupId(group.id);
                              setEditingGroupName(group.name);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Rename group"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            className="text-red-400 hover:text-red-600"
                            title="Delete group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    {group.dataset_ids.length === 0 ? (
                      <span>No datasets</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.dataset_ids.map((datasetId) => (
                          <span
                            key={datasetId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100"
                          >
                            {getDatasetName(datasetId)}
                            <button
                              onClick={() => handleRemoveDatasetFromGroup(group.id, datasetId)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupsModal;
