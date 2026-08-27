import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Wallet,
  ShieldCheck,
  Users,
  Zap,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    icon: Briefcase,
    title: 'Find Micro Tasks',
    description:
      'Discover simple digital tasks that match your skills and available time.',
  },
  {
    icon: Wallet,
    title: 'Track Your Rewards',
    description:
      'Keep track of completed tasks, pending reviews, and your available balance.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Workflow',
    description:
      'Tasks and submissions follow a structured verification process for better transparency.',
  },
  {
    icon: Zap,
    title: 'Simple & Fast',
    description:
      'A mobile-friendly platform designed to make finding and completing tasks simple.',
  },
]

const steps = [
  'Create your free account',
  'Browse available tasks',
  'Complete the task instructions',
  'Submit your work for review',
  'Receive your reward after approval',
]

export default function Home() {
  const { user, role, loading } = useAuth()

  // যদি ইউজার অলরেডি লগইন করা থাকে, তাকে ড্যাশবোর্ডে পাঠিয়ে দিন
  if (!loading && user) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to={role === 'employer' ? '/employer' : '/worker'} replace />
  }

  return (
    <main className="min-h-screen bg-base-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-mint-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              <span className="h-2 w-2 rounded-full bg-mint-400" />
              A simple digital micro-task marketplace
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl">
              Complete Tasks.
              <span className="block text-mint-400">Earn Digitally.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
              Taskly connects digital workers with micro-tasks and helps
              employers reach people who can complete their tasks efficiently.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-mint-400 px-6 py-3.5 font-bold text-base-950 transition hover:bg-mint-300"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Trust points */}
          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              ['Simple Tasks', 'Beginner-friendly digital work'],
              ['Transparent', 'Track tasks and submissions'],
              ['Mobile Friendly', 'Designed for everyday devices'],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
              >
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-sm text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
              Why Taskly
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Everything you need to manage micro-tasks
            </h2>
            <p className="mt-4 text-white/55">
              A straightforward experience for workers and employers.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:bg-white/[0.05]"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-mint-400/10 text-mint-400">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-lg font-bold">{feature.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
              How It Works
            </p>

            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Start completing tasks in a few simple steps
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-400 font-extrabold text-base-950">
                  {index + 1}
                </div>

                <p className="font-semibold text-white/80">{step}</p>

                <CheckCircle2
                  className="ml-auto shrink-0 text-mint-400"
                  size={20}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For workers and employers */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <Users className="text-mint-400" size={28} />

            <h2 className="mt-5 text-2xl font-extrabold">
              For Digital Workers
            </h2>

            <p className="mt-3 leading-7 text-white/50">
              Find available micro-tasks, follow the instructions, submit your
              work, and monitor your task and reward status from your dashboard.
            </p>

            <Link
              to="/auth"
              className="mt-6 inline-flex items-center gap-2 font-bold text-mint-400"
            >
              Create Worker Account
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <TrendingUp className="text-mint-400" size={28} />

            <h2 className="mt-5 text-2xl font-extrabold">
              For Employers
            </h2>

            <p className="mt-3 leading-7 text-white/50">
              Create digital tasks, define requirements, receive submissions,
              and manage task campaigns through the employer dashboard.
            </p>

            <Link
              to="/auth"
              className="mt-6 inline-flex items-center gap-2 font-bold text-mint-400"
            >
              Create Employer Account
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold sm:text-5xl">
            Ready to get started with Taskly?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-white/50">
            Create an account and explore the Taskly marketplace.
          </p>

          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-mint-400 px-7 py-4 font-bold text-base-950 transition hover:bg-mint-300"
          >
            Join Taskly
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Taskly. All rights reserved.</p>

          <div className="flex gap-5">
            <Link to="/auth" className="hover:text-white">
              Login
            </Link>

            <Link to="/auth" className="hover:text-white">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
