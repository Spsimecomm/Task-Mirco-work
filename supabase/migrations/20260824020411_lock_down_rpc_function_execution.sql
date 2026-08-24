/*
# Lock down privileged RPC execution

## Overview
Revokes anonymous execution from every SECURITY DEFINER function exposed in the public schema. The browser must be signed in before any task, wallet, admin, or submission operation can be called.

## Security
- `anon` can no longer call any privileged RPC.
- `authenticated` retains access only to functions whose internal checks authorize the operation.
- Admin functions still require the caller profile to have role='admin'.
*/

revoke execute on function public.deposit_funds(numeric, text) from anon;
revoke execute on function public.create_task_with_funding(text, text, text, text, numeric, integer) from anon;
revoke execute on function public.submit_task_proof(uuid, text, text) from anon;
revoke execute on function public.approve_submission(uuid) from anon;
revoke execute on function public.reject_submission(uuid, text) from anon;
revoke execute on function public.request_withdrawal(numeric, text, text) from anon;
revoke execute on function public.request_deposit(numeric, text, text, text) from anon;
revoke execute on function public.admin_approve_deposit(uuid) from anon;
revoke execute on function public.admin_reject_deposit(uuid, text) from anon;
revoke execute on function public.admin_approve_withdrawal(uuid) from anon;
revoke execute on function public.admin_reject_withdrawal(uuid, text) from anon;
