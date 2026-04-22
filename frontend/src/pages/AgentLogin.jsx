import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { agentAuthAPI } from '@/services/agentAuth.js';
import { useAgentStore } from '@/store/agentStore.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, extra }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {extra}
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }) {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await agentAuthAPI.login({ email: form.email, password: form.password });
      onSuccess(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Work email"
        type="email"
        value={form.email}
        onChange={set('email')}
        placeholder="alice@company.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        type="password"
        value={form.password}
        onChange={set('password')}
        placeholder="••••••••"
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

// ─── Signup form ──────────────────────────────────────────────────────────────
function SignupForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', max_conversations: '10',
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await agentAuthAPI.signup({
        name:              form.name.trim(),
        email:             form.email.trim().toLowerCase(),
        password:          form.password,
        max_conversations: parseInt(form.max_conversations, 10) || 10,
      });
      toast.success('Account created!');
      onSuccess(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name"   type="text"     value={form.name}     onChange={set('name')}     placeholder="Alice Chen"           autoComplete="name" />
      <Field label="Work email"  type="email"    value={form.email}    onChange={set('email')}    placeholder="alice@company.com"    autoComplete="email" />
      <Field label="Password"    type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters"    autoComplete="new-password" />
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Max simultaneous conversations
        </label>
        <input
          type="number"
          min={1}
          max={50}
          value={form.max_conversations}
          onChange={set('max_conversations')}
          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all"
        />
        <p className="text-[11px] text-slate-400 mt-1">Used by the auto-assignment algorithm</p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-xl transition-colors shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {loading ? 'Creating account…' : 'Create agent account'}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AgentLogin() {
  const [tab, setTab]     = useState('login');
  const navigate          = useNavigate();
  const { setCurrentAgent } = useAgentStore();

  const onSuccess = (agent) => {
    setCurrentAgent(agent);
    navigate('/agent', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">ConvoPilot</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Agent workspace</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-slate-100">
            {[
              { id: 'login',  label: 'Sign in' },
              { id: 'signup', label: 'Create account' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  'flex-1 py-3.5 text-sm font-bold transition-colors border-b-2',
                  tab === id
                    ? 'text-indigo-600 border-indigo-600 bg-indigo-50/40'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form body */}
          <div className="p-6">
            {tab === 'login'
              ? <LoginForm  onSuccess={onSuccess} />
              : <SignupForm onSuccess={onSuccess} />
            }
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-slate-400 mt-5 font-medium">
          {tab === 'login'
            ? <>New here?{' '}<button onClick={() => setTab('signup')} className="text-indigo-500 hover:text-indigo-700 font-semibold">Create an agent account</button></>
            : <>Already have one?{' '}<button onClick={() => setTab('login')} className="text-indigo-500 hover:text-indigo-700 font-semibold">Sign in</button></>
          }
        </p>
      </div>
    </div>
  );
}
