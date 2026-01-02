import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppStateProvider } from './context/AppStateContext'
import Layout from './components/Layout'
import WorkspacePage from './pages/WorkspacePage'
import PipelinePage from './pages/PipelinePage'
import PredictionsPage from './pages/PredictionsPage'
import DashboardPage from './pages/DashboardPage'
import AnalysisPage from './pages/AnalysisPage'

function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/workspace" replace />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  )
}

export default App
