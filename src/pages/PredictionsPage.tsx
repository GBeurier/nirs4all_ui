import { useEffect, useState } from 'react';
import { Download, Trash2, Eye, Save, Settings, ChevronUp, ChevronDown, GitBranch } from 'feather-icons-react';
import { apiClient } from '../api/client';
import type { Prediction } from '../types';
import { useNavigate } from 'react-router-dom';

const PredictionsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [dataset, setDataset] = useState('');
  const [model, setModel] = useState('');
  const [partition, setPartition] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortBy, setSortBy] = useState<string>('_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none');
  const [allSelectedPredictions, setAllSelectedPredictions] = useState<any[]>([]);
  const [selectedCompositeKeys, setSelectedCompositeKeys] = useState<Set<string>>(new Set());

  const [meta, setMeta] = useState<any>({ models: [], configs: [], partitions: [] });
  const [datasetsList, setDatasetsList] = useState<any[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [m, ds] = await Promise.all([
          apiClient.getPredictionsMeta().catch(() => ({})),
          apiClient.getPredictionsDatasets().catch(() => ({ datasets: [] })),
        ]);
        setMeta(m || {});
        setDatasetsList((ds && ds.datasets) || []);
      } catch (err) {
        console.error('Failed to load predictions meta:', err);
      }
    })();

    fetchPredictions().catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset selection when filters or pagination change
  useEffect(() => {
    setSelectAllMode('none');
  }, [q, dataset, model, partition, dateFrom, dateTo, sortBy, sortDir, page, pageSize]);

  const showToast = (message: string, level: string = 'info', retryCallback: (() => void) | null = null) => {
    const containerId = 'toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.right = '16px';
      container.style.top = '16px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colorClass = level === 'error' ? 'border-red-200' : 'border-gray-200';
    toast.className = `mb-2 px-4 py-3 rounded shadow-lg bg-white ${colorClass}`;
    toast.style.minWidth = '220px';
    toast.innerHTML = `<div class="text-sm text-gray-800">${message}</div>`;

    if (retryCallback) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'mt-2 inline-block text-sm text-blue-600 hover:underline';
      retryBtn.textContent = 'Retry';
      retryBtn.onclick = () => {
        retryCallback();
        try { container?.removeChild(toast); } catch (e) {}
      };
      toast.appendChild(retryBtn);
    }

    container.appendChild(toast);
    setTimeout(() => {
      try { container?.removeChild(toast); } catch (e) {}
    }, 8000);
  };

  const fetchPredictions = async (opts: Partial<Record<string, any>> = {}) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: opts.page ?? page,
        page_size: opts.page_size ?? pageSize,
        q: opts.q ?? q,
        dataset: opts.dataset ?? dataset,
        model_name: opts.model_name ?? model,
        partition: opts.partition ?? partition,
        date_from: opts.date_from ?? dateFrom,
        date_to: opts.date_to ?? dateTo,
        include_arrays: 'false',
      };
      if (opts.sort_by !== undefined || sortBy) params.sort_by = opts.sort_by ?? sortBy;
      if (opts.sort_dir !== undefined || sortDir) params.sort_dir = opts.sort_dir ?? sortDir;

      const res = await apiClient.searchPredictions(params);
      // Add UUID to each prediction for guaranteed unique React keys
      const predictionsWithUuid = (res.predictions || []).map((p: any) => ({
        ...p,
        _uuid: crypto.randomUUID()
      }));
      setPredictions(predictionsWithUuid);
      setPage(res.page || params.page);
      setPageSize(res.page_size || params.page_size);
      setTotal(res.total || 0);
      setSelectedIds(new Set());
      setSelectedCompositeKeys(new Set());
      setSelectAllMode('none');
    } catch (err: any) {
      console.error('Error loading predictions:', err);
      showToast('Failed to load predictions: ' + (err.message || String(err)), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} prediction(s)?`)) return;
    try {
      // Map prediction IDs back to actual database IDs
      const allPreds = selectAllMode === 'all' ? allSelectedPredictions : predictions;
      const predictionIdsToDelete = allPreds
        .filter((p: any) => selectedIds.has(getPredictionId(p)))
        .map((p: any) => p.id);

      await Promise.all(predictionIdsToDelete.map((id) => apiClient.deletePrediction(id)));
      showToast('Deleted selected predictions', 'info');
      setSelectedIds(new Set());
      setSelectedCompositeKeys(new Set());
      setAllSelectedPredictions([]);
      setSelectAllMode('none');
      fetchPredictions();
    } catch (err) {
      console.error('Failed to delete predictions', err);
      showToast('Failed to delete predictions', 'error');
    }
  };

  const handleExport = () => {
    if (!predictions || predictions.length === 0) return;
    const rows = predictions.map((r) => {
      const id = (r as any).id || (r as any).run_id || '';
      const date = (r as any)._date || '';
      const datasetName = (r as any).dataset_name || (r as any).dataset_path || '';
      const modelName = (r as any).model_name || (r as any).model_classname || '';
      const score = (r as any).test_score ?? (r as any).val_score ?? (r as any).train_score ?? '';
      return [date, id, datasetName, modelName, String(score)];
    });
    const csv = ['Date,RunID,Dataset,Model,Score', ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predictions_export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const getUniqueId = (pred: any) => {
    // Use UUID if available (guaranteed unique for React keys)
    if (pred._uuid) {
      return pred._uuid;
    }
    // Fallback for any edge cases where UUID isn't set
    const id = pred.id || 'null';
    const partition = pred.partition || 'null';
    const foldValue = pred.fold_id !== null && pred.fold_id !== undefined ? pred.fold_id : 'null';
    const modelName = pred.model_name || 'null';
    const configName = pred.config_name || 'null';
    const datasetName = pred.dataset_name || 'null';
    const opCounter = pred.op_counter !== null && pred.op_counter !== undefined ? pred.op_counter : 'null';
    return `${id}_${partition}_${foldValue}_${modelName}_${configName}_${datasetName}_${opCounter}`;
  };

  const getPredictionId = (pred: any) => {
    // Use UUID as the selection ID (guaranteed unique for each row)
    // This handles backend data that may have duplicates
    if (pred._uuid) {
      return pred._uuid;
    }
    // Fallback if UUID not available
    const id = pred.id || 'null';
    const partition = pred.partition || 'null';
    const foldValue = pred.fold_id !== null && pred.fold_id !== undefined ? pred.fold_id : 'null';
    const modelName = pred.model_name || 'null';
    const configName = pred.config_name || 'null';
    const datasetName = pred.dataset_name || 'null';
    const opCounter = pred.op_counter !== null && pred.op_counter !== undefined ? pred.op_counter : 'null';
    return `${id}_${partition}_${foldValue}_${modelName}_${configName}_${datasetName}_${opCounter}`;
  };

  const getCompositeKey = (pred: any) => {
    // Get a stable key based on prediction properties (for matching across different UUIDs)
    const id = pred.id || 'null';
    const partition = pred.partition || 'null';
    const foldValue = pred.fold_id !== null && pred.fold_id !== undefined ? pred.fold_id : 'null';
    const modelName = pred.model_name || 'null';
    const configName = pred.config_name || 'null';
    const datasetName = pred.dataset_name || 'null';
    const opCounter = pred.op_counter !== null && pred.op_counter !== undefined ? pred.op_counter : 'null';
    return `${id}_${partition}_${foldValue}_${modelName}_${configName}_${datasetName}_${opCounter}`;
  };

  const toggleSelect = (pred: any, checked: boolean) => {
    const predId = getPredictionId(pred);
    const compositeKey = getCompositeKey(pred);

    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(predId);
      else n.delete(predId);
      return n;
    });

    setSelectedCompositeKeys((prev) => {
      const n = new Set(prev);
      if (checked) n.add(compositeKey);
      else n.delete(compositeKey);
      return n;
    });

    // Reset select-all mode when manually toggling
    setSelectAllMode('none');
  };

  const isSelected = (pred: any) => {
    if (selectAllMode === 'all') {
      // In "all" mode, check by composite key (matches across different UUIDs)
      return selectedCompositeKeys.has(getCompositeKey(pred));
    }
    // In other modes, check by UUID
    return selectedIds.has(getPredictionId(pred));
  };

  const handleSelectAll = async () => {
    const currentPagePredIds = new Set(predictions.map((p: any) => getPredictionId(p)));
    const currentPageCompositeKeys = new Set(predictions.map((p: any) => getCompositeKey(p)));

    if (selectAllMode === 'none') {
      // First click: Select current page
      setSelectedIds(currentPagePredIds);
      setSelectedCompositeKeys(currentPageCompositeKeys);
      setSelectAllMode('page');
      setAllSelectedPredictions(predictions);
    } else if (selectAllMode === 'page') {
      // Second click: Select all filtered predictions
      try {
        showToast('Fetching all filtered predictions...', 'info');

        const maxPageSize = 500; // Backend limit
        let allPredictions: any[] = [];
        let currentPage = 1;
        let hasMore = true;
        let expectedTotal = total;

        // Fetch all pages
        while (hasMore) {
          const params: Record<string, any> = {
            page: currentPage,
            page_size: maxPageSize,
            q,
            dataset,
            model_name: model,
            partition,
            date_from: dateFrom,
            date_to: dateTo,
            include_arrays: 'false',
          };
          if (sortBy) params.sort_by = sortBy;
          if (sortDir) params.sort_dir = sortDir;

          const res = await apiClient.searchPredictions(params);
          expectedTotal = res.total || expectedTotal; // Update expected total from response

          const predictions = (res.predictions || []).map((p: any) => ({
            ...p,
            _uuid: crypto.randomUUID()
          }));

          allPredictions = [...allPredictions, ...predictions];

          console.log(`Fetched page ${currentPage}: ${predictions.length} predictions, total so far: ${allPredictions.length}/${expectedTotal}`);

          // Check if we have more pages
          if (predictions.length < maxPageSize) {
            // Last page reached (got fewer than max)
            hasMore = false;
          } else if (allPredictions.length >= expectedTotal) {
            // We have all expected predictions
            hasMore = false;
          } else {
            // Continue fetching
            currentPage++;
          }
        }

        console.log(`Total fetched: ${allPredictions.length}, expected: ${expectedTotal}`);

        const allPredIds = new Set<string>(allPredictions.map((p: any) => getPredictionId(p)));
        const allCompositeKeys = new Set<string>(allPredictions.map((p: any) => getCompositeKey(p)));

        setSelectedIds(allPredIds);
        setSelectedCompositeKeys(allCompositeKeys);
        setAllSelectedPredictions(allPredictions);
        setSelectAllMode('all');
        showToast(`Selected all ${allPredIds.size} filtered predictions`, 'info');
      } catch (err) {
        console.error('Failed to select all predictions:', err);
        showToast('Failed to select all predictions', 'error');
      }
    } else {
      // Third click: Deselect all
      setSelectedIds(new Set());
      setSelectedCompositeKeys(new Set());
      setAllSelectedPredictions([]);
      setSelectAllMode('none');
    }
  };

  const formatScore = (score: any) => {
    if (score === '-' || score === undefined || score === null || isNaN(Number(score))) {
      return '-';
    }
    return Number(score).toFixed(3);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
      setPage(1);
      fetchPredictions({ sort_by: key, sort_dir: newDir, page: 1 });
    } else {
      setSortBy(key);
      setSortDir('desc');
      setPage(1);
      fetchPredictions({ sort_by: key, sort_dir: 'desc', page: 1 });
    }
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const getPageRange = () => {
    const maxButtons = 7;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Predictions Database</h1>
          <p className="text-gray-600">Manage and analyze your NIRS prediction results</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search predictions..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchPredictions({ page: 1 }))}
              className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2"
            />

            <select
              value={dataset}
              onChange={(e) => { setDataset(e.target.value); setPage(1); fetchPredictions({ page: 1, dataset: e.target.value }); }}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Datasets</option>
              {datasetsList.map((d: any) => (
                <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
              ))}
            </select>

            <select
              value={model}
              onChange={(e) => { setModel(e.target.value); setPage(1); fetchPredictions({ page: 1, model_name: e.target.value }); }}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Models</option>
              {(meta.models || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={partition}
              onChange={(e) => { setPartition(e.target.value); setPage(1); fetchPredictions({ page: 1, partition: e.target.value }); }}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Partitions</option>
              {(meta.partitions || []).map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {loading ? 'Loading...' : `${total} predictions found`}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                  fetchPredictions({ page: 1, page_size: Number(e.target.value) });
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="200">200 per page</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </button>
              <button
                onClick={() => { setPage(1); fetchPredictions({ page: 1 }); }}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectAllMode !== 'none'}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = selectAllMode === 'page' && selectedIds.size > 0 && selectedIds.size < total;
                        }
                      }}
                      onChange={handleSelectAll}
                      title={
                        selectAllMode === 'none' ? 'Select all on page' :
                        selectAllMode === 'page' ? `Click again to select all ${total} filtered` :
                        'Deselect all'
                      }
                    />
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('_date')}
                  >
                    Date {renderSortIcon('_date')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('id')}
                  >
                    ID {renderSortIcon('id')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('dataset_name')}
                  >
                    Dataset {renderSortIcon('dataset_name')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('model_name')}
                  >
                    Model {renderSortIcon('model_name')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('partition')}
                  >
                    Partition {renderSortIcon('partition')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('fold_id')}
                  >
                    Fold {renderSortIcon('fold_id')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('val_score')}
                  >
                    Val {renderSortIcon('val_score')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('test_score')}
                  >
                    Test {renderSortIcon('test_score')}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody id="predictions-tbody" className="divide-y divide-gray-200">
                {predictions.length === 0 ? (
                  <tr><td colSpan={10} className="py-8 px-4 text-center text-gray-500">No predictions found</td></tr>
                ) : (
                  predictions.map((r: any) => {
                    const uid = getUniqueId(r);
                    const id = r.id || '-';
                    const date = r._date || '';
                    const datasetName = r.dataset_name || '-';
                    const modelName = r.model_name || '-';
                    const partitionName = r.partition || '-';
                    const foldId = r.fold_id || '-';
                    const valScore = formatScore(r.val_score);
                    const testScore = formatScore(r.test_score);
                    const isFinetuned = r.best_params && r.best_params !== '{}';

                    return (
                      <tr key={uid} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected(r)}
                            onChange={(e) => toggleSelect(r, e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{date}</td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {id}
                          {isFinetuned && (
                            <span title="Fine-tuned">
                              <Settings className="w-3 h-3 inline ml-1 text-blue-600" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">{datasetName}</td>
                        <td className="py-3 px-4 text-sm">{modelName}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            partitionName === 'test' ? 'bg-green-100 text-green-800' :
                            partitionName === 'val' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {partitionName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-gray-600">{foldId}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{valScore}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{testScore}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              title="View details"
                              onClick={() => showToast('Prediction details view coming soon', 'info')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-purple-600 hover:text-purple-800"
                              title="View pipeline"
                              onClick={() => navigate('/pipeline')}
                            >
                              <GitBranch className="w-4 h-4" />
                            </button>
                            <button
                              className="text-green-600 hover:text-green-800"
                              title="Save to CSV"
                              onClick={() => console.log('Save:', id)}
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                              onClick={async () => {
                                if (confirm(`Delete prediction ${id}?`)) {
                                  try {
                                    await apiClient.deletePrediction(id);
                                    showToast(`Deleted prediction ${id}`, 'info');
                                    fetchPredictions();
                                  } catch (err) {
                                    showToast('Failed to delete prediction', 'error');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
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

          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between items-center">
              <button onClick={() => { if (page > 1) { setPage(page - 1); fetchPredictions({ page: page - 1 }); } }} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Previous</button>

              <div className="hidden md:flex" id="pred-pages">
                {getPageRange().map((pNum) => (
                  <button key={pNum} onClick={() => { setPage(pNum); fetchPredictions({ page: pNum }); }} className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 ${pNum === page ? 'bg-gray-100' : ''}`}>{pNum}</button>
                ))}
              </div>

              <button onClick={() => { if (page < totalPages) { setPage(page + 1); fetchPredictions({ page: page + 1 }); } }} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionsPage;
