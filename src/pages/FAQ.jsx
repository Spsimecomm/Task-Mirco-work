import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react'

const faqs = [
  {
    question: 'What is Taskly?',
    answer:
      'Taskly is an online micro-task marketplace where workers can discover and complete digital tasks while employers can create tasks and receive submissions from workers.',
  },
  {
    question: 'How can I start using Taskly?',
    answer:
      'You can create an account through the registration page. After registration, your dashboard will provide access to the features available for your account type.',
  },
  {
    question: 'How do workers find tasks?',
    answer:
      'Workers can browse available tasks through the Taskly marketplace and choose tasks based on the requirements, instructions, and available reward.',
  },
  {
    question: 'How do I submit a completed task?',
    answer:
      'Open the task, carefully follow its requirements, complete the requested work, and submit the required proof or information through the task submission system.',
  },
  {
    question: 'Who reviews task submissions?',
    answer:
      'Task submissions are reviewed according to the task requirements. Employers can review submissions for tasks they have created and determine whether the submitted work meets the stated requirements.',
  },
  {
    question: 'How can employers create tasks?',
    answer:
      'Employers can access the employer dashboard, fund their account according to the available options, and create tasks by providing instructions, requirements, budget, and submission details.',
  },
  {
    question: 'Where can I see my earnings?',
    answer:
      'Workers can monitor their account balance and relevant earning information from their Taskly dashboard.',
  },
  {
    question: 'How does withdrawal work?',
    answer:
      'Eligible workers can use the withdrawal section of their dashboard to request withdrawals using the payment methods and requirements supported by Taskly.',
  },
  {
    question: 'Is Taskly available for users in Bangladesh?',
    answer:
      'Taskly is designed with Bangladesh-based digital workers and employers in mind, while the platform may expand its availability to additional markets over time.',
  },
  {
    question: 'How can I get help with my account?',
    answer:
      'If you need assistance with your account or platform usage, use the support or contact options provided by Taskly.',
  },
]

function FAQItem({ faq, isOpen, onClick }) {
  return (
    <div className="overflow-hidden card">
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left transition hover:bg-white/[0.02]"
        aria-expanded={isOpen}
      >
        <span className="text-base font-bold text-[#F1F5F9] sm:text-lg">
          {faq.question}
        </span>

        <ChevronDown
          size={20}
          className={`shrink-0 text-mint-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-white/10 px-6 pb-6 pt-4">
          <p className="text-sm leading-7 text-slate-400">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  const handleToggle = (index) => {
    setOpenIndex((current) => (current === index ? -1 : index))
  }

  return (
    <main className="min-h-screen text-[#F1F5F9]">
      {/* FAQ Structured Data for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* Hero */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 lg:py-28">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-500/10 text-mint-500">
            <HelpCircle size={28} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-mint-500">
            Frequently Asked Questions
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#F1F5F9] sm:text-5xl">
            Everything you need to know about Taskly
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Find answers to common questions about tasks, workers, employers,
            submissions, earnings, and using the Taskly platform.
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem
                key={faq.question}
                faq={faq}
                isOpen={openIndex === index}
                onClick={() => handleToggle(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold text-[#F1F5F9] sm:text-4xl">
            Still have questions?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Explore the platform or create an account to get started with
            Taskly.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="btn-primary"
            >
              Create Account
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/how-it-works"
              className="btn-secondary"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
