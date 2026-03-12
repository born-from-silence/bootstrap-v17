# EUR-Lex-Sum Teaching Companion
## Detailed Explanations and Discussion Points

---

## Section I: Foundational Knowledge

### Understanding EUR-Lex Platform

**What is EUR-Lex?**
EUR-Lex (https://eur-lex.europa.eu) is the official EU website containing all EU legal acts, including regulations, directives, decisions, and treaties. It's maintained by the Publications Office of the European Union and serves as the authoritative source for EU law.

**Key characteristics:**
- All documents are official translations from English originals
- Documents are available in all 24 official EU languages
- Structure includes: recitals (preamble), articles, annexes
- Documents receive Celex IDs that are consistent across languages

### Why Legal Domain Summarization Matters

Legal documents present unique challenges:

1. **Length**: Often 10,000+ tokens per document (compared to ~800 for news)
2. **Structure**: Complex hierarchical organization (sections, articles, subsections)
3. **Precision**: Factual accuracy is legally significant
4. **Specialized Vocabulary**: Technical terminology and references
5. **Cross-references**: Documents cite other documents extensively

### Understanding Dataset Statistics

**n-gram Novelty Explained:**
Measures the percentage of n-grams in the summary that DON'T appear in the source document. High novelty means the summary uses different words/phrases than the source (more abstractive). Low novelty means the summary copies directly from source (more extractive).

Example:
- Source: "The European Parliament adopted Directive 2019/1234 on March 15, 2019"
- Summary A: "Directive 2019/1234 was adopted in March 2019" (low novelty - uses same words)
- Summary B: "New EU legislation was introduced in spring 2019" (high novelty - rewords completely)

**Compression Ratio:**
source_length ÷ summary_length = compression_ratio

EUR-Lex-Sum has similar compression to news (~15:1) despite being much longer, meaning summaries are proportionally longer than news summaries.

---

## Section II: Applied Knowledge

### Why LexRank Was Selected

**Alternatives considered but rejected:**

1. **BERT-based extractive summarizers**: Require training on domain-specific data, which is scarce
2. **Abstractive models (BART, T5)**: Can't handle input lengths of ~12,000 tokens (limited to 512-4096 tokens)
3. **SummaRuNNer**: Requires sentence-aligned training data

**Why LexRank works:**
- Zero-shot: No training required
- Language-agnostic: Uses multilingual embeddings
- Handles paragraphs: Doesn't need sentence tokenization
- Genre-agnostic: Centrality works across domains

### The Paragraph Chunking Strategy

**Why paragraphs instead of sentences?**

Many languages in EUR-Lex-Sum lack reliable sentence tokenization in popular NLP libraries (NLTK, spaCy). Paragraphs are more consistent structural units across languages.

**Paragraph as discourse unit:**
- Preserves local coherence
- Maintains topical focus
- Easier cross-lingual alignment
- Reduces tokenization errors

---

## Section III: Critical Thinking

### Evaluating the "High Abstractivity" Claim

**Evidence Supporting:**
- 80%+ n-gram novelty across all n-gram sizes
- Significant vocabulary difference between source and summary
- Human-written summaries vs extractive snippets

**Potential Challenges:**
- Whitespace tokenization inflates novelty (legal references split differently)
- Some "novel" n-grams may just be reference patterns
- Doesn't measure semantic equivalence, just lexical difference
- No comparison to genuinely abstractive generation

### The Multi-Document Challenge

**The Problem:**
20-30% of summaries aggregate multiple legal acts. Do these represent:
- A multi-document summarization task?
- A noise problem to be filtered?
- A realistic but challenging scenario?

**Author's Solution:**
Pair with "longest associated document." Trade-off:
- Pros: Maintains single-document setup, increases n-gram novelty
- Cons: Loses information from other sources, may be misleading

**Research Question:**
How would a true multi-document summarization system perform on these 20-30%? Would it better capture the summary intent?

### ROUGE Limitations for Legal Summarization

**Standard ROUGE Issues:**
1. N-gram matching doesn't capture paraphrasing
2. Ignores factual consistency
3. Length-based scoring can be gamed
4. No domain-specific understanding

**Legal-Specific Issues:**
1. Citation accuracy matters more than BLEU/ROUGE
2. Wrong factual claims have legal consequences
3. Technical terminology must be preserved
4. Cross-references need verification

**Better Alternatives?**
- FactCC or QuestEval for factuality
- Custom citation-matching metrics
- Human evaluation with legal experts
- Information unit (IU) extraction

---

## Section IV: Advanced Topics

### Cross-Lingual Summarization Paradigms

**Existing Approaches:**

1. **Translate-then-Summarize (TtS)**
   - Translate input to high-resource language
   - Summarize in that language
   - Translate output back
   
2. **Summarize-then-Translate (StT)**
   - Summarize in source language
   - Translate summary to target
   
3. **Joint Cross-Lingual Summarization**
   - Directly generate target-language summary from source
   - Requires parallel training data

**EUR-Lex-Sum Assessment:**
The paper shows TtS struggles - even with good MT, summarization quality degrades. This suggests direct cross-lingual summarization (approach 3) is needed.

### Long-Form Model Challenges

**Current Limitations:**
1. **Attention complexity**: O(n²) for full self-attention
2. **Memory constraints**: GPU memory limits batch sizes
3. **Training stability**: Longer contexts harder to optimize
4. **Evaluation cost**: Longer texts = slower inference

**Approaches:**
1. **Sparse attention**: Longformer (sliding window), BigBird (random+global)
2. **Hierarchical**: Encode paragraphs, then cross-attend
3. **Memory mechanisms**: Compressive transformers, RMT
4. **Chunking**: Process segments, aggregate

**EUR-Lex-Sum Opportunity:**
Perfect testbed for long-form models with real-world constraints (need for factual accuracy, structure awareness)

### The European Language Bias

**What "European Language Bias" Means:**
- All languages are Indo-European (mostly)
- High-resource for NLP (abundant data)
- Legal framework is civil law tradition
- Mostly left-to-right scripts
- Alphabet-based writing systems

**What It Excludes:**
- Right-to-left languages (Arabic, Hebrew)
- Character-based languages (Chinese, Japanese, Korean)
- Low-resource languages of EU (none - all well-resourced)
- Other legal traditions (common law, sharia law, etc.)

**Why It's Still Valuable:**
- First cross-lingual legal dataset at this scale
- Tests feasibility of multi-lingual legal NLP
- Includes truly low-resource languages (Irish, Maltese)
- Enables transfer learning research

---

## Discussion Questions

### For a Study Group

1. **Why might manual summaries be both an advantage and limitation?**
   - Advantage: Higher quality, demonstrates what's possible
   - Limitation: Expensive, not scalable, may not match practical needs

2. **If you were designing this dataset today (2024), what would you do differently?**
   - Consider adding question-answering annotations
   - Include revision history for documents
   - Add citation networks between documents
   - Consider multimodal elements (PDF structures)

3. **How might this dataset contribute to fairness in legal AI?**
   - Equal access to law across languages
   - Enables tools for less-resourced EU languages
   - But: Legal expertise still required, can't replace lawyers

4. **What are the risks of automated legal summarization?**
   - Missing important details
   - Incorrect interpretations
   - Over-reliance by non-experts
   - Bias amplification from training data

### Technical Deep Dives

1. **Implementing Paragraph-Level LexRank**
   ```python
   # Pseudocode for the modified LexRank
   def modified_lexrank(document, lang):
       # Get multilingual embeddings
       paragraphs = split_into_paragraphs(document)
       embeddings = sentence_transformer.encode(paragraphs)
       
       # Compute cosine similarity matrix
       similarity_matrix = cosine_similarity(embeddings)
       
       # Apply PageRank to similarity graph
       scores = pagerank(similarity_matrix)
       
       # Select top paragraphs based on compression ratio
       target_length = avg_compression * len(paragraphs)
       selected = select_top_k(paragraphs, scores, target_length)
       
       return selected
   ```

2. **Why does LED + translate underperform LexRank-EN?**
   - Context truncation during translation
   - Loss of long-range dependencies
   - Translation errors compound
   - Extractive methods more robust to noise

---

## Connections to Broader NLP

### MultiEURLEX Connection

The same research group (Chalkidis et al.) created MultiEURLEX for multi-label classification. EUR-Lex-Sum extends this to summarization.

**Synergies:**
- Same domain data
- Could use classification labels for conditional summarization
- Legal categories could guide summary structure

### Beyond Summarization

How might EUR-Lex-Sum support:

1. **Legal question answering**: Summaries = potential answers
2. **Document alignment**: Parallel corpus for MT
3. **Pre-training**: Domain-adapted legal language models
4. **Information extraction**: Structured data from legal texts
5. **Citation analysis**: Understanding legal reference patterns

---

## Additional Resources

### Related Papers to Read

1. **Longformer** (Beltagy et al., 2020): Sparse attention for long documents
2. **BillSum** (Kornilova & Eidelman, 2019): US legal summarization dataset
3. **XLSum** (Hasan et al., 2021): Large-scale multilingual summarization
4. **Global Voices** (Nguyen & Daumé III, 2019): Cross-lingual news summarization

### Tools and Code

- **Dataset repository**: https://github.com/achouhan93/eur-lex-sum
- **Sentence-transformers**: For multilingual embeddings
- **Longformer**: For long document encoding
- **Hugging Face Datasets**: For easy data loading

### Legal NLP Primer

If new to legal NLP, key concepts:

- **Regulations vs Directives**: Types of EU legal acts
- **Civil vs Common Law**: Different legal traditions
- **Recitals**: Preamble explaining rationale
- **Official Journal**: Publication where laws appear
- **Entry into force**: When laws become effective

---

## Summary: Why EUR-Lex-Sum Matters

1. **Domain expansion**: Moves beyond news/wikipedia
2. **Multilingual**: First legal dataset at 24-language scale
3. **Cross-lingual**: Parallel across languages, enabling transfer
4. **Long-form**: Tests models on realistic document lengths
5. **Quality**: Professional human-written summaries
6. **Open problems**: Extends frontier of summarization research

**Impact**: Enables research on under-explored but practically important domain where mistakes have real consequences.

