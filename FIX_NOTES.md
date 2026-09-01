# Taskly Final Fix

## What was fixed
- Fixed the `notifications.message` NOT NULL error.
- Removed the legacy submission-status trigger that used obsolete notification columns and could double-process payments/refunds.
- Approval and rejection are now handled exactly once by the RPC functions used by the frontend.
- Approval creates a proper notification using `message` + `user_id`.
- Rejection refunds escrow exactly once and creates a worker notification.
- Referral commission is worker-only, dynamic, and idempotent.
- Deposit, withdrawal, admin approval/rejection, notification, and system-setting RPCs are consolidated.
- RLS policies are tightened so clients cannot directly mutate financial tables.
- Legacy `body` / `target_user_id` notification data is migrated to `message` / `user_id` without deleting history.

## Database
Run `supabase/FINAL_FIX_TASKLY.sql` in the Supabase SQL Editor once.

The SQL is designed as a non-destructive repair for the existing Taskly database. It does not delete users, balances, tasks, submissions, transaction history, referrals, deposits, or withdrawals.

## Deployment
After running the SQL, deploy the project files normally. Keep the existing `.env`/Supabase environment variables unchanged.
