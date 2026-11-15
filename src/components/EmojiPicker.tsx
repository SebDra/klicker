import { useMemo, useState } from 'react';
import { EMOJI_CATEGORIES } from '../data/emojis';
import { firstGrapheme } from '../domain/item';
import { de } from '../i18n/de';
import { BottomSheet } from './BottomSheet';

interface Props {
  open: boolean;
  value: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ open, value, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_CATEGORIES;
    return EMOJI_CATEGORIES.map((c) => ({
      ...c,
      emojis: c.emojis.filter(([, kw]) => kw.includes(q)),
    })).filter((c) => c.emojis.length > 0);
  }, [query]);

  const pick = (emoji: string) => {
    onSelect(emoji);
    setQuery('');
    setCustom('');
    onClose();
  };

  const customEmoji = firstGrapheme(custom);

  return (
    <BottomSheet open={open} title={de.emoji.title} onClose={onClose}>
      <input
        type="search"
        className="input"
        placeholder={de.emoji.search}
        aria-label={de.emoji.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="emoji-custom">
        <input
          className="input"
          aria-label={de.emoji.custom}
          placeholder={de.emoji.custom}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary"
          disabled={!customEmoji}
          onClick={() => pick(customEmoji)}
        >
          {de.emoji.use} {customEmoji}
        </button>
      </div>

      {categories.length === 0 && <p className="hint">{de.emoji.noResults}</p>}
      {categories.map((c) => (
        <section key={c.name} className="emoji-section">
          <h3>{c.name}</h3>
          <div className="emoji-grid">
            {c.emojis.map(([emoji, kw]) => (
              <button
                key={emoji}
                type="button"
                className={`emoji-btn${emoji === value ? ' selected' : ''}`}
                aria-label={kw.split(' ')[0]}
                aria-pressed={emoji === value}
                onClick={() => pick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>
      ))}
    </BottomSheet>
  );
}
