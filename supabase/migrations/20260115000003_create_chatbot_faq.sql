-- Migration: Create chatbot_faq table
-- Purpose: FAQ knowledge base for Kylie AI chatbot
-- Author: Kylie AI Implementation
-- Date: 2026-01-15

-- Create chatbot_faq table
CREATE TABLE IF NOT EXISTS chatbot_faq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  category TEXT NOT NULL,
  -- Categories: uniforms, rates, timesheets, shifts, availability, general, compliance

  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  keywords TEXT[],
  -- For keyword matching (e.g., ['pay', 'payment', 'salary', 'wage'])

  priority INTEGER DEFAULT 0,
  -- Higher priority = shown first when multiple matches

  active BOOLEAN DEFAULT TRUE,
  -- Can be disabled without deleting

  view_count INTEGER DEFAULT 0,
  -- Track how often this FAQ is accessed

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_category CHECK (
    category IN ('uniforms', 'rates', 'timesheets', 'shifts', 'availability', 'general', 'compliance', 'payment', 'policies')
  ),
  CONSTRAINT non_empty_question CHECK (LENGTH(TRIM(question)) > 0),
  CONSTRAINT non_empty_answer CHECK (LENGTH(TRIM(answer)) > 0)
);

-- Indexes for fast lookups
CREATE INDEX idx_chatbot_faq_category ON chatbot_faq(category);
CREATE INDEX idx_chatbot_faq_active ON chatbot_faq(active) WHERE active = TRUE;
CREATE INDEX idx_chatbot_faq_keywords ON chatbot_faq USING GIN(keywords);
CREATE INDEX idx_chatbot_faq_view_count ON chatbot_faq(view_count DESC);
CREATE INDEX idx_chatbot_faq_priority ON chatbot_faq(priority DESC);

-- Full text search index
CREATE INDEX idx_chatbot_faq_question_search ON chatbot_faq USING GIN(to_tsvector('english', question));
CREATE INDEX idx_chatbot_faq_answer_search ON chatbot_faq USING GIN(to_tsvector('english', answer));

-- Comments for documentation
COMMENT ON TABLE chatbot_faq IS 'FAQ knowledge base for Kylie WhatsApp AI chatbot';
COMMENT ON COLUMN chatbot_faq.category IS 'FAQ category for organization';
COMMENT ON COLUMN chatbot_faq.question IS 'The question staff would ask';
COMMENT ON COLUMN chatbot_faq.answer IS 'The answer Kylie provides';
COMMENT ON COLUMN chatbot_faq.keywords IS 'Keywords for matching user queries';
COMMENT ON COLUMN chatbot_faq.priority IS 'Higher priority shown first (0 = normal, 10 = critical)';
COMMENT ON COLUMN chatbot_faq.view_count IS 'Number of times this FAQ was accessed';

-- Function to search FAQs by keyword
CREATE OR REPLACE FUNCTION search_faq(
  p_query TEXT,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  question TEXT,
  answer TEXT,
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.category,
    f.question,
    f.answer,
    (
      -- Keyword match score
      CASE WHEN f.keywords && string_to_array(LOWER(p_query), ' ') THEN 10.0 ELSE 0.0 END +
      -- Full text search score
      ts_rank(to_tsvector('english', f.question || ' ' || f.answer), plainto_tsquery('english', p_query)) * 5.0 +
      -- Priority boost
      f.priority::FLOAT +
      -- Popularity boost (logarithmic)
      LN(GREATEST(f.view_count, 1))
    ) AS relevance_score
  FROM chatbot_faq f
  WHERE f.active = TRUE
    AND (p_category IS NULL OR f.category = p_category)
    AND (
      -- Keyword match
      f.keywords && string_to_array(LOWER(p_query), ' ')
      OR
      -- Full text search match
      to_tsvector('english', f.question || ' ' || f.answer) @@ plainto_tsquery('english', p_query)
    )
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment FAQ view count
CREATE OR REPLACE FUNCTION increment_faq_view(p_faq_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chatbot_faq
  SET view_count = view_count + 1
  WHERE id = p_faq_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_chatbot_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbot_faq_updated_at
  BEFORE UPDATE ON chatbot_faq
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_faq_updated_at();

-- RLS Policies
ALTER TABLE chatbot_faq ENABLE ROW LEVEL SECURITY;

-- Anyone can read active FAQs (public knowledge)
CREATE POLICY chatbot_faq_select_active
  ON chatbot_faq
  FOR SELECT
  USING (active = TRUE);

-- Admins can manage FAQs
CREATE POLICY chatbot_faq_admin_all
  ON chatbot_faq
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage (for n8n workflows)
CREATE POLICY chatbot_faq_service_role
  ON chatbot_faq
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
