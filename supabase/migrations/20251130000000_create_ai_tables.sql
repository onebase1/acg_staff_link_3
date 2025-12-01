-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create agency_ai_settings table
CREATE TABLE IF NOT EXISTS agency_ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
    whatsapp_number TEXT UNIQUE, -- The number staff text TO
    system_prompt_override TEXT, -- Custom persona instructions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agency_documents table for RAG
CREATE TABLE IF NOT EXISTS agency_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT, -- e.g., 'uniform', 'pay', 'policy'
    embedding vector(1536), -- For OpenAI embeddings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agency_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Simple for now: Admins can manage, Staff can read documents)
-- agency_ai_settings
CREATE POLICY "Admins can manage their agency AI settings" ON agency_ai_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.agency_id = agency_ai_settings.agency_id
            AND profiles.user_type = 'agency_admin'
        )
    );

-- agency_documents
CREATE POLICY "Admins can manage their agency documents" ON agency_documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.agency_id = agency_documents.agency_id
            AND profiles.user_type = 'agency_admin'
        )
    );

CREATE POLICY "Staff can read their agency documents" ON agency_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.agency_id = agency_documents.agency_id
        )
    );

-- Create function to match documents
CREATE OR REPLACE FUNCTION match_agency_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_agency_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    agency_documents.id,
    agency_documents.content,
    1 - (agency_documents.embedding <=> query_embedding) AS similarity
  FROM agency_documents
  WHERE 1 - (agency_documents.embedding <=> query_embedding) > match_threshold
  AND agency_documents.agency_id = filter_agency_id
  ORDER BY agency_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
