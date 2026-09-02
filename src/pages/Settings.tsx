import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User, Mail, Clock, Briefcase, LogOut, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const ROLES = [
  '', 'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Product Manager', 'Data Analyst', 'Data Scientist', 'DevOps Engineer',
  'Engineering Manager', 'System Design Engineer',
];

const DURATIONS = [15, 30, 45];

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [defaultRole, setDefaultRole] = useState(profile?.default_role ?? '');
  const [defaultDuration, setDefaultDuration] = useState(profile?.default_interview_length ?? 30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        default_role: defaultRole || null,
        default_interview_length: defaultDuration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      setError('Failed to save settings. Please try again.');
    } else {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">Manage your profile and default preferences.</p>

      {/* Profile */}
      <div className="mt-8 card p-6 sm:p-8">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Profile</h2>

        <div className="space-y-5">
          <div>
            <label className="label-text" htmlFor="name">Display name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field pl-10"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label className="label-text" htmlFor="email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                value={user?.email ?? ''}
                disabled
                className="input-field pl-10 bg-gray-50 text-gray-500"
              />
            </div>
            <p className="helper-text">Email cannot be changed.</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="mt-6 card p-6 sm:p-8">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Default preferences</h2>

        <div className="space-y-5">
          <div>
            <label className="label-text" htmlFor="role">Default role</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                id="role"
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value)}
                className="input-field pl-10 cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r || 'Any role'}</option>
                ))}
              </select>
            </div>
            <p className="helper-text">Pre-filled when creating a new interview.</p>
          </div>

          <div>
            <label className="label-text">Default interview length</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDefaultDuration(d)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    defaultDuration === d
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" /> {d} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2.5 text-sm text-success-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Save button */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-error-600"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  );
}
