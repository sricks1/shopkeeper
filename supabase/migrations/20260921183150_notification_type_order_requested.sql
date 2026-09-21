-- Migration: add the order_requested notification type.
-- Isolated from the trigger migration for the same reason as
-- 20260530000001: ALTER TYPE ... ADD VALUE shouldn't share a transaction with
-- code that uses the new value.

alter type notification_type add value 'order_requested';
