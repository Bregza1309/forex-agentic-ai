import { Link, useLocation, Outlet } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Wallet,
  GraduationCap,
  Bell,
  Settings,
  TrendingUp,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/portfolio', icon: Wallet, label: 'Portfolio' },
  { to: '/learn', icon: GraduationCap, label: 'Learn' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function ForexLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b bg-card flex items-center px-6 gap-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">Forex AI Assistant</h1>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-1">
          Beta
        </span>
        <p className="ml-auto text-xs text-muted-foreground">
          Data may be delayed. Not financial advice.
        </p>
      </header>

      <div className="flex">
        <aside className="w-56 border-r bg-card min-h-[calc(100vh-3.5rem)] hidden md:block">
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t flex items-center justify-around px-2 z-50">
        {NAV_ITEMS.slice(0, 5).map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 text-[10px] p-1 rounded-md transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
