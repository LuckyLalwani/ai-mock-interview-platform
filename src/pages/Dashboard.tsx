import { useEffect, useState } from 'react';
import { Link } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Interview } from '@/types';
import { Plus, Zap, Settings2, Clock, CheckCircle2, XCircle, Loader2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, totalMinutes: 0 });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const { data } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setInterviews(data as Interview[]);
        const completed = data.filter((i) => i.status === 'completed');
        const totalMinutes = completed.reduce((sum, i) => sum + Math.round((i.duration_seconds ?? 0) / 60), 0);
        setStats({ total: data.length, completed: completed.length, totalMinutes });
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const statusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    }
    if (status === 'abandoned') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          <XCircle className="h-3 w-3" /> Abandoned
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-700">
        <Loader2 className="h-3 w-3 animate-spin" /> In progress
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.display_name || 'there'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">Ready for your next practice session?</p>
        </div>
        <div className="flex gap-2">
          <Link to="/quick" className="btn-secondary">
            <Zap className="h-4 w-4" /> Quick Mock
          </Link>
          <Link to="/create" className="btn-primary">
            <Plus className="h-4 w-4" /> New Interview
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Calendar className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Interviews taken</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50">
              <CheckCircle2 className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed sessions</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Clock className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMinutes}m</p>
              <p className="text-sm text-gray-500">Total practice time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent interviews */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent interviews</h2>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-3 w-48" />
              </div>
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="mt-4 card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Settings2 className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No interviews yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start your first practice interview to see it here.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/quick" className="btn-secondary">
                <Zap className="h-4 w-4" /> Quick Mock
              </Link>
              <Link to="/create" className="btn-primary">
                <Plus className="h-4 w-4" /> Create Interview
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {interviews.map((interview) => (
              <Link
                key={interview.id}
                to={
                  interview.status === 'completed'
                    ? `/summary/${interview.id}`
                    : `/interview/${interview.id}`
                }
                className="card block w-full p-5 transition-all duration-200 hover:border-primary-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 capitalize">
                      {interview.type === 'quick' ? <Zap className="h-3 w-3" /> : <Settings2 className="h-3 w-3" />}
                      {interview.type}
                    </span>
                    {statusBadge(interview.status)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {interview.topics.join(', ') || 'General'}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(interview.created_at)}
                      </span>
                      {interview.role && <span>Role: {interview.role}</span>}
                      {interview.experience_level && <span>Level: {interview.experience_level}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {interview.status === 'completed' ? formatDuration(interview.duration_seconds) : `${interview.planned_duration}m planned`}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
