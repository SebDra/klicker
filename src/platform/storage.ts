/** Fragt dauerhaften Speicher an (Browser löschen die Daten dann nicht bei Platzmangel). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean | undefined> {
  try {
    return navigator.storage?.persisted ? await navigator.storage.persisted() : undefined;
  } catch {
    return undefined;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | undefined> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e?.usage !== undefined && e.quota !== undefined
      ? { usage: e.usage, quota: e.quota }
      : undefined;
  } catch {
    return undefined;
  }
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toLocaleString('de-DE', { maximumFractionDigits: u === 0 ? 0 : 1 })} ${units[u]}`;
}
