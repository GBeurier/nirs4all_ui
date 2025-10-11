import { useEffect, useState } from 'react';
import { Download, Trash2, FileText, Repeat } from 'feather-icons-react';
import { apiClient } from '../api/client';
import type { Prediction } from '../types';
import { useNavigate } from 'react-router-dom';

const PredictionsPage = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState('');
  const [dataset, setDataset] = useState('');
  const [model, setModel] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        date_from: opts.date_from ?? dateFrom,
        date_to: opts.date_to ?? dateTo,
        include_arrays: 'false',
      };
      if (opts.sort_by !== undefined || sortBy) params.sort_by = opts.sort_by ?? sortBy;
      if (opts.sort_dir !== undefined || sortDir) params.sort_dir = opts.sort_dir ?? sortDir;

      const res = await apiClient.searchPredictions(params);
      setPredictions(res.predictions || []);
      setPage(res.page || params.page);
      setPageSize(res.page_size || params.page_size);
      setTotal(res.total || 0);
      setSelectedIds(new Set());
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
      await Promise.all(Array.from(selectedIds).map((id) => apiClient.deletePrediction(id)));
      showToast('Deleted selected predictions', 'info');
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

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const renderScoreBadge = (score: any) => {
    if (score === '-' || score === undefined || score === null || isNaN(Number(score))) {
      return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">-</span>;
    }
    const s = Number(score);
    const cls = s >= 0.9 ? 'bg-green-100 text-green-800' : s >= 0.75 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
    return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{String(score)}</span>;
  };

  const handleReplay = async (id: string) => {
    try {
      const res = await apiClient.loadPipelineFromPrediction(id);
      // store pipeline in session storage so pipeline page can pick it up on load
      if (res && res.pipeline) {
        try { sessionStorage.setItem('pipeline_from_prediction', JSON.stringify(res.pipeline)); } catch (e) {}
        navigate('/pipeline?prediction_id=' + encodeURIComponent(id));
      } else {
        showToast('No pipeline returned by server', 'error');
      }
    } catch (err) {
      console.error('Failed to load pipeline from prediction', err);
      showToast('Failed to load pipeline: ' + (err as any).message || String(err), 'error');
    }
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      fetchPredictions({ sort_by: key, sort_dir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      setSortBy(key);
      setSortDir('desc');
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search predictions..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchPredictions({ page: 1 }))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />

            <select value={dataset} onChange={(e) => setDataset(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">All Datasets</option>
              {datasetsList.map((d: any) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>

            <select value={model} onChange={(e) => setModel(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="">All Models</option>
              {(meta.models || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>

            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>

          <div className="flex justify-between items-center">
            <span id="predictions-count" className="text-sm text-gray-600">{loading ? 'Loading...' : `${total} predictions found`}</span>
            <div className="flex space-x-2">
              <button onClick={handleExport} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={handleDeleteSelected} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => fetchPredictions({ page: 1 })} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700"> <input type="checkbox" className="rounded" onChange={(e) => { const checked = e.target.checked; if (checked) { setSelectedIds(new Set(predictions.map((p: any) => p.id || p.run_id))); } else { setSelectedIds(new Set()); } }} /> </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 sortable" onClick={() => handleSort('_date')}>Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 sortable" onClick={() => handleSort('id')}>Run ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 sortable" onClick={() => handleSort('dataset_name')}>Dataset</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 sortable" onClick={() => handleSort('test_score')}>Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 sortable" onClick={() => handleSort('model_name')}>Model</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody id="predictions-tbody" className="divide-y divide-gray-200">
                {predictions.length === 0 ? (
                  <tr><td colSpan={7} className="py-3 px-4">No predictions found</td></tr>
                ) : (
                  predictions.map((r: any) => {
                    const id = r.id || r.run_id || '-';
                    const date = r._date || '';
                    const datasetName = r.dataset_name || r.dataset_path || '-';
                    const modelName = r.model_name || r.model_classname || '-';
                    const score = r.test_score ?? r.val_score ?? r.train_score ?? '-';
                    const truncated = r._arrays_stripped;

                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(id)} onChange={(e) => toggleSelect(id, e.target.checked)} className="rounded" /></td>
                        <td className="py-3 px-4">{date}</td>
                        <td className="py-3 px-4 font-mono text-sm">{id} {truncated ? <span title="Some arrays were omitted to keep payload small" className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">truncated</span> : ''}</td>
                        <td className="py-3 px-4">{datasetName}</td>
                        <td className="py-3 px-4">{renderScoreBadge(score)}</td>
                        <td className="py-3 px-4">{modelName}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800" title="Go to Report" onClick={() => navigate('/pipeline?prediction_id=' + encodeURIComponent(id))}>
                              <FileText className="w-4 h-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-800" title="Replay" onClick={() => handleReplay(id)}>
                              <Repeat className="w-4 h-4" />
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
