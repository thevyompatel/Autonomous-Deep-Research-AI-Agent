# Research Report: Retrieval-Augmented Generation (RAG) Workings and Failure Modes

## Executive summary
Retrieval-Augmented Generation (RAG) is a hybrid architectural approach that enhances Large Language Models (LLMs) by fetching relevant external information at query time and supplying it as context alongside the user's prompt [1][2]. This grounds the model's outputs in verifiable data, reducing hallucinations and providing up-to-date, domain-specific knowledge without requiring expensive model retraining [1][2][3]. However, RAG systems encounter numerous failure modes across their pipeline stages—ranging from ingestion and embedding to retrieval ranking and text generation—where issues like missing content, poor chunking boundaries, and context noise can degrade performance [4][6][8].

---

## How Retrieval-Augmented Generation Works
Retrieval-Augmented Generation (RAG) bridges the gap between static LLM training data and dynamic real-world information by combining external knowledge retrieval with text generation [2][6]. At a high level, a standard RAG pipeline operates through several core components and steps:

1. **Document Ingestion and Parsing:** Raw documents from external knowledge bases (such as internal organizational data, journals, or specialized datasets) are ingested, parsed to preserve structure (like headings and tables), and split into smaller segments called chunks [1][3][8].
2. **Embedding and Indexing:** Embedding models convert these text chunks into high-dimensional numerical vectors representing semantic meaning [1][2][5]. These embeddings are then stored in a vector database optimized for similarity and semantic search [2][5].
3. **Retrieval Layer:** When a user submits a query, the input is also embedded and matched against the vector database using Approximate Nearest Neighbors (ANN) algorithms to fetch the top-k most relevant text chunks [1][2][5][13]. Pipelines may use hybrid search (combining dense vector search with sparse BM25 keyword matching) and rerankers to refine the results [8][12][13].
4. **Prompt Construction and Generation:** The retrieved text chunks are merged with the original user query into an augmented prompt, which is then fed into the LLM generator to produce a grounded, context-aware response [1][2][14].

---

## Main Failure Modes in RAG Systems
RAG systems can fail in diverse and poorly characterized ways across their pipeline stages, and many failures that appear to be model errors actually originate earlier in the pipeline [4][8]. A systematic taxonomy outlines 33 failure modes across seven stages, including ingestion, representation, retrieval, generation, evaluation, deployment, and agentic orchestration [4]. The primary failure modes can be categorized by the pipeline stage in which they occur:

### 1. Ingestion and Representation Failures
* **Data Quality and Bias:** Ingesting outdated, off-topic, or biased documents leads to low-quality or skewed outputs [5].
* **Suboptimal Chunking:** Poor chunking strategies—such as using chunks that are too small (which lose vital context) or too large (which add noise, dilute similarity search, and waste context window space)—disrupt retrieval accuracy [1][5][8].
* **Parser Errors:** Parsers that drop table boundaries, merge columns, or misorder sections force chunking to guess boundaries, causing retrieval to return plausible but incorrect passages [8].
* **Embedding Model Mismatches:** Using a generic embedding model on domain-specific language can cause the vector space to collapse distinctions, returning near-miss chunks that fail to answer the query [5][8].

### 2. Retrieval Stage Failures
* **Missing Content:** The correct information does not exist in the dataset or knowledge base, leaving the model without relevant context and prone to hallucination or vague answers [6].
* **Missing Top-Ranked Documents:** Although the correct information exists in the dataset, the ranker places it too low in the results, causing the model to miss it [6].
* **Consolidation Limitation (Not in Context):** The retriever finds the correct document, but it fails to enter the LLM's context window due to truncation, poor chunking, or ineffective consolidation strategies [6].
* **Retrieving Irrelevant Documents or Over-Retrieving:** Retrieving too much context or confusing similarity with relevance can overwhelm the model with noise, obscure key details, and produce unclear results [1][5][6][8].
* **Incomplete Retrieval:** Approximate Nearest Neighbors (ANN) algorithms or restrictive search parameters may miss crucial documents needed for a comprehensive answer [5].

### 3. Generation and Synthesis Failures
* **Extraction Failures:** Even when the correct answer is present in the retrieved context, the LLM may fail to extract it correctly due to noise, ambiguity, or conflicting information [6].
* **Hallucinations and Contradictions:** Despite being grounded in retrieved data, the LLM can still produce fabricated facts or contradict the factual information provided in the context [3][13].
* **Wrong Formatting and Specificity Issues:** The LLM may return unstructured text instead of a required format (like JSON or a table), or provide answers that are overly broad or too narrow [6].
* **Incomplete Answers:** The model may return a partially correct response that lacks full coverage of multi-part questions [6].

## Sources

1. [What Is RAG Architecture: How It Works & Key Benefits](https://www.truefoundry.com/blog/rag-architecture)
2. [RAG Architecture Explained: A Comprehensive Guide ](https://orq.ai/blog/rag-architecture)
3. [What is RAG (Retrieval Augmented Generation)? | IBM](https://www.ibm.com/think/topics/retrieval-augmented-generation)
4. [A Systematic Taxonomy of Failure Modes in Retrieval-Augmented Generation Systems - ACL Anthology](https://aclanthology.org/2026.trustnlp-main.27)
5. [Understanding Failures and Mitigation Strategies in RAG Pipelines | Deconvolute Labs](https://deconvoluteai.com/blog/rag/failure-modes)
6. [Seven RAG Pitfalls and How to Solve Them | Label Studio](https://labelstud.io/blog/seven-ways-your-rag-system-could-be-failing-and-how-to-fix-them)
7. [RAG Scaling Challenges | Bottlenecks & Limitations](https://apxml.com/courses/large-scale-distributed-rag/chapter-1-scalable-rag-architectures-foundations/scaling-rag-bottlenecks-limitations)
8. [Common Challenges in RAG and How to Solve Them in Production | Unstructured](https://unstructured.io/insights/rag-pipeline-challenges-from-data-ingestion-to-retrieval)
9. [90% of RAG systems struggle with the same bottleneck: | Paul Iusztin](https://www.linkedin.com/posts/pauliusztin_90-of-rag-systems-struggle-with-the-same-activity-7330163090082172928-c3_B)
10. [RAG in 2026: How Retrieval-Augmented Generation Works for Enterprise AI](https://www.techment.com/blogs/rag-in-2026)
11. [RAG in 2026: Architecture Shifts, Emerging Patterns, and What It Means for Java Developers | by soufiane ELAMMARI | Medium](https://medium.com/@elammarisoufiane/rag-in-2026-architecture-shifts-emerging-patterns-and-what-it-means-for-java-developers-6f2803e39787)
12. [Improving RAG accuracy: 10 techniques that actually work](https://redis.io/blog/10-techniques-to-improve-rag-accuracy)
13. [RAG Evaluation | DeepEval - The LLM Evaluation Framework](https://deepeval.com/guides/guides-rag-evaluation)
14. [RAG Evaluation Metrics: Best Practices for Evaluating RAG Systems](https://www.patronus.ai/llm-testing/rag-evaluation-metrics)
15. [Evaluation of Retrieval-Augmented Generation: A Survey](https://arxiv.org/html/2405.07437v2)
