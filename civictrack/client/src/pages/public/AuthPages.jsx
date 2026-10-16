import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Eye, EyeOff, ShieldCheck, MapPin, Clock, Sparkles, CheckCircle2,
  ArrowRight, User, Shield, AlertCircle, Map,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../../components/Logo.jsx';
import { Button, Field } from '../../components/ui.jsx';
import { useAuth, homeFor } from '../../context/AuthContext.jsx';
import { get, post } from '../../services/api.js';
import { applyServerErrors, errMsg } from '../../utils/format.js';
import { REGIONS } from '../../utils/constants.js';

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center lg:grid lg:grid-cols-12">
      {/* Left Column: Brand & Value Proposition (Desktop) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-primary via-[#133054] to-[#0d223c] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glow circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <Logo light to="/" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold tracking-wide text-sky-200 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Official Municipal Portal
            </span>
          </div>

          <div className="mt-14">
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Smart Public Issue <br />
              <span className="text-accent">Reporting & Governance.</span>
            </h2>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed max-w-sm">
              Connecting residents, municipal engineers, and regional administrators across dedicated civic jurisdictions.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Citizen Portal</h4>
                  <p className="text-xs text-slate-300">Report civic issues with GPS coordinates, photos, and track resolution timelines.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Regional Administrator</h4>
                  <p className="text-xs text-slate-300">Dedicated administrator per municipal zone to triage, resolve complaints, and track performance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>CivicTrack Smart Platform</span>
          <Link to="/" className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors">
            Back to Home <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex-1 lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="card p-6 sm:p-8 bg-white border border-slate-200/80 shadow-card-elevated"
          >
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-main tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-muted">{subtitle}</p>}
            </div>

            {children}
          </motion.div>

          {footer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-center text-sm text-slate-muted"
            >
              {footer}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PasswordField({ label = 'Password', error, hint, registerProps, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field label={label} type={show ? 'text' : 'password'} error={error} hint={hint} autoComplete={autoComplete} required {...registerProps} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-[34px] rounded p-1 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const ROLES_CONFIG = [
  { key: 'citizen', label: 'Citizen', icon: User, subtitle: 'Log in to report civic problems and track resolutions.' },
  { key: 'admin', label: 'Admin', icon: Shield, subtitle: 'Log in to oversee regional dispatch and resolve complaints.' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');
  const [suggestedRole, setSuggestedRole] = useState(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const activeRoleConfig = ROLES_CONFIG.find((r) => r.key === role) || ROLES_CONFIG[0];

  const onSubmit = async (v) => {
    setError('');
    setSuggestedRole(null);
    try {
      const u = await login({ email: v.email, password: v.password, role });
      navigate(loc.state?.from || homeFor(u.role), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setError(msg);
      // If error mentions another role, suggest switching tab
      if (msg.toLowerCase().includes('citizen')) setSuggestedRole('citizen');
      else if (msg.toLowerCase().includes('administrator') || msg.toLowerCase().includes('admin')) setSuggestedRole('admin');
    }
  };

  return (
    <AuthShell
      title={`${activeRoleConfig.label} Login`}
      subtitle={activeRoleConfig.subtitle}
      footer={
        <>
          Need an account?{' '}
          <Link className="font-semibold text-secondary hover:text-teal-700 hover:underline" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      {/* Role Selector Tabs */}
      <div className="mb-6">
        <label className="label text-[11px] mb-1.5">Select Login Type</label>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          {ROLES_CONFIG.map((r) => {
            const Icon = r.icon;
            const isSelected = role === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => { setRole(r.key); setError(''); setSuggestedRole(null); }}
                className={`relative flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'text-primary font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeAuthLoginTab"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon className={`relative z-10 w-3.5 h-3.5 transition-colors ${isSelected ? 'text-secondary' : 'text-slate-400'}`} />
                <span className="relative z-10">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-2 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {suggestedRole && suggestedRole !== role && (
              <button
                type="button"
                onClick={() => { setRole(suggestedRole); setError(''); setSuggestedRole(null); }}
                className="ml-6 text-xs font-semibold text-primary underline hover:text-secondary block"
              >
                Switch to {suggestedRole.charAt(0).toUpperCase() + suggestedRole.slice(1)} Login →
              </button>
            )}
          </motion.div>
        )}

        <Field
          label="Email address"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }
          })}
        />

        <PasswordField
          autoComplete="current-password"
          error={errors.password?.message}
          registerProps={register('password', { required: 'Password is required' })}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-muted cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300 text-secondary focus:ring-secondary/20" />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-xs font-medium text-secondary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');
  const [options, setOptions] = useState({ departments: [], regions: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm();

  // Load departments and available regions
  useEffect(() => {
    let alive = true;
    setLoadingOptions(true);
    get('/auth/registration-options')
      .then((res) => {
        if (alive && res?.data) {
          setOptions(res.data);
        }
      })
      .catch(() => {
        // Fallback to static regions if endpoint was loading
        if (alive) {
          setOptions({
            departments: [],
            regions: REGIONS.map((r) => ({ name: r, isAssigned: false })),
          });
        }
      })
      .finally(() => {
        if (alive) setLoadingOptions(false);
      });
    return () => { alive = false; };
  }, []);

  const onSubmit = async (v) => {
    setError('');
    try {
      const payload = {
        name: v.name,
        email: v.email,
        phone: v.phone || undefined,
        password: v.password,
        role,
        region: role === 'admin' ? v.region : undefined,
      };

      const u = await signUp(payload);
      navigate(homeFor(u.role), { replace: true });
    } catch (e) {
      if (!applyServerErrors(e, setFieldError, ['name', 'email', 'phone', 'password', 'region'])) {
        setError(errMsg(e));
      } else {
        setError('Please fix the highlighted fields.');
      }
    }
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Register as a Citizen or Regional Administrator."
      footer={
        <>
          Already registered?{' '}
          <Link className="font-semibold text-secondary hover:text-teal-700 hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
    >
      {/* Role Selection Tabs */}
      <div className="mb-6">
        <label className="label text-[11px] mb-1.5">Select Account Type</label>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => { setRole('citizen'); setError(''); }}
            className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              role === 'citizen'
                ? 'text-primary font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {role === 'citizen' && (
              <motion.div
                layoutId="activeAuthRegisterTab"
                className="absolute inset-0 rounded-lg bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <User className={`relative z-10 w-3.5 h-3.5 ${role === 'citizen' ? 'text-secondary' : 'text-slate-400'}`} />
            <span className="relative z-10">Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setError(''); }}
            className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
              role === 'admin'
                ? 'text-primary font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {role === 'admin' && (
              <motion.div
                layoutId="activeAuthRegisterTab"
                className="absolute inset-0 rounded-lg bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Shield className={`relative z-10 w-3.5 h-3.5 ${role === 'admin' ? 'text-secondary' : 'text-slate-400'}`} />
            <span className="relative z-10">Admin</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Admin Policy Notice */}
        {role === 'admin' && (
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
            <div className="flex items-center gap-1.5 font-bold text-sky-950 mb-1">
              <ShieldCheck className="w-4 h-4 text-sky-600" /> One Admin Per Region Rule
            </div>
            <p className="text-slate-600 leading-relaxed">
              Each municipal zone/region allows exactly one registered Administrator. Select an available zone below to claim your jurisdiction.
            </p>
          </div>
        )}

        <Field
          label="Full name"
          autoComplete="name"
          placeholder="e.g. Ramesh Kumar"
          required
          error={errors.name?.message}
          {...register('name', {
            required: 'Name is required',
            minLength: { value: 2, message: 'At least 2 characters' },
            maxLength: { value: 80, message: 'At most 80 characters' }
          })}
        />

        <Field
          label="Official email address"
          type="email"
          autoComplete="email"
          placeholder="ramesh@example.com"
          required
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }
          })}
        />

        <Field
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          error={errors.phone?.message}
          hint="For urgent municipal SMS notifications"
          {...register('phone', {
            pattern: { value: /^[0-9+()\-\s]{7,20}$/, message: 'Enter a valid phone number' }
          })}
        />

        {/* Region Field for Admin (One Admin per Region) */}
        {role === 'admin' && (
          <div>
            <Field
              as="select"
              label="Municipal Zone / Region (1 Admin per Region)"
              required
              error={errors.region?.message}
              hint="Only available regions can be claimed."
              {...register('region', { required: 'Please select an available region' })}
            >
              <option value="">Select your municipal region…</option>
              {options.regions.map((r) => (
                <option key={r.name} value={r.name} disabled={r.isAssigned}>
                  {r.name} {r.isAssigned ? `(Assigned: ${r.adminName || 'Admin'})` : '(Available)'}
                </option>
              ))}
            </Field>
          </div>
        )}

        <PasswordField
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number."
          error={errors.password?.message}
          registerProps={register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Must include a letter and a number'
          })}
        />

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          {role === 'admin' ? 'Register Regional Administrator' : 'Create Citizen Account'}
        </Button>

        <p className="text-xs text-center text-slate-muted">
          By signing up you agree to the{' '}
          <Link className="underline hover:text-slate-main" to="/terms">Terms</Link> and{' '}
          <Link className="underline hover:text-slate-main" to="/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (v) => {
    setError('');
    try {
      await post('/auth/forgot-password', v);
      setDone(true);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email to receive recovery instructions."
      footer={
        <Link className="font-semibold text-secondary hover:underline" to="/login">
          ← Back to Log In
        </Link>
      }
    >
      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          role="status"
          className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 leading-relaxed"
        >
          <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reset link dispatched!
          </div>
          If an account exists for that email, reset instructions have been generated.
          <div className="mt-2 text-xs text-emerald-700 bg-white/70 p-2 rounded">
            <strong>Development Notice:</strong> The simulated reset link is logged in the server console.
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <Field
            label="Registered email address"
            type="email"
            placeholder="name@example.com"
            required
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Send Reset Link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const token = new URLSearchParams(useLocation().search).get('token') || '';
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (v) => {
    setError('');
    try {
      await post('/auth/reset-password', { token, password: v.password });
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e?.parsed?.details?.password || errMsg(e));
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        footer={<Link className="underline text-secondary" to="/forgot-password">Request a new reset link</Link>}
      >
        <p className="text-sm text-slate-600">This recovery link is missing its secure token or has expired.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Enter your updated credentials below.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          registerProps={register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' }
          })}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">
          Set New Password
        </Button>
      </form>
    </AuthShell>
  );
}
