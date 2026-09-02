import { Link } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Zap, Settings2, BarChart3, ArrowRight, CheckCircle2, Clock, Target } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600">
            <span className="flex h-2 w-2 rounded-full bg-accent-500" />
            Practice interviews, powered by AI
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Master your next interview
            <br className="hidden sm:block" /> with{' '}
            <span className="text-primary-600">real practice</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Start an instant mock interview or build a custom one tailored to your role and topics.
            Get AI-generated questions and actionable feedback to improve.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={user ? '/quick' : '/signup'}
              className="btn-primary w-full sm:w-auto"
            >
              <Zap className="h-4 w-4" />
              Start Quick Mock Interview
            </Link>
            <Link
              to={user ? '/create' : '/signup'}
              className="btn-secondary w-full sm:w-auto"
            >
              <Settings2 className="h-4 w-4" />
              Create Custom Interview
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Zap className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Instant Mock Interviews</h3>
            <p className="mt-2 text-sm text-gray-600">
              Pick a mode and start practicing immediately. No setup required — just start answering.
            </p>
          </div>
          <div className="card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Target className="h-5 w-5 text-accent-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Custom Interviews</h3>
            <p className="mt-2 text-sm text-gray-600">
              Define your topics, role, and experience level. The AI generates targeted questions for you.
            </p>
          </div>
          <div className="card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-warning-50">
              <BarChart3 className="h-5 w-5 text-warning-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Actionable Feedback</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get a summary of your strengths and areas to improve after every interview session.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">How it works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                1
              </div>
              <h3 className="text-base font-semibold text-gray-900">Choose your interview</h3>
              <p className="mt-2 text-sm text-gray-600">
                Start a quick mock or create a custom interview with your preferred topics and role.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                2
              </div>
              <h3 className="text-base font-semibold text-gray-900">Answer questions</h3>
              <p className="mt-2 text-sm text-gray-600">
                Work through AI-generated questions at your own pace. Type your answers and move forward.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                3
              </div>
              <h3 className="text-base font-semibold text-gray-900">Review feedback</h3>
              <p className="mt-2 text-sm text-gray-600">
                See your strengths and areas to improve, then practice again to keep getting better.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link to={user ? '/dashboard' : '/signup'} className="btn-primary">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: CheckCircle2, label: 'No setup required', desc: 'Start practicing in seconds' },
            { icon: Clock, label: 'Practice at your pace', desc: '15, 30, or 45 minute sessions' },
            { icon: Target, label: 'Tailored to you', desc: 'Questions match your topics and level' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
