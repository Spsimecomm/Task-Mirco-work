# Taskly — Micro-Task Platform

A full micro-task marketplace (SproutGigs / Picoworkers style) built with **React + Vite**, **Tailwind CSS**, **lucide-react**, and **Supabase** (Postgres + Auth + Row Level Security).

Workers browse and complete small paid tasks; employers post tasks, fund them, and review submitted proof. All money movement (deposits, task funding, approvals, rejections, withdrawals) happens through Postgres RPC functions, so wallet balances can never be edited directly by a client.

## Features

- **Auth & roles** — email/password sign-up with a Worker/Employer role picker. A DB trigger creates the wallet/profile row automatically.
- **Worker dashboard** — live Earnings / Pending / Withdrawn balances, recent submissions.
- **Employer dashboard** — live Balance / Pending / Spent balances, recent tasks.
- **Marketplace** — search + category filter (Social Media, Sign Up, Video Watching, Data Entry), open-slots indicator.
- **Task detail & submission** — proof (text + optional URL/screenshot link) submitted per task, one submission per worker per task.
- **Review queue** — employer approves (auto-pays the worker) or rejects with a reason (reopens the slot, refunds the reserved budget).
- **Deposits** — mock payment UI (card / bKash / bank) that credits the employer's balance via RPC. Swap in a real processor server-side for production.
- **Withdrawals** — worker requests a payout to bKash / bank / PayPal; request is logged with a `pending` status for an admin/ops process to fulfill.
- **Row Level Security** everywhere — every table locks rows to their owner; the only way to move money is through `security definer` functions.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` → run it once. This creates all tables, RLS policies, triggers, and RPC functions.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.
4. In **Authentication → Providers**, email/password is enabled by default. For faster local testing you can turn off "Confirm email" under **Authentication → Settings**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Install & run

```bash
npm install
npm run dev
```

Open the printed local URL. Register two accounts — one Worker, one Employer — to try the full flow:

1. Sign up as **Employer** → Deposit funds → Post a task.
2. Sign up as **Worker** (or an incognito window) → Browse the marketplace → Submit proof for the task.
3. Back in the Employer account → Review submissions → Approve (worker gets paid) or Reject (slot reopens, funds are released back to your balance).
4. As the Worker → Withdraw → request a payout from your earnings balance.

## Database model

| Table | Purpose |
|---|---|
| `profiles` | One row per user: name, role, and wallet balances (`earnings`, `pending`, `spent`, `deposited`). Only the owner can `SELECT` their row; there is no client `UPDATE` policy — balances only change inside RPC functions. |
| `tasks` | Employer-posted jobs: category, description, proof instructions, reward, slot count. |
| `submissions` | One row per worker-task pair (unique constraint), with proof text/URL and a status of `pending` / `approved` / `rejected`. |
| `transactions` | Append-only ledger of deposits, withdrawals, earnings, and spend — useful for statements/audits. |
| `withdrawals` | Payout requests from workers, with method + account details and a `pending` status for manual/admin fulfillment. |

## Money-movement RPCs (all `security definer`)

- `deposit_funds(amount, method)` — credits an employer's `deposited` balance.
- `create_task_with_funding(...)` — checks the employer has enough `deposited` balance, moves `reward * slots` from `deposited` into `pending`, then creates the task.
- `submit_task_proof(task_id, proof_text, proof_url)` — creates a submission (one per worker per task) and bumps the worker's `pending`.
- `approve_submission(submission_id)` — pays the worker (`pending → earnings`) and finalizes the employer's spend (`pending → spent`).
- `reject_submission(submission_id, reason)` — releases the worker's reserved `pending`, refunds the employer's `deposited`, and reopens the task slot.
- `request_withdrawal(amount, method, account_details)` — moves `earnings → spent` for the worker and logs a `pending` withdrawal request.

## Notes for production

- **Payments**: the Deposit page simulates a successful charge. Wire it to a real processor (Stripe, bKash, Nagad, SSLCommerz) and only call `deposit_funds` from a verified server-side webhook after the charge actually succeeds — never trust the client to say a payment succeeded.
- **Withdrawals**: requests are logged as `pending`. Build a small admin view (or use the Supabase dashboard / a service-role script) to mark them `approved`/`rejected` after you've sent the payout.
- **Image proof uploads**: proof currently accepts a URL. To accept real file uploads, add a Supabase Storage bucket with a policy scoped to `auth.uid()` and swap the URL field for an upload widget.
- **Email confirmation**: enabled by default in Supabase — re-enable it before going live.
