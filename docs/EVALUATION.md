> This document primarily describes the current implementation in the repository.  
> Sections explicitly labeled **Future Improvements**, **Recommendations**, or **Production Enhancements** describe proposed upgrades that are not yet implemented.

# Evaluation Documentation

## YouTube RAG Assistant

This document describes the evaluation framework used to measure retrieval quality, answer quality, hallucination risk, and overall RAG system performance for YouTube RAG Assistant.

The evaluation framework exists to ensure the AI system remains reliable, grounded, and production-ready as prompts, retrieval strategies, models, and infrastructure evolve.

---

# 1. Evaluation Goals

The evaluation system is designed to answer critical questions about the platform:

### Routing Quality

* Did the intent router classify the user question correctly?
* Was the correct answer workflow selected?

### Retrieval Quality

* Did retrieval return relevant transcript chunks?
* Were the most useful chunks ranked near the top?

### Generation Quality

* Did the LLM generate a relevant answer?
* Was the answer grounded in transcript context?

### Production Quality

* Was latency acceptable?
* Were responses stable and consistent?

The evaluation framework helps detect regressions after:

* Prompt changes
* Retrieval tuning
* Model upgrades
* Infrastructure changes
* Feature additions

---

# 2. Evaluation Architecture

```text
Evaluation Input
      |
      v
Eval Runner
      |
      +--> Execute API Call
      +--> Capture Response
      +--> Run Quality Checks
      +--> Compute Metrics
      +--> Generate Report
      |
      v
MongoDB EvalReports
```

Main evaluation components:

| Component              | Responsibility                 |
| ---------------------- | ------------------------------ |
| `evalCases.js`         | Defines benchmark test cases   |
| `evalRunner.js`        | Executes evaluation suite      |
| `groundednessJudge.js` | Evaluates transcript grounding |
| `evalReport.js`        | Builds final report            |
| `evalReporterStore.js` | Persists reports to MongoDB    |

---

# 3. Evaluation Categories

The platform evaluates multiple query types because different workflows stress different parts of the RAG pipeline.

## 3.1 Video Overview

Tests summary-based response quality.

Example:

```text
What is this video about?
```

Validates:

* Summary generation quality
* Overview completeness
* Main takeaway coverage

---

## 3.2 Specific Q&A

Tests full hybrid retrieval pipeline.

Example:

```text
What did the speaker say about pricing?
```

Validates:

* Retrieval relevance
* Ranking quality
* Grounded answer generation

---

## 3.3 Topic Overview

Tests topic-based understanding.

Example:

```text
Explain the AI regulation section.
```

Validates:

* Topic retrieval
* Topic summary quality
* Context completeness

---

## 3.4 Entity Overview

Tests entity-aware retrieval.

Example:

```text
What did Elon Musk discuss?
```

Validates:

* Entity extraction
* Entity retrieval
* Entity summarization

---

## 3.5 Timestamp Query

Tests timestamp-aware retrieval.

Example:

```text id="66w0mk"
When did they discuss GPU costs?
```

Validates:

* Timestamp extraction
* Timestamp accuracy
* Correct transcript chunk selection

---

## 3.6 Action Extraction

Tests content generation workflows.

Examples:

```text id="u3n3s6"
Create detailed notes
```

```text id="5zzv0g"
Generate LinkedIn post
```

Validates:

* Structured output formatting
* Coverage of important content
* Practical usefulness

---

## 3.7 Guest Summary

Tests public no-auth workflow.

Validates:

* Guest transcript processing
* Summary generation
* Temporary session creation

---

## 3.8 Guest Q&A

Tests temporary guest transcript context.

Validates:

* Guest retrieval quality
* Session handling
* Response grounding

---

# 4. Evaluation Metrics

The evaluation framework uses multiple metrics because no single metric can fully describe RAG quality.

---

## 4.1 Relevance Score

Measures how well the answer addresses the user question.

Questions:

* Did the answer actually answer the question?
* Was the response on-topic?
* Did it avoid irrelevant details?

Score range:

```text id="0n0m8j"
0.0 → completely irrelevant
1.0 → perfectly relevant
```

Examples:

* High relevance → directly answers user question
* Low relevance → generic or unrelated answer

---

## 4.2 Groundedness Score

Measures whether the answer is supported by retrieved transcript context.

Questions:

* Is every important claim supported by evidence?
* Did the model invent information?
* Does answer align with transcript?

This is one of the most important metrics in RAG systems.

High groundedness means:

* Low hallucination risk
* High trustworthiness
* Better user confidence

---

## 4.3 Completeness Score

Measures whether important details are missing.

Questions:

* Did answer include major points?
* Did it miss critical context?
* Was summary sufficiently informative?

Examples:

Low completeness:

```text id="drfizf"
AI was discussed.
```

High completeness:

```text id="i6g5wq"
The speaker discussed AI regulation, model safety, compute costs, and long-term governance concerns.
```

---

## 4.4 Latency Score

Measures end-to-end response speed.

Includes:

* Routing time
* Retrieval time
* Prompt construction
* LLM generation
* Response serialization

Latency matters because even accurate AI feels poor if too slow.

---

## 4.5 Hallucination Risk

Measures probability of unsupported AI output.

Indicators of hallucination:

* Named entities absent from transcript
* Unsupported numbers/statistics
* External facts not present in context
* Confident unsupported claims

Risk levels:

| Level  | Meaning                        |
| ------ | ------------------------------ |
| Low    | Strong transcript grounding    |
| Medium | Minor unsupported claims       |
| High   | Significant hallucination risk |

---

# 5. Weighted Scoring

The framework combines multiple metrics into a final score.

```text id="qtdj0p"
weightedScore =
  relevance × 0.30 +
  groundedness × 0.30 +
  completeness × 0.25 +
  latency × 0.15
```

Weight rationale:

| Metric       | Weight | Reason                        |
| ------------ | ------ | ----------------------------- |
| Relevance    | 30%    | Answer must solve user intent |
| Groundedness | 30%    | Prevent hallucinations        |
| Completeness | 25%    | Ensure useful answers         |
| Latency      | 15%    | Maintain good UX              |

Groundedness and relevance receive highest priority because accuracy matters more than speed for knowledge applications.

---

# 6. Grade System

Final weighted scores are converted into grades.

| Score     | Grade |
| --------- | ----- |
| `>= 0.90` | A     |
| `>= 0.80` | B     |
| `>= 0.70` | C     |
| `>= 0.60` | D     |
| `< 0.60`  | F     |

Interpretation:

* **A** → Production ready
* **B** → Good quality, minor issues
* **C** → Acceptable but improvement needed
* **D/F** → Significant issues

# 7. Intent Validation

The evaluation framework verifies whether the router selected the correct intent for each query.

Example:

Expected:

```text id="y4a9g7"
TIMESTAMP_QUERY
```

Actual:

```text id="j6k2m1"
SPECIFIC_QA
```

This would fail intent validation.

Intent validation helps detect routing regressions after:

* Router rule changes
* New intent additions
* Prompt modifications

Why it matters:

Even if retrieval works well, selecting the wrong workflow can significantly reduce answer quality.

---

# 8. Mode Validation

The framework also validates whether the correct response mode was executed.

Examples:

| Query Type        | Expected Mode       |
| ----------------- | ------------------- |
| Video overview    | `summary`           |
| Specific Q&A      | `qa`                |
| Timestamp query   | `timestamp_query`   |
| Topic overview    | `topic_overview`    |
| Entity overview   | `entity_overview`   |
| Action extraction | `action_extraction` |

Mode validation ensures:

* Correct prompt templates
* Correct retrieval strategy
* Correct output formatting

---

# 9. Groundedness Judge

Groundedness can optionally be evaluated using an LLM-based judge.

Input to judge:

```text id="u7p9e2"
Question
Retrieved Context
Generated Answer
```

Judge evaluates:

* Are claims supported?
* Are unsupported facts present?
* Is answer faithful to transcript?

Output example:

```json
{
  "groundedness": 0.92,
  "hallucinationRisk": "low",
  "reason": "Answer aligns well with transcript context."
}
```

This provides deeper semantic evaluation beyond simple rule-based checks.

---

# 10. Evaluation Report Structure

Evaluation results are stored in MongoDB as `EvalReports`.

Core report fields:

| Field         | Purpose                  |
| ------------- | ------------------------ |
| `fileName`    | Unique report identifier |
| `videoId`     | Evaluated video          |
| `generatedAt` | Evaluation timestamp     |
| `total`       | Total test cases         |
| `passed`      | Passed cases             |
| `failed`      | Failed cases             |
| `passRate`    | Overall pass percentage  |
| `results`     | Individual case results  |
| `report`      | Full evaluation payload  |

Example summary:

```json
{
  "total": 24,
  "passed": 21,
  "failed": 3,
  "passRate": 87.5
}
```

This allows longitudinal benchmarking across model and retrieval changes.

---

# 11. Running Evaluations

Evaluations can be triggered via admin API.

Endpoint:

```text id="6kq1sh"
/api/evals/run
```

Example request:

```json
{
  "videoId": "mongo_video_id",
  "guestUrl": "https://www.youtube.com/watch?v=..."
}
```

Execution flow:

```text id="r1dj6n"
Load Eval Cases
     |
     v
Execute API Calls
     |
     v
Collect Responses
     |
     v
Compute Metrics
     |
     v
Generate Report
     |
     v
Persist Report
```

---

# 12. Current Limitations

Current evaluation limitations include:

### Limited Human Judgment

Some nuanced quality assessments still require human review.

### No Large Benchmark Dataset

The evaluation suite currently uses manually defined test cases.

### LLM Judge Bias

LLM-based judges can occasionally mis-score groundedness.

### No Automated CI Trigger

Evaluations are currently manually triggered.

---

# 13. Future Improvements

Recommended evaluation improvements:

* Larger benchmark dataset
* Human rating workflows
* Golden answer comparisons
* Retrieval precision@K measurement
* Recall measurement
* Mean Reciprocal Rank (MRR)
* Citation accuracy scoring
* Automated CI/CD regression checks
* Model-to-model benchmark comparisons

Future advanced evaluation categories:

### Retrieval Evaluation

Measure:

* Precision
* Recall
* Ranking quality

### Generation Evaluation

Measure:

* Faithfulness
* Helpfulness
* Conciseness
* Style consistency

### End-to-End Product Evaluation

Measure:

* User task success
* Satisfaction
* Engagement

---

# 14. Summary

The evaluation framework ensures the RAG system remains measurable, reliable, and continuously improvable.

It evaluates:

* Routing correctness
* Retrieval quality
* Generation quality
* Groundedness
* Hallucination risk
* Production latency

This framework helps transform YouTube RAG Assistant from a simple AI demo into a production-aware AI application with measurable quality standards.
