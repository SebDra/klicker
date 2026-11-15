import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Page } from '../../app/Layout';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Toast } from '../../components/Toast';
import { deleteAll, importBackup, readAll, type ImportMode } from '../../db/backupRepository';
import { db } from '../../db/db';
import {
  backupFileName,
  createBackup,
  entriesToCsv,
  parseBackup,
  type Backup,
} from '../../domain/backup';
import { formatWhen } from '../../domain/time';
import { de } from '../../i18n/de';
import { readFileAsText, saveFile } from '../../platform/download';
import { isIOS, isMobile, isStandalone, useInstallPrompt } from '../../platform/install';
import { getNumberPref, PREF, setPref } from '../../platform/prefs';
import {
  formatBytes,
  isPersisted,
  requestPersistence,
  storageEstimate,
} from '../../platform/storage';
import { getTheme, setTheme, type ThemeChoice } from '../../platform/theme';

export function SettingsPage() {
  const counts = useLiveQuery(
    async () => ({ items: await db.items.count(), entries: await db.entries.count() }),
    [],
  );
  const [theme, setThemeState] = useState<ThemeChoice>(getTheme);
  const [lastBackup, setLastBackup] = useState(() => getNumberPref(PREF.lastBackup));
  const [toast, setToast] = useState<{ key: number; message: string } | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [mode, setMode] = useState<ImportMode>('replace');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const notify = (message: string) => setToast({ key: Date.now(), message });
  const items = counts?.items ?? 0;
  const entries = counts?.entries ?? 0;

  async function exportJson() {
    setBusy(true);
    try {
      const data = await readAll();
      const backup = createBackup(data.items, data.entries, __APP_VERSION__);
      const saved = await saveFile(
        backupFileName('json'),
        'application/json',
        JSON.stringify(backup, null, 1),
        isMobile(),
      );
      if (saved) {
        const now = Date.now();
        setPref(PREF.lastBackup, String(now));
        setLastBackup(now);
        notify(de.settings.exported);
      }
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    const data = await readAll();
    const saved = await saveFile(
      backupFileName('csv'),
      'text/csv;charset=utf-8',
      entriesToCsv(data.items, data.entries),
      isMobile(),
    );
    if (saved) notify(de.settings.exportedCsv);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // gleiche Datei erneut wählbar
    if (!file) return;
    const result = parseBackup(await readFileAsText(file));
    if (!result.ok) {
      notify(`${de.settings.importFailed}: ${result.error}`);
      return;
    }
    setMode(items === 0 ? 'replace' : 'merge');
    setPending(result.backup);
  }

  async function confirmImport() {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending, mode);
      notify(de.settings.imported(pending.items.length, pending.entries.length));
    } catch {
      notify(de.settings.importFailed);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  async function onDeleteAll() {
    await deleteAll();
    setConfirmDelete(false);
    notify(de.settings.deletedAll);
  }

  const exportedAt = pending?.exportedAt ? Date.parse(pending.exportedAt) : NaN;

  return (
    <Page title={de.nav.settings}>
      <div className="settings">
        <section className="settings-section" aria-labelledby="s-appearance">
          <h2 id="s-appearance" className="section-title">
            {de.settings.appearance}
          </h2>
          <div className="segmented" role="radiogroup" aria-label={de.settings.appearance}>
            {(['system', 'light', 'dark'] as ThemeChoice[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => {
                  setTheme(t);
                  setThemeState(t);
                }}
              >
                {de.settings.themes[t]}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="s-backup">
          <h2 id="s-backup" className="section-title">
            {de.settings.backup}
          </h2>
          <div className="card stack">
            <p className="hint">{de.settings.backupWhy}</p>
            <p>
              {lastBackup
                ? de.settings.lastBackup(formatWhen(lastBackup))
                : de.settings.neverBackedUp}
            </p>
            <button
              type="button"
              className="btn primary"
              disabled={busy || items === 0}
              onClick={() => void exportJson()}
            >
              {de.settings.exportJson}
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy || entries === 0}
              onClick={() => void exportCsv()}
            >
              {de.settings.exportCsv}
            </button>
            <label className={`btn secondary${busy ? ' disabled' : ''}`}>
              {de.settings.importJson}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={busy}
                onChange={(e) => void onFile(e)}
              />
            </label>
          </div>
        </section>

        <StorageSection items={items} entries={entries} />
        <InstallSection />

        <section className="settings-section" aria-labelledby="s-danger">
          <h2 id="s-danger" className="section-title">
            {de.settings.danger}
          </h2>
          <button
            type="button"
            className="btn danger-outline"
            disabled={items === 0 && entries === 0}
            onClick={() => setConfirmDelete(true)}
          >
            {de.settings.deleteAll}
          </button>
        </section>

        <section className="settings-section" aria-labelledby="s-about">
          <h2 id="s-about" className="section-title">
            {de.settings.about}
          </h2>
          <div className="card stack">
            <p>{de.settings.storageNote}</p>
            <p className="hint">
              {de.settings.version}: {__APP_VERSION__}
            </p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={de.settings.importTitle}
        confirmLabel={de.settings.importConfirm}
        danger={mode === 'replace' && items > 0}
        onConfirm={() => void confirmImport()}
        onCancel={() => setPending(null)}
      >
        {pending && (
          <div className="stack">
            <p>
              {de.settings.importSummary(
                pending.items.length,
                pending.entries.length,
                Number.isNaN(exportedAt) ? '' : formatWhen(exportedAt),
              )}
            </p>
            {items > 0 && (
              <>
                <div className="segmented" role="radiogroup" aria-label={de.settings.importMode}>
                  {(['merge', 'replace'] as ImportMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                    >
                      {m === 'merge' ? de.settings.importMerge : de.settings.importReplace}
                    </button>
                  ))}
                </div>
                <p>
                  {mode === 'merge'
                    ? de.settings.importMergeHint
                    : de.settings.importReplaceHint(items, entries)}
                </p>
              </>
            )}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDelete}
        title={de.settings.deleteAllTitle}
        confirmLabel={de.settings.deleteAllConfirm}
        danger
        onConfirm={() => void onDeleteAll()}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>{de.settings.deleteAllText(items, entries)}</p>
      </ConfirmDialog>

      {toast && <Toast key={toast.key} message={toast.message} onClose={() => setToast(null)} />}
    </Page>
  );
}

function StorageSection({ items, entries }: { items: number; entries: number }) {
  const [persisted, setPersisted] = useState<boolean | undefined>();
  const [usage, setUsage] = useState<number | undefined>();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let active = true;
    void isPersisted().then((p) => active && setPersisted(p));
    void storageEstimate().then((e) => active && setUsage(e?.usage));
    return () => {
      active = false;
    };
  }, [items, entries]);

  async function request() {
    const ok = await requestPersistence();
    setPersisted(ok);
    setDenied(!ok);
  }

  return (
    <section className="settings-section" aria-labelledby="s-storage">
      <h2 id="s-storage" className="section-title">
        {de.settings.storage}
      </h2>
      <div className="card stack">
        <p>{de.settings.counts(items, entries)}</p>
        {usage !== undefined && <p className="hint">{de.settings.usage(formatBytes(usage))}</p>}
        <p className={persisted === false ? 'warn' : 'hint'}>
          {persisted === undefined
            ? de.settings.persistUnknown
            : persisted
              ? `✓ ${de.settings.persisted}`
              : `⚠️ ${de.settings.notPersisted}`}
        </p>
        {persisted === false && (
          <button type="button" className="btn secondary" onClick={() => void request()}>
            {de.settings.requestPersist}
          </button>
        )}
        {denied && <p className="hint">{de.settings.persistDenied}</p>}
      </div>
    </section>
  );
}

function InstallSection() {
  const install = useInstallPrompt();
  const standalone = isStandalone();

  return (
    <section className="settings-section" aria-labelledby="s-install">
      <h2 id="s-install" className="section-title">
        {de.settings.install}
      </h2>
      <div className="card stack">
        {standalone ? (
          <p>✓ {de.settings.installed}</p>
        ) : install ? (
          <button type="button" className="btn primary" onClick={() => void install()}>
            {de.settings.installButton}
          </button>
        ) : (
          <p>{isIOS() ? de.settings.installIOS : de.settings.installOther}</p>
        )}
      </div>
    </section>
  );
}
