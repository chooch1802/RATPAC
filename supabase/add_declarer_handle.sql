-- Migration: add declarer_handle to wagers for two-step settlement flow
-- Run this against your existing Supabase database

ALTER TABLE wagers ADD COLUMN IF NOT EXISTS declarer_handle TEXT;
