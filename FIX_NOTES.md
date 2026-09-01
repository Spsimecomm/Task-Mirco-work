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


## Important SQL fix
The standalone schema had two incompatible definitions of process_referral_commission with the same argument signature but different return types (numeric vs uuid). The duplicate legacy definition was removed, and the fixed SQL/migration now drops the old signature before installing the canonical uuid-returning function. If the old schema was already partially run, use supabase/RECOVERY_REFERRAL_FUNCTION.sql once, then run the remaining FINAL_FIX_TASKLY.sql.

## v3 SQL safety fix
The final repair SQL now explicitly drops exact-signature functions before recreating them. This prevents PostgreSQL 42P13 errors such as "cannot remove parameter defaults from existing function" for admin_reject_deposit and similar functions. The drops affect function definitions only; they do not delete application data.
