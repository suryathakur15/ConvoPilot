import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, Zap, BarChart2, Users, Brain } from 'lucide-react';
import { agentAuthAPI } from '@/services/agentAuth.js';
import { useAgentStore } from '@/store/agentStore.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ── Animated stat pills on the left panel ────────────────────────────────────
const STATS = [
  { icon: Zap,       label: 'Avg. response time', value: '< 2 min' },
  { icon: BarChart2, label: 'Tickets resolved',    value: '98.4%'   },
  { icon: Users,     label: 'Active agents',       value: '12'      },
  { icon: Brain,     label: 'Sentiment accuracy',  value: '94%'     },
];

// ── Feature list ──────────────────────────────────────────────────────────────
const FEATURES = [
  'Real-time customer sentiment scoring',
  'AI-powered reply suggestions',
  'Smart ticket auto-assignment',
  'Live agent coaching nudges',
];

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 focus:bg-white/10 transition-all"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
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
      <Field label="Work email"  type="email"    value={form.email}    onChange={set('email')}    placeholder="you@company.com"   autoComplete="email" />
      <Field label="Password"    type="password" value={form.password} onChange={set('password')} placeholder="••••••••"          autoComplete="current-password" />
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30 mt-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {loading ? 'Signing in…' : 'Enter workspace'}
      </button>
    </form>
  );
}

// ── Signup form ───────────────────────────────────────────────────────────────
function SignupForm({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', max_conversations: '10' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { data } = await agentAuthAPI.signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        max_conversations: parseInt(form.max_conversations, 10) || 10,
      });
      toast.success('Welcome to the team!');
      onSuccess(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name"  type="text"     value={form.name}     onChange={set('name')}     placeholder="Alice Chen"        autoComplete="name" />
      <Field label="Work email" type="email"    value={form.email}    onChange={set('email')}    placeholder="you@company.com"   autoComplete="email" />
      <Field label="Password"   type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" autoComplete="new-password" />
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Max concurrent tickets
        </label>
        <input
          type="number" min={1} max={50}
          value={form.max_conversations}
          onChange={set('max_conversations')}
          className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 focus:bg-white/10 transition-all"
        />
        <p className="text-[11px] text-slate-600">Used by the auto-assignment algorithm</p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30 mt-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {loading ? 'Setting up…' : 'Join the team'}
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgentLogin() {
  const [tab, setTab] = useState('login');
  const navigate = useNavigate();
  const { setCurrentAgent } = useAgentStore();

  const onSuccess = agent => {
    setCurrentAgent(agent);
    navigate('/agent', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex overflow-hidden">

      {/* ── Left panel — dark hero ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[100px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">ConvoPilot</span>
          <span className="text-xs font-semibold text-indigo-400 border border-indigo-400/30 bg-indigo-400/10 px-2 py-0.5 rounded-full">Agent</span>
        </div>

        {/* Main copy */}
        <div className="relative space-y-8">
          <div>
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Your customers<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                feel everything.
              </span>
              <br />
              Now you do too.
            </h1>
            <p className="text-slate-400 text-base mt-5 leading-relaxed max-w-md">
              ConvoPilot scores customer sentiment live, coaches you in real time, and suggests the perfect reply — so every conversation ends on a high note.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </div>
                {f}
              </li>
            ))}
          </ul>

          {/* Stat pills */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-2xl p-4 backdrop-blur-sm">
                <Icon className="w-4 h-4 text-indigo-400 mb-2" />
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          Built by Surya Thakur · <a href="mailto:suryapratap1515@gmail.com" className="hover:text-slate-400 transition-colors">suryapratap1515@gmail.com</a>
        </p>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle right-side glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d18] to-[#0a0a0f] pointer-events-none" />

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">ConvoPilot</span>
            <span className="text-xs text-indigo-400 border border-indigo-400/30 px-2 py-0.5 rounded-full">Agent</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">
              {tab === 'login' ? 'Welcome back' : 'Join your team'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {tab === 'login'
                ? 'Sign in to your agent workspace.'
                : 'Any email works — this is a demo environment.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-white/5 border border-white/8 rounded-xl p-1 mb-6">
            {[{ id: 'login', label: 'Sign in' }, { id: 'signup', label: 'Create account' }].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
                  tab === id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          {tab === 'login' ? <LoginForm onSuccess={onSuccess} /> : <SignupForm onSuccess={onSuccess} />}

          {/* Demo note */}
          <div className="mt-5 p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
            <p className="text-[11px] text-indigo-300/70 text-center leading-5">
              🎭 <strong className="text-indigo-300">Demo mode</strong> — use any email & password to create an agent account. No real credentials needed.
            </p>
          </div>

          <p className="text-center text-xs text-slate-700 mt-5">
            {tab === 'login'
              ? <><span>New here? </span><button onClick={() => setTab('signup')} className="text-indigo-400 hover:text-indigo-300 font-semibold">Create an account →</button></>
              : <><span>Already have one? </span><button onClick={() => setTab('login')} className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign in →</button></>
            }
          </p>
        </div>
      </div>
    </div>
  );
}
