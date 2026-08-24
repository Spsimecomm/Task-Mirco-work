/*
# Restrict profile trigger function execution

The profile creation function is invoked by the auth trigger and does not need to be callable through the public API.
*/
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
