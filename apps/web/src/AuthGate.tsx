import { FormEvent, ReactNode, useEffect, useState } from 'react';

type Session = { token: string; user: { firstName: string; lastName: string; email: string; role: string } };

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const value = localStorage.getItem('hospicore.session');
      return value ? JSON.parse(value) : null;
    } catch {
      localStorage.removeItem('hospicore.session');
      localStorage.removeItem('hospicore.token');
      return null;
    }
  });
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(!session);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (session) return;
    fetch('/api/auth/status', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Statut indisponible');
        return response.json();
      })
      .then((data) => setSetupRequired(Boolean(data.setupRequired)))
      .catch(() => setError('Impossible de contacter HospiCore.'))
      .finally(() => setLoading(false));
  }, [session]);

  function saveSession(value: Session) {
    localStorage.setItem('hospicore.session', JSON.stringify(value));
    localStorage.setItem('hospicore.token', value.token);
    setSession(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const submittedEmail = String(body.email ?? '').trim();
    setEmail(submittedEmail);
    const endpoint = setupRequired ? '/api/auth/setup' : '/api/auth/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = String(data.message || 'Connexion impossible.');
        if (setupRequired && message.toLowerCase().includes('déjà terminée')) {
          setSetupRequired(false);
          setError('Le compte administrateur existe déjà. Connectez-vous avec les identifiants utilisés lors de sa création.');
          return;
        }
        setError(message);
        return;
      }
      saveSession(data);
    } catch {
      setError('Impossible de contacter HospiCore. Réessayez dans quelques instants.');
    }
  }

  if (session) return <>{children}</>;
  if (loading) return <div className="auth-loading">Ouverture de HospiCore…</div>;

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-brand"><span>H</span><div><strong>HospiCore</strong><small>Hôtel Paradis · Lourdes</small></div></div>
      <p className="auth-eyebrow">{setupRequired ? 'Première configuration' : 'Espace sécurisé'}</p>
      <h1>{setupRequired ? 'Créez le compte administrateur' : 'Connexion'}</h1>
      <p>{setupRequired ? 'Ce compte sera le premier administrateur de la plateforme.' : 'Accédez au centre opérationnel de l’hôtel.'}</p>
      <form onSubmit={submit}>
        {setupRequired && <div className="auth-name-row"><label>Prénom<input name="firstName" required autoComplete="given-name" /></label><label>Nom<input name="lastName" required autoComplete="family-name" /></label></div>}
        <label>Adresse e-mail<input name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Mot de passe<input name="password" type="password" minLength={10} required autoComplete={setupRequired ? 'new-password' : 'current-password'} /></label>
        {setupRequired && <small className="auth-hint">10 caractères minimum. Conservez ce mot de passe dans un endroit sécurisé.</small>}
        {error && <div className="auth-error">{error}</div>}
        <button type="submit">{setupRequired ? 'Créer le compte et entrer' : 'Se connecter'}</button>
        {!setupRequired && <button type="button" className="auth-secondary" onClick={() => window.location.reload()}>Actualiser l’état du compte</button>}
      </form>
    </section>
  </main>;
}
