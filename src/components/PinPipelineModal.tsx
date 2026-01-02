import { useState } from 'react';
import { X } from 'feather-icons-react';
import { apiClient } from '../api/client';

interface PinPipelineModalProps {
  pipeline: any;
  onPinned?: (saved: any) => void;
  onClose: () => void;
}

const PinPipelineModal = ({ pipeline, onPinned, onClose }: PinPipelineModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await apiClient.savePipeline(name.trim(), description.trim(), pipeline);
      onPinned?.(res);
      onClose();
    } catch (err) {
      console.error('Failed to save pipeline', err);
      alert('Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Pin pipeline</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Pin'}</button>
        </div>
      </div>
    </div>
  );
};

export default PinPipelineModal;
