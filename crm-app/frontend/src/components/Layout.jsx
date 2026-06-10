import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLogo from './AppLogo';
import { APP_NAME } from '../config/branding';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/orders', label: 'Orders' },
  { to: '/payments', label: 'Payments' },
  { to: '/products', label: 'Products' },
  { to: '/map', label: 'Map' },
];

const navLinkClass = ({ isActive }) =>
  `block whitespace-nowrap px-3 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base transition-colors ${
    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`;

export default function Layout() {
  const { user, logout, isOwner } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="w-full lg:w-60 bg-slate-900 text-white flex flex-col shrink-0 lg:sticky lg:top-0 lg:h-screen lg:min-h-0">
        <div className="px-4 py-5 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <AppLogo size={48} className="mb-0" />
            <h1 className="text-lg font-bold tracking-tight">{APP_NAME}</h1>
          </div>
          {user?.companyName && (
            <p className="text-sm text-blue-300 mt-1.5 truncate">{user.companyName}</p>
          )}
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {user?.name}
            <span className="text-slate-500"> · </span>
            {user?.role === 'owner' ? 'Owner' : user?.role}
          </p>
        </div>
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden p-2 lg:px-3 lg:py-3 gap-1 lg:gap-0.5 lg:flex-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
          {isOwner && (
            <>
              <NavLink to="/users" className={navLinkClass}>Team & Permissions</NavLink>
              <NavLink to="/delete-requests" className={navLinkClass}>Delete Requests</NavLink>
              <NavLink to="/settings" className={navLinkClass}>Settings</NavLink>
            </>
          )}
        </nav>
        <div className="p-2 lg:px-3 lg:pb-4 flex lg:flex-col gap-1 border-t border-slate-800 mt-auto">
          <NavLink to="/change-password" className={navLinkClass}>Change Password</NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="whitespace-nowrap px-3 py-2.5 sm:py-2 text-sm sm:text-base text-slate-300 hover:bg-slate-800 rounded-lg text-left w-full"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 lg:overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
