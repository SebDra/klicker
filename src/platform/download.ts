/**
 * Speichert eine Datei. Auf Mobilgeräten wird – wenn unterstützt – das Teilen-Menü
 * angeboten (iOS: „In Dateien sichern“, Mail, Cloud …), sonst klassischer Download.
 * Gibt `false` zurück, wenn der Nutzer das Teilen abgebrochen hat.
 */
export async function saveFile(
  name: string,
  mime: string,
  content: string,
  preferShare: boolean,
): Promise<boolean> {
  const blob = new Blob([content], { type: mime });

  if (preferShare && typeof navigator.canShare === 'function') {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return true;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return false;
        // andere Fehler (z. B. nicht erlaubt) → auf Download ausweichen
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export function readFileAsText(file: File): Promise<string> {
  // File.text() fehlt in älteren Safari-Versionen
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
