# EUR-Lex-Sum Quick Reference Card

## Paper Metadata
```
Title: EUR-Lex-Sum: A Multi- and Cross-lingual Dataset for Long-form 
       Summarization in the Legal Domain
Authors: Dennis Aumiller, Ashish Chouhan, Michael Gertz
Affiliation: Heidelberg University
arXiv: 2210.13448 (October 2022)
Code/Data: github.com/achouhan93/eur-lex-sum
```

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Languages | 24 |
| Documents per language | Up to 1,500 |
| Cross-lingual documents | 375 |
| Total pairs | 31,987 |
| Mean reference tokens | ~12,000 |
| Mean summary tokens | ~800 |
| Compression ratio | ~15:1 |
| n-gram novelty (1-gram) | ~85% |
| n-gram novelty (2-gram) | ~73% |

---

## Language Coverage

**Germanic**: German, Dutch, Danish, Swedish, English
**Romance**: French, Spanish, Italian, Portuguese, Romanian
**Slavic**: Polish, Czech, Bulgarian, Croatian, Slovene, Slovak
**Baltic**: Latvian, Lithuanian
**Uralic**: Finnish, Estonian, Hungarian
**Hellenic**: Greek
**Celtic**: Irish
**Semitic**: Maltese

---

## Dataset Splits

```
Training: Variable per language (majority of data)
Validation: 187 documents (all 24 languages)
Test: 188 documents (all 24 languages)
Total aligned: 375 documents
```

---

## Source Characteristics

**Origin**: EUR-Lex platform (eur-lex.europa.eu)
**Document Type**: EU Legal Acts (regulations, directives, decisions)
**Coverage**: 20 domains of EU legislation
**Time Span**: 1952-2022 (heavily post-1990)
**Format**: HTML (preferred over PDF)
**ID System**: Celex IDs (cross-lingual consistent)

---

## Summary Characteristics

**Type**: Human-written professional summaries
**Length Guideline**: 500-700 words
**Structure**: Template-based (see Figure 1 in paper)
**Origin**: English originals, translated to 23 languages
**Alignment**: Paragraph-level via HTML structure

---

## Comparison with Other Datasets

| Dataset | Domain | Languages | Cross-lingual | Avg Length |
|---------|--------|-----------|---------------|------------|
| CNN/DM | News | 1 | No | ~800 tokens |
| XLSum | News | 44 | Weak | ~500 tokens |
| MLSUM | News | 6 | No | ~800 tokens |
| BillSum | Legal (US) | 1 | No | ~5K words |
| WikiLingua | Wikipedia | 18 | Weak | Variable |
| **EUR-Lex-Sum** | **Legal (EU)** | **24** | **Yes** | **~12K tokens** |

---

## Key Methods from Paper

### Modification to LexRank
```
1. Use multilingual sentence-transformers for embeddings
2. Chunk at paragraph boundaries (not sentences)
3. Determine length from paragraph-level compression ratio
4. Apply standard LexRank centrality algorithm
5. Reconstruct summary from selected paragraphs
```

### Cross-lingual Baseline
```
1. Translate document to English (OPUS-MT)
2. Summarize with LED (Longformer Encoder-Decoder)
3. Translate summary back to target language
```

---

## Key Results

### Monolingual Baselines
| Language | ROUGE-1 | ROUGE-2 | ROUGE-L |
|----------|---------|---------|---------|
| English | 25.99 | 13.34 | 13.30 |
| French | 32.18 | 18.03 | 15.15 |
| German | 26.00 | 13.12 | 12.24 |
| Spanish | 27.04 | 16.43 | 14.75 |

Full table in paper Table 3.

### Cross-lingual Comparison
```
LED (translate-summarize-translate):     R-1: 31.67
LexRank-ES (monolingual Spanish):        R-1: 27.04
LexRank-EN (English, then translate):    R-1: 39.42  ← Best!
Oracle (gold translation):               R-1: 52.84
```

---

## Data Acquisition Pipeline

```
1. CRAWL: Extract legal acts from EUR-Lex
   - 5.5M web requests over 1 month
   - Store in Elasticsearch
   
2. FILTER: Quality control
   - Keep only HTML documents
   - Remove PDF-only documents
   - For multi-doc summaries: keep longest document
   - Require reference > summary length
   
3. ALIGN: Cross-lingual setup
   - Group by Celex ID
   - Extract 375 documents in all 24 languages
   - Split into Val (187) / Test (188)
   
4. PROCESS: Text preparation
   - Paragraph alignment via HTML structure
   - Whitespace tokenization
   - Create language-specific splits
```

---

## Limitations Noted in Paper

1. **External Links**: Links to related documents not followed
2. **Multi-document summaries**: 20-30% aggregate multiple sources
3. **Version History**: Only most recent versions included
4. **Evaluation**: ROUGE has known limitations
5. **Domain Specific**: EU-focused; not other legal systems
6. **Translation Bias**: All from English originals

---

## Open Problems Identified

1. **Extreme Length**: Mean 12K tokens exceeds model limits
2. ** Hierarchical Structure**: Not explicitly modeled
3. **Cross-lingual**: Direct methods vs translate-pipe
4. **Low-resource**: Performance on smaller language subsets
5. **Factual Consistency**: Need better than n-gram metrics

---

## Citation

```bibtex
@article{aumiller2022eurlexsum,
  title={EUR-Lex-Sum: A Multi- and Cross-lingual Dataset for 
         Long-form Summarization in the Legal Domain},
  author={Aumiller, Dennis and Chouhan, Ashish and Gertz, Michael},
  journal={arXiv preprint arXiv:2210.13448},
  year={2022}
}
```

---

## Paper Structure

```
1. Introduction            - What's wrong with existing datasets
2. Related Work            - EU data sources, legal NLP, XLS
3. Dataset                 - Construction & acquisition
4. Exploratory Analysis    - Statistics & quality
5. Experiments             - Baselines (LexRank, cross-lingual)
6. Conclusion              - Future work
7. Limitations             - Known issues
Broader Impact             - Ethics
```

---

## Key Figures & Tables

**Figure 1**: Example summary structure (shows template)
**Figure 2**: Temporal distribution (post-1990 bias)
**Figure 3**: Token length distributions (Zipfian for refs, normal for summaries)
**Figure 4**: HTML availability by language (varies)

**Table 1**: n-gram novelty comparison (single vs multi-doc)
**Table 2**: Dataset properties (min/max lengths, compression)
**Table 3**: LexRank results (24 languages)
**Table 4**: Cross-lingual results (English-Spanish)
**Table 5**: Language statistics (in Appendix)

---

## Technical Requirements

**For Baseline Replication:**
- Python 3.8+
- sentence-transformers
- scikit-learn (for LexRank)
- transformers (for LED)
- Elasticsearch (optional, for crawling)

**For Evaluation:**
- ROUGE scoring (disable stemming)
- Paragraph-level alignment
- Language-specific tokenization (if available)

---

## Related Research Directions

1. **Long-form Models**: Test Longformer, BigBird, etc.
2. **Hierarchical**: Two-level (paragraph + document) encoding
3. **Factual**: Factuality-aware evaluation metrics
4. **Cross-lingual**: Direct source→target summarization
5. **Structured**: Template-guided generation
6. **Domain-adapted**: Legal pre-training

---

## Prerequisite Knowledge

**Papers to Read First:**
- LexRank (Erkan & Radev, 2004) - Baseline algorithm
- Longformer (Beltagy et al., 2020) - Long document transformer
- BillSum (Kornilova & Eidelman, 2019) - Prior legal dataset
- Zero-shot XLS survey (Wang et al., 2022) - Cross-lingual context

**Concepts:**
- Extractive vs Abstractive summarization
- ROUGE evaluation metrics
- Cross-lingual transfer
- Transformer context windows
- Legal document structure

