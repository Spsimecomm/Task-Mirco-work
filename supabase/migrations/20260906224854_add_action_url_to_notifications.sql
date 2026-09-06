/*
# Add action_url to notifications table

## Problem
Notifications had no way to store a target link for click-to-navigate behavior.
When users clicked a notification, nothing happened — no page opened.

## Changes

### 1. notifications table
- Add `action_url` column (text, nullable) — optional route/URL the user should be
  taken to when they click the notification. When null, the frontend falls back
  to a type-based default route (e.g. commission → /referrals, reward → /my-submissions).

### 2. Security
- No RLS policy changes — existing policies remain intact.
- No new tables created.

## Notes
- Column is nullable so existing notifications are unaffected.
- Idempotent via IF NOT EXISTS.
*/

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url text;
