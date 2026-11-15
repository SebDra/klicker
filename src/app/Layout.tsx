import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { de } from '../i18n/de';
import { ChartIcon, DashboardIcon, ItemsIcon, SettingsIcon } from './icons';

const navItems: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: de.nav.dashboard, icon: <DashboardIcon /> },
  { to: '/items', label: de.nav.items, icon: <ItemsIcon /> },
  { to: '/chart', label: de.nav.chart, icon: <ChartIcon /> },
  { to: '/settings', label: de.nav.settings, icon: <SettingsIcon /> },
];

export function Layout() {
  return (
    <div className="app">
      <Outlet />
      <nav className="bottom-nav" aria-label={de.nav.label}>
        {navItems.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            {n.icon}
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Seitenrahmen: Kopfzeile mit Titel + scrollbarer Inhalt. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="app-header">
        <h1>{title}</h1>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
