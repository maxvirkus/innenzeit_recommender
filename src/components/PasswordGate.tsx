import { useState } from 'react';
import { login } from '../api';

interface Props {
  onAuthenticated: () => void;
}

/** Simple password gate. Real check happens server-side via /api/login. */
export function PasswordGate({ onAuthenticated }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
      onAuthenticated();
    } catch {
      setError('Falsches Passwort.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gate">
      <form className="card gate-card" onSubmit={submit}>
        <h1>Innenzeit Recommender</h1>
        <p className="intro">Bitte Passwort eingeben, um fortzufahren.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          autoFocus
        />
        {error && <p className="gate-error">{error}</p>}
        <button type="submit" className="btn" disabled={loading || !password}>
          {loading ? 'Prüfe…' : 'Einloggen'}
        </button>
      </form>
    </div>
  );
}
