/*
# Revoke public execution on privileged RPCs

## Overview
Removes the default PUBLIC execute grant from all privileged SECURITY DEFINER functions. Authenticated access is granted back explicitly where the app needs it.
*/

revoke execute on function public.deposit_funds(numeric, text) from public;
revoke execute on function public.create_task_with_funding(text, text, text, text, numeric, integer) from public;
revoke execute on function public.submit_task_proof(uuid, text, text) from public;
revoke execute on function public.approve_submission(uuid) from public;
revoke execute on function public.reject_submission(uuid, text) from public;
revoke execute on function public.request_withdrawal(numeric, text, text) from public;
revoke execute on function public.request_deposit(numeric, text, text, text) from public;
revoke execute on function public.admin_approve_deposit(uuid) from public;
revoke execute on function public.admin_reject_deposit(uuid, text) from public;
revoke execute on function public.admin_approve_withdrawal(uuid) from public;
revoke execute on function public.admin_reject_withdrawal(uuid, text) from public;

-- `is_admin` was already restricted, keep the explicit grants clear.
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

grant execute on function public.deposit_funds(numeric, text) to authenticated;
grant execute on function public.create_task_with_funding(text, text, text, text, numeric, integer) to authenticated;
grant execute on function public.submit_task_proof(uuid, text, text) to authenticated;
grant execute on function public.approve_submission(uuid) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
grant execute on function public.request_deposit(numeric, text, text, text) to authenticated;
grant execute on function public.admin_approve_deposit(uuid) to authenticated;
grant execute on function public.admin_reject_deposit(uuid, text) to authenticated;
grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
