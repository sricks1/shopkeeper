-- Migration: add task notification types.
-- Isolated from the table migration because ALTER TYPE ... ADD VALUE has
-- historically been restricted inside a transaction; keeping it alone avoids
-- any chance of the new values being used in the same transaction that adds them.

alter type notification_type add value 'task_assigned';
alter type notification_type add value 'task_comment';
