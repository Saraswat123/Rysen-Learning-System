CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id text PRIMARY KEY,
  title text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  branch_id text,
  audience_role text NOT NULL,
  content_sha256 text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  document_id text NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  text text NOT NULL,
  embedding vector(384) NOT NULL,
  PRIMARY KEY (document_id, ordinal)
);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS rag_documents_scope
  ON rag_documents (audience_role, branch_id);

-- Role and campus scope belong in this query, never in model-supplied SQL.
-- A production caller must additionally verify document ownership and source ACL.
-- SELECT d.id, d.title, c.ordinal, c.text, c.embedding <=> $1::vector AS distance
-- FROM rag_chunks c JOIN rag_documents d ON d.id = c.document_id
-- WHERE d.audience_role = $2 AND (d.branch_id = $3 OR d.branch_id IS NULL)
-- ORDER BY c.embedding <=> $1::vector LIMIT $4;
