import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { de } from '../i18n/de';
import { BackIcon, ChartIcon, DashboardIcon, ItemsIcon, SettingsIcon } from './icons';

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

/** Zurück zur vorherigen Seite der App (Fallback: Dashboard). */
export const BACK_TO_PREVIOUS = Symbol('back');

interface PageProps {
  title: string;
  /** Pfad für den Zurück-Pfeil in der Kopfzeile oder `BACK_TO_PREVIOUS`. */
  back?: string | typeof BACK_TO_PREVIOUS;
  /** Aktionen rechts in der Kopfzeile. */
  actions?: ReactNode;
  children: ReactNode;
}

function BackButton() {
  const navigate = useNavigate();
  // React Router führt in history.state einen Index; 0 = Einstieg direkt auf dieser Seite.
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  return (
    <button
      type="button"
      className="icon-btn header-back"
      aria-label={de.common.back}
      onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
    >
      <BackIcon />
    </button>
  );
}

/** Seitenrahmen: Kopfzeile mit Titel + scrollbarer Inhalt. */
export function Page({ title, back, actions, children }: PageProps) {
  return (
    <>
      <header className="app-header">
        {back === BACK_TO_PREVIOUS ? (
          <BackButton />
        ) : (
          back && (
            <Link to={back} className="icon-btn header-back" aria-label={de.common.back}>
              <BackIcon />
            </Link>
          )
        )}
        <h1>{title}</h1>
        {actions && <div className="header-actions">{actions}</div>}
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
