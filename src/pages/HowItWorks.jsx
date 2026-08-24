import React from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus,
  Search,
  ClipboardCheck,
  Send,
  Wallet,
  PlusCircle,
  Eye,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

const workerSteps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Create Your Account',
    description:
      'Register for a Taskly account and complete your basic profile information.',
  },
  {
    icon: Search,
    number: '02',
    title: 'Find Available Tasks',
    description:
      'Browse the marketplace and find tasks that match your interests and available time.',
  },
  {
    icon: ClipboardCheck,
    number: '03',
    title: 'Complete the Task',
    description:
      'Read the requirements carefully and complete the task according to the provided instructions.',
  },
  {
    icon: Send,
    number: '04',
    title: 'Submit Your Work',
    description:
      'Submit the required proof or result through the Taskly task submission system.',
  },
  {
    icon: CheckCircle2,
    number: '05',
    title: 'Get Verified',
    description:
      'The task creator reviews your submission. Approved work moves toward reward processing.',
  },
  {
    icon: Wallet,
    number: '06',
    title: 'Track Your Reward',
    description:
      'Monitor your approved earnings and account balance from your dashboard.',
  },
]

const employerSteps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Create an Employer Account',
    description:
      'Register on Taskly and access the employer dashboard.',
  },
  {
    icon: Wallet,
    number: '02',
    title: 'Fund Your Account',
    description:
      'Add funds according to the available platform payment and deposit options.',
  },
  {
    icon: PlusCircle,
    number: '03',
    title: 'Create a Task',
    description:
      'Define your task requirements, instructions, budget, and submission requirements.',
  },
  {
    icon: Eye,
    number: '04',
    title: 'Receive Submissions',
    description:
      'Workers discover your task and submit their completed work through the platform.',
  },
  {
    icon: ClipboardCheck,
    number: '05',
    title: 'Review the Work',
    description:
      'Review submitted work and check whether it follows your task requirements.',
  },
  {
    icon: CheckCircle2,
    number: '06',
    title: 'Approve Valid Submissions',
    description:
      'Approve qualifying submissions and manage your campaign from the employer dashboard.',
  },
]

function StepCard({ step }) {
  const Icon = step.icon

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint-400/10 text-mint-400">
          <Icon size={23} />
        </div>

        <span className="text-sm font-extrabold text-white/20">
          {step.number}
        </span>
      </div>

      <h3 className="mt-6 text-lg font-bold">{step.title}</h3>

      <p className="mt-3 text-sm leading-6 text-white/50">
        {step.description}
      </p>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-base-950 text-white">
      {/* Hero */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 lg:py-28">
          <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
            How Taskly Works
          </p>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Simple steps from task discovery to completion
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/55 sm:text-lg">
            Taskly provides a straightforward workflow for both digital
            workers and employers. Discover tasks, complete work, review
            submissions, and manage everything from one platform.
          </p>
        </div>
      </section>

      {/* Worker Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-mint-400/20 bg-mint-400/10 px-4 py-2 text-sm font-bold text-mint-400">
              For Digital Workers
            </div>

            <h2 className="mt-5 text-3xl font-extrabold sm:text-4xl">
              Complete tasks and manage your work
            </h2>

            <p className="mt-4 leading-7 text-white/50">
              Follow a simple workflow to discover available tasks, complete
              the requirements, submit your work, and track the result.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workerSteps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </div>
      </section>

      {/* Employer Section */}
      <section className="border-y border-white/5 bg-white/[0.015] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-mint-400/20 bg-mint-400/10 px-4 py-2 text-sm font-bold text-mint-400">
              For Employers
            </div>

            <h2 className="mt-5 text-3xl font-extrabold sm:text-4xl">
              Create tasks and manage submissions
            </h2>

            <p className="mt-4 leading-7 text-white/50">
              Employers can create digital tasks, receive submissions, review
              completed work, and manage their campaigns through the platform.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {employerSteps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wider text-mint-400">
            The Taskly Workflow
          </p>

          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            One platform. Two sides. One simple workflow.
          </h2>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              'Create',
              'Discover',
              'Complete',
              'Submit',
              'Review',
              'Approve',
            ].map((item, index, array) => (
              <React.Fragment key={item}>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-semibold">
                  {item}
                </div>

                {index < array.length - 1 && (
                  <ArrowRight
                    size={18}
                    className="hidden text-mint-400 sm:block"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Ready to explore Taskly?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/50">
            Create an account and start exploring the Taskly platform.
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
