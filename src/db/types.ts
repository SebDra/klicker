export type ItemType = 'counter' | 'value';

/** Ein Eingabefeld eines Wert-Items, z. B. „Systole“ in mmHg. */
export interface ValueField {
  /** Stabiler Schlüssel; bleibt bei Umbenennung gleich, damit alte Einträge zuordenbar bleiben. */
  key: string;
  name: string;
  unit?: string;
  min?: number;
  max?: number;
  /** Nachkommastellen 0..3 */
  decimals: number;
}

export interface Item {
  id: string;
  name: string;
  label?: string;
  memo?: string;
  icon: string;
  type: ItemType;
  fields: ValueField[];
  dailyReset: boolean;
  favorite: boolean;
  sortOrder: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Eine Aktivierung eines Items. */
export interface Entry {
  id: string;
  itemId: string;
  /** Zeitpunkt der Aktivierung (ms seit Epoch), kann rückdatiert sein. */
  timestamp: number;
  values?: Record<string, number>;
  note?: string;
  createdAt: number;
}

/** Vom Nutzer bearbeitbare Eigenschaften eines Items. */
export type ItemDraft = Pick<
  Item,
  'name' | 'label' | 'memo' | 'icon' | 'type' | 'fields' | 'dailyReset' | 'favorite'
>;

export const LIMITS = {
  name: 60,
  label: 20,
  memo: 2000,
  fieldName: 30,
  unit: 12,
  maxFields: 6,
  maxDecimals: 3,
  note: 500,
} as const;
