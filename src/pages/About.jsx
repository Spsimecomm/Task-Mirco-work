import React from 'react'
import { Link } from 'react-router-dom'
import {
  Target,
  ShieldCheck,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react'

const values = [
  {
    icon: Target,
    title: 'Accessibility',
    description:
      'Taskly aims to make digital micro-task opportunities easier to discover for beginners, students, freelancers, and remote workers.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparency',
    description:
      'We focus on clear task instructions, submission tracking, and structured verification so users can understand the status of their work.',
  },
  {
    icon: Users,
    title: 'Community',
    description:
      'Taskly brings task workers and employers together in one digital marketplace designed for simple and flexible online work.',
  },
  {
    icon: Zap,
    title: 'Simplicity',
    description:
      'Our platform is designed around a straightforward workflow that makes discovering, completing, and managing tasks easier.',
  },
]

export default function About() {
  return (
    <main className="min-h-screen bg-base-950 text-white">
      {/* Hero */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 lg:py-28">
          <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
            About Taskly
          </p>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            A simpler way to connect with digital micro-tasks
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/55 sm:text-lg">
            Taskly is a digital micro-task marketplace designed to connect
            people looking for flexible online work with employers who need
            digital tasks completed.
          </p>
        </div>
      </section>

      {/* What is Taskly */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
              Our Platform
            </p>

            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              What is Taskly?
            </h2>

            <div className="mt-6 space-y-5 text-white/55 leading-8">
              <p>
                Taskly is an online marketplace focused on digital micro-tasks
                and short-duration online work.
              </p>

              <p>
                Workers can discover available tasks, follow the provided
                instructions, submit their completed work, and monitor the
                status of their submissions through their dashboard.
              </p>

              <p>
                Employers can create tasks, define requirements, receive
                submissions, and review completed work through the employer
                dashboard.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h3 className="text-xl font-bold">
              Taskly at a glance
            </h3>

            <div className="mt-6 space-y-5">
              {[
                ['Platform', 'Digital micro-task marketplace'],
                ['Audience', 'Workers, freelancers, students & employers'],
                ['Focus', 'Simple digital tasks and flexible online work'],
                ['Region', 'Bangladesh and future global markets'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-white/5 pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-sm text-white/40">{label}</p>
                  <p className="mt-1 font-semibold text-white/80">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-white/5 bg-white/[0.015] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
              What We Value
            </p>

            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Built around simple principles
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint-400/10 text-mint-400">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Explore Taskly
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            Create an account to discover the platform and explore available
            opportunities.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-mint-400 px-6 py-3.5 font-bold text-base-950 transition hover:bg-mint-300"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-semibold hover:bg-white/10"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
