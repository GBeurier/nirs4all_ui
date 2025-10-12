import { Outlet, NavLink } from 'react-router-dom';
import { Folder, GitBranch, Database, BarChart2, Layers } from 'feather-icons-react';

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
      {/* Navigation Sidebar - styled to match mockup */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-center">
              <img
          src="/nirs4all.png"
          alt="nirs4all"
          className="h-32 w-auto"
              />
            </div>
        </div>

        <nav className="mt-6 nav-sidebar">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-item flex items-center w-full px-6 py-3 rounded-r-lg transition-colors ${isActive ? 'bg-blue-600 text-white active' : 'text-gray-700 hover:bg-blue-50'}`}
            >
              {({ isActive }) => (
                <>
                  {/* Circular icon background to make the active state obvious. Background is handled
                      both by inline style and by the active class so the icon circle and svg stroke
                      always follow the active state */}
                  <span
                    className={`mr-3 inline-flex items-center justify-center w-10 h-10 rounded-full icon-bg ${isActive ? 'text-white' : 'text-gray-500'}`}
                    style={{ backgroundColor: isActive ? '#1d4ed8' : 'transparent' }}
                  >
                    <Icon stroke="currentColor" fill="none" className="w-5 h-5" />
                  </span>
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>{label}</span>
                </>
              )}
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
