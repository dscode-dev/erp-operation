-- Curated notifications: rejection becomes a first-class event.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_REJECTED' BEFORE 'ASSIGNMENT_OVERDUE';
