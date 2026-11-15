import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('zeigt das Dashboard als Startseite', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('navigiert über die untere Leiste', async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });

    for (const name of ['Items', 'Diagramm', 'Einstellungen']) {
      await user.click(within(nav).getByRole('link', { name }));
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });
});
