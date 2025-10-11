import { Outlet, NavLink } from 'react-router-dom';
import { Activity, Folder, GitBranch, Database, BarChart2, Layers } from 'feather-icons-react';

const Layout = () => {
  const navItems = [
    { path: '/workspace', label: 'Workspace', icon: Folder },
    { path: '/pipeline', label: 'Pipeline Editor', icon: GitBranch },
    { path: '/predictions', label: 'Predictions DB', icon: Database },
    { path: '/dashboard', label: 'Prediction Dashboard', icon: BarChart2 },
    { path: '/analysis', label: 'Analysis Tools', icon: Layers },
  ];

  return (
    <div className="flex h-screen">
      {/* Navigation Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center">
            <Activity className="mr-2 text-blue-600" size={24} />
            NIRS4ALL
          </h1>
          <p className="text-sm text-gray-600 mt-1">NIRS Analysis Platform</p>
        </div>
        <nav className="mt-6">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-item flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 transition-colors ${
                  isActive ? 'active' : ''
                }`
              }
            >
              <Icon className="mr-3" size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
