-- Run this in your Supabase SQL Editor to support the recurring programs!

-- 1. Create the Programs Table
CREATE TABLE IF NOT EXISTS programs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, 
  location_name TEXT NOT NULL,
  map_iframe_url TEXT NOT NULL,
  start_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure ONLY one program is active at a time. The app logic mostly handles this.

-- 2. Add relationships to existing tables
-- These commands add a program_id column to attach data cleanly to each event session.

ALTER TABLE bus_points 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE inviters 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE CASCADE;

-- If you don't have prayer_points yet, create it:
CREATE TABLE IF NOT EXISTS prayer_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT,
    request TEXT NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: If you encounter an error adding references to `members` or `inviters` because the `programs` table is empty, 
-- you might want to create a default program first, or allow the column to be NULL (which it is by default).
