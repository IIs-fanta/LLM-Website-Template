-- Migration: add_api_host_field
-- Created at: 1755056747

ALTER TABLE api_configs ADD COLUMN api_host VARCHAR(255) DEFAULT NULL;