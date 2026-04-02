import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import '../styles/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // O PrivateRoute se encarregará do redirecionamento se necessário, 
      // mas o padrão é o dashboard.
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-blob blob-1"></div>
      <div className="login-bg-blob blob-2"></div>
      
      <div className="login-card">
        <div className="login-logo">
          <h1>Super <span>Orçamentos</span></h1>
          <p>Gestão Profissional para Óticas</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label className="login-label">E-mail de Acesso</label>
            <div className="login-input-wrapper">
              <Mail className="login-input-icon" size={18} />
              <input
                type="email"
                required
                className="login-input"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-label">Sua Senha</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={18} />
              <input
                type="password"
                required
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/" className="login-back-link">
            <ArrowLeft size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
