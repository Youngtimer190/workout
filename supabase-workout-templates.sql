-- =============================================
-- WORKOUT TEMPLATES TABLE SETUP FOR SUPABASE (Safe re-run)
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create the table (if not exists)
CREATE TABLE IF NOT EXISTS workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,  -- matches the frontend template.id (e.g., "tmpl-123-abc")
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
    color TEXT DEFAULT 'bg-violet-500',
    category TEXT DEFAULT 'Custom',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one template per user per template_id
    UNIQUE(user_id, template_id)
);

-- 2. Enable Row Level Security
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON workout_templates;

-- 4. Create fresh policies
CREATE POLICY "Users can view own templates"
    ON workout_templates
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
    ON workout_templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
    ON workout_templates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
    ON workout_templates
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_updated_at ON workout_templates(updated_at DESC);

-- 6. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workout_templates_updated_at ON workout_templates;
CREATE TRIGGER update_workout_templates_updated_at
    BEFORE UPDATE ON workout_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. (Optional) Enable realtime for live sync across tabs
-- ALTER PUBLICATION supabase_realtime ADD TABLE workout_templates;