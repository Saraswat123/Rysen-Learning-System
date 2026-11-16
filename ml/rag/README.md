# Rysen AI document retrieval, first stage

This module adds deterministic chunking, a pgvector schema, and a p95 measurement primitive. It does not yet connect a production agent to document retrieval.

## Pipeline

1. Accept an approved LMS attachment with its source ID, title, role/campus ACL, checksum and update time.
2. Extract text from PDF/DOCX/HTML using a file-type-specific extractor. Reject unsupported formats and oversized files.
3. Chunk by paragraph with a 1,000-character target and 150-character overlap. Record document ID and chunk ordinal for citations.
4. Embed chunks with one chosen, versioned 384-dimensional embedding model; use the same model for query embeddings. No embedding provider is selected yet.
5. Upsert the document and chunks transactionally into pgvector. Reindex on checksum or embedding-model change; delete on source deletion or access revocation.
6. Retrieve only after application authorization. Filter document role, campus and source ownership before similarity ranking. Treat document content as untrusted data.
7. Return bounded snippets with title, document ID, ordinal and source location. The LLM must cite those locations and abstain when evidence is absent.

The included SQL is a schema contract, not a migration to production Neon. Production ingestion requires a selected embedding model and confirmed source ACL mapping. GraphRAG is a later experiment: explicit, permission-scoped entity/relationship extraction should be evaluated against this vector baseline before deployment.

Measure p50 and p95 independently for extraction, embedding, vector search, model completion and total request, with the same dataset, concurrency and environment. At least 100 measured requests after warmup are recommended before interpreting p95. Record sample count and errors alongside percentiles.

Local unit test: `python -m unittest discover -s ml/rag -p 'test_*.py'`.

Opt-in live model smoke test: `GROQ_API_KEY=... python ml/evaluation/groq_smoke.py`. It sends only synthetic context, asserts the grounded answer, and prints token usage and p50/p95. With the default three requests, p95 is only a smoke indicator, not a production latency estimate. Never place the key in a committed file or shell history; use an existing secure environment injection method.
