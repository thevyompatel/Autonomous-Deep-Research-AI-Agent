# Retrieval-Augmented Generation: Working Principles and Main Failure Modes

## Executive summary
Retrieval-Augmented Generation (RAG) is an architectural framework that improves Large Language Models (LLMs) by fetching relevant external information at query time and supplying it as context before generating a response [1][2]. Instead of relying solely on static training data, RAG grounds outputs in verifiable, up-to-date data to reduce hallucinations [1][2][3]. However, RAG systems encounter multiple failure modes across their pipeline stages—ranging from data quality and retrieval inaccuracies to generation errors—which can be mitigated through targeted optimization techniques and evaluated using specialized component-level and end-to-end metrics [5][6][13][20].

---

## How RAG Works: Core Components and Workflow
RAG links AI models to external knowledge bases (such as internal data, journals, or specialized datasets) to provide relevant, high-quality responses [1][3]. At a high level, the RAG architecture integrates retrieval and generation through the following core components and workflow steps:

1. **Document Ingestion and Chunking**: Raw documents are split into smaller chunks (using strategies like fixed-size, recursive, or document-specific chunking) to maintain context and allow effective searching [1][8][17]. Chunk size directly affects performance: smaller chunks improve precision but lose context, while larger chunks preserve context but add noise [1].
2. **Embedding Generation and Vector Storage**: Chunks and user queries are converted into high-dimensional vector representations (embeddings) using an embedding model [1][2][5]. These embeddings are stored in a vector database, which enables fast semantic and similarity search [1][2][21]. 
3. **Retrieval**: At query time, the user's input is embedded and matched against stored vectors to fetch the top-k most relevant text chunks [1][2][13]. Advanced retrieval methods include hybrid search (combining dense vector similarity with sparse keyword matching like BM25) and reranking models to prioritize the most relevant results [8][12][13].
4. **Prompt Construction and Generation**: An augmented prompt merges the original user query with the retrieved text chunks, providing structured context to the generator (the LLM) [1][2][10]. The generator takes both inputs to produce a grounded, coherent, and factually accurate response [1][2].

Compared to fine-tuning, RAG is more cost-effective, scalable, and requires no model retraining when underlying data changes [1][2][3].

---

## Main RAG Failure Modes
Many RAG pipelines fail in production, often starting upstream or during retrieval rather than solely at the model generation step [6][8][20]. Failures can be categorized across pipeline stages:

### 1. Data Quality and Ingestion Failures
- **Stale or Outdated Data**: Semantic similarity has no correlation with document recency, leading retrievers to surface outdated documents over current ones with high confidence (data freshness rot) [20].
- **Conflicting Information**: When indexes contain contradictory facts, the LLM fabricates a resolution rather than acknowledging uncertainty, producing confidently wrong answers [20].
- **Dataset Bias**: Inherent biases in input text or embedding models skew system responses [5].

### 2. Retrieval Failures
- **Missing Content and Suboptimal Chunks**: The knowledge base lacks the answer, or poor chunking breaks ideas across boundaries, leading to missing context or irrelevant noise [1][6][8]. 
- **Embedding Mismatch and Naive Search**: General embedding models fail to capture domain-specific terminology (such as jargon or part numbers), and pure vector search struggles to distinguish conceptual similarity from actual relevance [8][12].
- **Retrieval Errors**: Systems can retrieve irrelevant documents (distractors) or suffer from incomplete retrieval where crucial documents are missed due to restrictive search parameters or poor indexing [5][6]. Furthermore, missing top-ranked documents occurs when correct information is retrieved but ranked too low by the ranker [6].
- **Over-Retrieving Context**: Retrieving too much context overwhelms the LLM and produces unclear results [1].

### 3. Generation and Pipeline Failures
- **Extraction and Context Failures**: Even when correct context is retrieved, the LLM may fail to extract information due to noise or ambiguity, or fail to make the text into its context window due to truncation issues [6].
- **Hallucination and Incorrect Specificity**: The model hallucinates information not in the dataset, provides answers in the wrong format, or returns responses that are too broad or too narrow [6].
- **Incomplete Answers**: Responses are only partially correct because they lack full coverage of multi-part questions [6].
- **Operational Pitfalls**: Treating RAG as a one-time setup without continuous re-indexing causes performance to silently degrade over time [1].

---

## RAG Optimization and Improvement Techniques
To address these bottlenecks and improve accuracy, several optimization techniques are employed across the pipeline:

- **Hybrid Search**: Combining dense vector search with keyword matching (such as BM25) bridges the gap between semantic recall and exact-term precision, raising retrieval recall and answer accuracy on complex tasks [12].
- **Advanced Chunking and Parsing**: Utilizing layout-aware parsing and semantic-boundary chunking preserves document structure, headings, and tables rather than flattening text into arbitrary chunks [8][12].
- **Query Transformations and Expansion**: Using query rewriting, sub-query decomposition, or hypothetical document embeddings (HyDE) clarifies vague inputs, breaks down complex queries, and improves retrieval metrics [12][16].
- **Reranking**: Applying a reranker model as a second step scores candidate chunks against the query so top results match intent rather than just topic [8][13].
- **Embedding Adaptation**: Fine-tuning embedding models on domain-specific vocabulary boosts retrieval performance [8][16].

---

## Evaluation Metrics for RAG Pipelines
Evaluating RAG requires assessing both the retriever and generator independently, as system performance depends on both components [13][18]. 

### Retrieval Evaluation Metrics
- **Contextual Relevancy**: Evaluates whether the retrieved context is relevant to the input and free of irrelevancies [13][18].
- **Contextual Recall**: Determines whether the retrieval context contains all the information required to produce the ideal output (measuring if the system retrieves all relevant items) [13][18][19].
- **Contextual Precision**: Evaluates whether more relevant nodes/documents are ranked higher in the retrieval context than irrelevant ones [13][18].
- **Binary Relevance Metrics (Precision@k, Recall@k, F1@k, and Mean Reciprocal Rank)**: Quantify the precision and position of relevant documents within the top-k results [19]. *Note: Sources indicate that RAG accuracy on governed data reaches 85–92%, whereas ungoverned data drops to 45–60% [20].*

### Generation Evaluation Metrics
- **Answer Relevancy**: Evaluates how relevant the generated response is to the given input [13][18].
- **Faithfulness**: Evaluates whether the generator outputs information that avoids hallucinations and does not contradict factual information present in the retrieval context [13][18].

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
16. [10 Ways to Improve the Performance of Retrieval Augmented Generation Systems | Towards Data Science](https://towardsdatascience.com/10-ways-to-improve-the-performance-of-retrieval-augmented-generation-systems-5fa2cee7cd5c)
17. [Top 10 Techniques to Improve RAG Applications — Agenta Blog](https://agenta.ai/blog/top-10-techniques-to-improve-rag-applications)
18. [RAG Evaluation Metrics: Assessing Answer Relevancy, Faithfulness, Contextual Relevancy, And More - Confident AI](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)
19. [RAG Evaluation: Don’t let customers tell you first | Pinecone](https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/rag-evaluation)
20. [RAG Accuracy Problems: Why They Happen and How to Fix Them](https://atlan.com/know/rag-accuracy-problems)
21. [RAG: Fundamentals, Challenges, and Advanced Techniques | Label Studio](https://labelstud.io/blog/rag-fundamentals-challenges-and-advanced-techniques)
