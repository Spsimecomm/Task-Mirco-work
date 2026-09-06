/*
# Fix Submission & Deposit Column Mismatches

## Problem
The `submit_task_proof` RPC function inserts into `proof` and `proof_file_url` columns
on the `submissions` table, but those columns don't exist in the live database.
This causes every task submission to fail with a "column does not exist" error.

Similarly, the `request_deposit` RPC inserts into `method`, `trx_id`, and `sender_mobile`
columns on `deposit_requests`, but those columns are missing from the live table.

## Changes

### 1. submissions table
- Add `proof` column (text, NOT NULL, default '') — legacy field written by submit_task_proof RPC
- Add `proof_file_url` column (text, nullable) — file URL mirror written by submit_task_proof RPC

### 2. deposit_requests table
- Add `method` column (text, nullable) — payment method field written by request_deposit RPC
- Add `trx_id` column (text, not null, default '') — transaction ID field written by request_deposit RPC
- Add `sender_mobile` column (text, not null, default '') — sender mobile field written by request_deposit RPC

### 3. Data backfill
- Populate `method` from existing `payment_method` where `method` is null
- Populate `trx_id` from existing `transaction_id` where `trx_id` is null/empty
- Populate `sender_mobile` from existing `sender_number` where `sender_mobile` is null/empty
- Populate `proof` from existing `proof_text` where `proof` is null/empty

### 4. Security
- No RLS policy changes — existing policies remain intact
- No new tables created

## Notes
- All column additions use IF NOT EXISTS for idempotency
- No data is deleted or transformed destructively
- The `proof` and `proof_file_url` columns are redundant with `proof_text` and `proof_url`
  but are required by the existing RPC function signatures
*/

-- 1. Add missing columns to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS proof text NOT NULL DEFAULT '';
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS proof_file_url text;

-- 2. Add missing columns to deposit_requests
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS method text;
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS trx_id text NOT NULL DEFAULT '';
ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS sender_mobile text NOT NULL DEFAULT '';

-- 3. Backfill data from legacy columns
UPDATE public.submissions
SET proof = proof_text
WHERE (proof IS NULL OR proof = '') AND proof_text IS NOT NULL AND proof_text != '';

UPDATE public.submissions
SET proof_file_url = proof_url
WHERE proof_file_url IS NULL AND proof_url IS NOT NULL AND proof_url != '';

UPDATE public.deposit_requests
SET method = payment_method
WHERE method IS NULL AND payment_method IS NOT NULL;

UPDATE public.deposit_requests
SET trx_id = transaction_id
WHERE (trx_id IS NULL OR trx_id = '') AND transaction_id IS NOT NULL AND transaction_id != '';

UPDATE public.deposit_requests
SET sender_mobile = sender_number
WHERE (sender_mobile IS NULL OR sender_mobile = '') AND sender_number IS NOT NULL AND sender_number != '';

-- 4. Ensure existing constraints are intact
ALTER TABLE public.submissions
  DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));
