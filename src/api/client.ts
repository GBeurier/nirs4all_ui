// API Client for FastAPI backend
// When developing with Vite, use a relative base URL so the Vite dev server
// proxy forwards requests to the backend and avoids CORS in the browser.
// import.meta.env.DEV is provided by Vite (true in dev server).
const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Workspace API
  async getWorkspace(): Promise<{ datasets: any[] }> {
    return this.request('/api/workspace');
  }

  async linkDataset(path: string, config?: any): Promise<any> {
    return this.request('/api/workspace/link', {
      method: 'POST',
      body: JSON.stringify({ path, config }),
    });
  }

  async unlinkDataset(datasetId: string): Promise<any> {
    return this.request(`/api/workspace/unlink/${datasetId}`, {
      method: 'DELETE',
    });
  }

  async getDatasetConfig(datasetId: string): Promise<any> {
    return this.request(`/api/workspace/dataset/${datasetId}/config`);
  }

  async updateDatasetConfig(datasetId: string, config: any): Promise<any> {
    return this.request(`/api/workspace/dataset/${datasetId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async detectDatasetFiles(datasetId: string): Promise<any> {
    return this.request(`/api/workspace/dataset/${datasetId}/detect-files`, {
      method: 'POST',
    });
  }

  async loadDataset(datasetId: string, config: any, files: any[]): Promise<any> {
    return this.request(`/api/workspace/dataset/${datasetId}/load`, {
      method: 'POST',
      body: JSON.stringify({ config, files }),
    });
  }

  async refreshDataset(datasetId: string): Promise<any> {
    return this.request(`/api/datasets/${datasetId}/refresh`, {
      method: 'POST',
    });
  }

  // Groups API
  async getGroups(): Promise<{ groups: any[] }> {
    return this.request('/api/workspace/groups');
  }

  async createGroup(name: string): Promise<any> {
    return this.request('/api/workspace/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async renameGroup(groupId: string, newName: string): Promise<any> {
    return this.request(`/api/workspace/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    });
  }

  async deleteGroup(groupId: string): Promise<any> {
    return this.request(`/api/workspace/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async addDatasetToGroup(groupId: string, datasetId: string): Promise<any> {
    return this.request(`/api/workspace/groups/${groupId}/datasets`, {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId }),
    });
  }

  async removeDatasetFromGroup(groupId: string, datasetId: string): Promise<any> {
    return this.request(`/api/workspace/groups/${groupId}/datasets/${datasetId}`, {
      method: 'DELETE',
    });
  }

  // Files API
  async browseDirectory(path?: string) {
    const endpoint = path ? `/api/files/browse?path=${encodeURIComponent(path)}` : '/api/files/browse';
    return this.request(endpoint);
  }

  async selectFile() {
    return this.request('/api/files/select');
  }

  async selectFolder() {
    return this.request('/api/files/select-folder');
  }

  // Predictions API
  async getPredictions(): Promise<any> {
    return this.request('/api/predictions');
  }

  async searchPredictions(params: Record<string, any>): Promise<any> {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    const endpoint = `/api/predictions/search?${q.toString()}`;
    return this.request(endpoint);
  }

  async getPredictionsMeta(): Promise<any> {
    return this.request('/api/predictions/meta');
  }

  async getPredictionsDatasets(): Promise<any> {
    return this.request('/api/predictions/datasets');
  }

  async loadPipelineFromPrediction(predictionId: string): Promise<any> {
    return this.request(`/api/pipeline/from-prediction?prediction_id=${encodeURIComponent(predictionId)}`);
  }

  async runPrediction(config: any): Promise<any> {
    return this.request('/api/predictions/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async deletePrediction(predictionId: string): Promise<any> {
    return this.request(`/api/predictions/${predictionId}`, {
      method: 'DELETE',
    });
  }

  // Saved pipelines API
  async listPipelines(): Promise<{ pipelines: any[] }> {
    return this.request('/api/pipelines');
  }

  async getPipeline(pipelineId: string): Promise<any> {
    return this.request(`/api/pipelines/${encodeURIComponent(pipelineId)}`);
  }

  async savePipeline(name: string, description: string, pipeline: any): Promise<any> {
    return this.request('/api/pipelines', {
      method: 'POST',
      body: JSON.stringify({ name, description, pipeline }),
    });
  }

  async saveFile(path: string, content: string): Promise<any> {
    return this.request('/api/files/save', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  // Workspace selection
  async selectWorkspace(path: string, options: { create?: boolean; persist_global?: boolean; persist_env?: boolean } = {}) {
    return this.request('/api/workspace/select', {
      method: 'POST',
      body: JSON.stringify({ path, ...options }),
    });
  }

  // Predictions counts
  async getPredictionsCounts(): Promise<any> {
    return this.request('/api/predictions/counts');
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
