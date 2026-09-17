# LedgerDuck 2.0
## From SQL Querying to Accounting Data Investigation

### 1. The idea

LedgerDuck began with a relatively simple proposition:

> **Give accountants a friendly way to put Excel/CSV data into DuckDB and investigate it using SQL.**

That already makes it useful because DuckDB gives us a fast, local analytical engine without requiring a cloud database.

During exploration of what accountants actually need when looking at messy transaction data, a broader problem emerged.

An accountant often does not initially know the question they want to ask.

They may simply know:

> "Something looks messy here."

A 50,000-line transaction export might contain hundreds or thousands of variations in descriptions:

- Conveyance Expense
- Conveyance Expenses
- Taxi Fare
- Taxi charges
- Uber
- Cab from airport
- Airport taxi
- Local transportation

Traditional SQL can find these records if the accountant knows what to search for.

But the more interesting question is:

> **Can the system help the accountant discover the relationships that already exist inside the data?**

That led to the idea of a **Vocabulary Map**.

---

# 2. The key insight

The first instinct was to use AI or embeddings to understand similar descriptions.

But that may be unnecessary for the first version.

A large transaction dataset already contains a huge amount of information about its own language.

If a particular word occurs 2,104 times, appears alongside "taxi" 412 times, and is overwhelmingly associated with "Travel Expense", the dataset itself is telling us something.

Therefore:

> **Start with statistical and relational analysis. Add AI only where it provides genuine additional value.**

This is important because accounting data needs traceability.

The system should not say:

> "I think these transactions are similar because an AI model said so."

It should be able to say:

> "These words appeared together 412 times across 380 transactions."

And let the accountant investigate the evidence.

---

# 3. The new LedgerDuck concept

LedgerDuck becomes three complementary experiences.

### Query Room

The accountant asks questions using SQL or natural language assistance.

**Purpose:**
Query the data.

### Forensic Room

The accountant investigates unusual patterns, exceptions, duplicates and inconsistencies.

**Purpose:**
Find things worth looking at.

### Vocabulary Map

The accountant explores the language and relationships inside the dataset.

**Purpose:**
Discover how descriptions, words, phrases and accounting classifications relate to each other.

Together:

> **Query → Discover → Investigate → Verify**

That is considerably more useful than simply providing a SQL editor.

---

# 4. Vocabulary Map

The first version should be deliberately simple.

Imagine importing 50,000 transaction rows.

LedgerDuck creates a vocabulary catalogue.

| Word | Frequency | Lines |
|---|---:|---:|
| expense | 3,450 | 3,120 |
| conveyance | 2,104 | 1,890 |
| taxi | 1,245 | 1,120 |
| airport | 890 | 740 |
| invoice | 720 | 680 |

Every item is clickable.

Clicking **conveyance** reveals the underlying rows and related words.

For example:

```text
CONVEYANCE

2,104 occurrences

Frequently associated words:

taxi       412
fare       387
uber       214
cab        133
airport     91
```

The user can continue drilling down.

---

# 5. Stop-word filtering

Many words provide little useful information.

Examples:

- is
- are
- am
- was
- were
- being
- towards
- could
- should
- shall
- will
- the
- a
- an
- to
- for
- from

LedgerDuck should maintain a configurable stop-word dictionary.

The important word here is **configurable**.

Different datasets have different useful vocabulary.

For example, "paid" may be noise in one dataset but meaningful in another.

The user should therefore be able to:

- add words
- remove words
- create dataset-specific exclusions
- reset to defaults

---

# 6. Word similarity

The next layer examines relationships between words themselves.

For example:

```text
expense
expenses
```

should be recognised as highly similar.

Likewise:

```text
invoice
invoices
```

or:

```text
conveyance
conveyances
```

The initial implementation can use traditional string algorithms rather than AI.

Possible techniques include:

- Levenshtein distance
- edit distance
- common prefix
- common suffix
- character n-grams
- normalized token comparison

The system can therefore flag:

```text
expense
expenses

Possible textual variant
Similarity: 93%
```

However, similarity must not automatically mean equivalence.

For example:

```text
off
offer
```

might have high character similarity while being completely unrelated.

Therefore the system should distinguish between:

> **Textual similarity**

and:

> **Semantic equivalence**

The first can be calculated deterministically.

The second can be introduced later through embeddings or an LLM.

---

# 7. Co-occurrence analysis

This is one of the most important upgrades.

Instead of examining words individually, LedgerDuck should examine which words repeatedly appear together.

For example:

```text
airport + taxi
```

might occur 137 times.

LedgerDuck can report:

```text
airport + taxi

137 transactions

Related words:
fare
uber
cab
transfer
```

This creates the first layer of the Vocabulary Map.

The system is effectively learning the structure of the dataset without needing an AI model.

---

# 8. Cross-column relationships

This is where the project becomes particularly valuable for accounting.

Suppose the dataset contains:

```text
Date
Particulars
Ledger Head
Amount
Vendor
```

LedgerDuck can investigate:

```text
airport + taxi
```

inside the **Particulars** column and then examine what happens in the **Ledger Head** column.

For example:

```text
airport + taxi
137 transactions

Ledger Head:

Travel Expense              120
Miscellaneous Expense        17
```

This is much more interesting than simply knowing that "airport" and "taxi" are common words.

The system has discovered a relationship between:

> **description → accounting classification**

---

# 9. Exception discovery

Now LedgerDuck can identify deviations.

Suppose:

```text
airport + taxi
```

normally appears under:

```text
Travel Expense
```

But 17 transactions appear under:

```text
Miscellaneous Expense
```

LedgerDuck should not declare:

> "These 17 entries are wrong."

Instead:

> **17 unusual classification relationships detected.**

The accountant can inspect them.

Possible explanations might include:

- genuinely unusual transactions
- incorrect ledger classification
- different company policy
- historical bookkeeping practice
- intentionally miscellaneous expenditure
- inconsistent narration

The tool surfaces the question.

The accountant provides the answer.

---

# 10. Reverse investigation

The same mechanism should work in reverse.

Instead of asking:

> "Where does airport + taxi go?"

the user can ask:

> "What is hiding inside Miscellaneous Expense?"

LedgerDuck could produce:

```text
MISCELLANEOUS EXPENSE

airport + taxi       17
courier              14
flowers               8
client lunch          7
parking               6
...
```

This creates a powerful investigative workflow.

A ledger head that acts as a "miscellaneous bucket" can be explored through its underlying vocabulary.

---

# 11. The Vocabulary Graph

Eventually, the relationships can be represented visually.

Conceptually:

```text
                 airport
                    │
                    │
                  taxi
                /     \
               /       \
      Travel Expense   Misc Expense
          120              17
```

Or:

```text
CONVEYANCE
   │
   ├── taxi
   ├── cab
   ├── uber
   ├── fare
   └── airport
```

The visualisation is not the core analytical engine.

It is a **map of relationships discovered from the data**.

That is why the "Google Maps for vocabulary" analogy works.

The user can zoom into a concept and then drill down into the actual transactions.

---

# 12. SQL/DuckDB architecture

DuckDB should remain the analytical foundation.

A possible architecture:

```text
                 CSV / XLSX
                     │
                     ▼
              Import / Profiling
                     │
                     ▼
                  DuckDB
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Frequency   Co-occurrence  SQL
          │          │          │
          ▼          ▼          ▼
       Vocabulary  Relationships Queries
          │          │
          └──────┬───┘
                 ▼
           Vocabulary Map
                 │
                 ▼
          Human Investigation
```

Potential internal tables:

```text
transactions
words
word_occurrences
word_pairs
word_similarity
clusters
column_relationships
investigation_notes
```

The exact schema should be designed during implementation rather than locked prematurely.

---

# 13. Suggested implementation phases

## Phase 0: Understand the existing LedgerDuck codebase

Before modifying anything:

- inspect the current PondPilot fork
- identify the current DuckDB integration
- understand import/export
- understand the UI architecture
- identify where queries are executed
- identify existing state management
- identify how files are parsed
- document the current architecture

**Deliverable:**

A short LedgerDuck architecture document.

Do not start changing the application until this is understood.

---

# Phase 1: Dataset profiler

Build a basic profiler that runs automatically after import.

It should identify:

- row count
- column count
- column names
- data types
- null counts
- unique values
- frequency distributions
- likely text columns

For example:

```text
50,000 rows
7 columns

Particulars
Text
42,380 unique values

Ledger Head
Text
83 unique values

Amount
Numeric
```

This gives LedgerDuck an understanding of the dataset structure before investigation begins.

---

# Phase 2: Vocabulary engine

Build the first deterministic vocabulary engine.

Features:

- tokenization
- lowercase normalization
- punctuation handling
- stop-word filtering
- word frequency
- line/document frequency
- configurable stop words

Output:

```text
Word
Frequency
Number of rows
Percentage of dataset
```

Everything should remain linked to the original row IDs.

This is critical.

Never lose the ability to trace:

```text word
 → phrase
 → transaction
```

---

# Phase 3: Phrase and co-occurrence engine

Add:

- two-word combinations
- three-word combinations
- co-occurrence counts
- column-specific occurrence
- relationship strength

Example:

```text
airport + taxi
137 rows
```

The user should be able to click the result and immediately see the original rows.

---

# Phase 4: String similarity

Add deterministic word comparison.

Identify potential variants:

```text
expense ↔ expenses
invoice ↔ invoices
conveyance ↔ conveyances
```

Show these as:

> **Possible textual variants**

Do not merge them automatically.

Allow:

- Accept relationship
- Ignore relationship
- Create custom relationship

---

# Phase 5: Cross-column mapping

This is the accounting-focused layer.

Allow users to select:

```text
Source column: Particulars
Target column: Ledger Head
```

Then calculate relationships.

Example:

```text
airport + taxi

Travel Expense       120
Misc Expense           17
```

The user can reverse the direction:

```text
Miscellaneous Expense

airport + taxi        17
courier               14
parking                6
...
```

---

# Phase 6: Exception detection

Introduce simple statistical flags.

Examples:

- uncommon word
- uncommon phrase
- unusual word combination
- rare classification
- dominant classification with exceptions
- sudden vocabulary change
- duplicate-looking descriptions
- inconsistent spelling

Important:

These are **flags**, not accounting conclusions.

The UI language should consistently use:

> "Review"

rather than:

> "Error"

unless the user explicitly defines a rule that establishes an error.

---

# Phase 7: Vocabulary Map UI

Build the visual interface.

Possible layout:

```text
┌──────────────────────────────────────────────┐
│ Vocabulary Map                               │
├──────────────────────────────────────────────┤
│ Search vocabulary                            │
│                                              │
│ expense       3,450                          │
│ conveyance    2,104                          │
│ taxi          1,245                          │
│ airport         890                          │
│                                              │
├──────────────────────────────────────────────┤
│ Selected: taxi                               │
│                                              │
│ airport       412                            │
│ fare          387                            │
│ uber          214                            │
│ cab           133                            │
│                                              │
│ [View rows]                                  │
└──────────────────────────────────────────────┘
```

Later this can evolve into a proper graph visualization.

The first version does not need fancy graphics.

**Useful drill-down beats pretty bubbles.**

---

# Phase 8: SQL integration

Every discovery should be convertible into SQL.

For example:

```text
airport + taxi
```

could generate the underlying query.

This gives the user two ways to work:

**Visual investigation**

and

**SQL investigation**

They should lead to the same underlying data.

This also reinforces LedgerDuck's identity as a DuckDB tool rather than creating an unrelated AI application.

---

# Phase 9: Optional AI layer

Only after the deterministic system works should AI be introduced.

Potential uses:

### Cluster naming

Given:

```text
taxi
uber
cab
airport
fare
```

AI might suggest:

> Local Transportation

### Semantic similarity

Distinguish:

```text
taxi fare
cab charges
uber trip
```

from unrelated strings that happen to look similar.

### Natural-language explanation

For example:

> "Why is this group unusual?"

The AI can summarize the statistical evidence already calculated by LedgerDuck.

It should not invent the evidence.

---

# 14. Privacy philosophy

LedgerDuck should ideally remain local-first.

Accounting data frequently contains:

- employee information
- vendor information
- bank details
- transaction descriptions
- investment information
- internal company information

Therefore the deterministic Vocabulary Map should require **no external API**.

AI should be an optional enhancement.

Possible modes:

```text
LOCAL MODE
No data leaves the device.

AI MODE
Selected text/statistics are sent to the configured model.
```

This gives the accountant control.

---

# 15. Why this matters

Accounting data is often technically structured but **semantically messy**.

Two rows can represent essentially the same business activity while being written differently.

Conversely, two strings can look similar while representing completely different things.

Traditional data cleaning often focuses on:

- duplicate rows
- missing values
- invalid dates
- incorrect data types
- inconsistent formatting

LedgerDuck can investigate something different:

> **Inconsistency of meaning and classification inside otherwise valid data.**

That is much closer to the actual problem accountants encounter during ledger scrutiny.

---

# 16. What LedgerDuck should NOT become

The project should avoid becoming an "AI accountant".

It should not:

- automatically reclassify transactions
- silently rewrite narrations
- assume two descriptions mean the same thing
- manufacture missing information
- declare an accounting error without a defined rule
- replace accountant review

Instead:

> **LedgerDuck finds relationships. The accountant decides what they mean.**

That distinction should remain central to the product.

---

# 17. MVP definition

The first useful release does not need embeddings, LLMs or sophisticated machine learning.

### LedgerDuck Vocabulary Map MVP

It should be able to:

1. Import CSV/XLSX
2. Profile the dataset
3. Identify text columns
4. Tokenize text
5. Remove configurable stop words
6. Count word frequency
7. Show which rows contain a word
8. Calculate common word combinations
9. Calculate basic string similarity
10. Map phrases to another column
11. Show unusual relationships
12. Drill down to the original rows
13. Generate SQL for an investigation
14. Export the resulting data/query

If that works well, it is already a meaningful feature.

---

# 18. Longer-term vision

The evolution could look like:

```text
LedgerDuck
    │
    ├── Query Room
    │
    ├── Forensic Room
    │
    ├── Vocabulary Map
    │
    ├── Relationship Explorer
    │
    ├── Rule Engine
    │
    └── Optional AI Assistant
```

Eventually the system could understand relationships such as:

```text
Particulars
      ↓
Vocabulary
      ↓
Phrases
      ↓
Vendors
      ↓
Ledger Heads
      ↓
Amounts
      ↓
Dates
      ↓
Companies
```

At that point LedgerDuck becomes less like a SQL playground and more like a **local accounting-data investigation laboratory**.

---

# 19. The central product principle

The original LedgerDuck question was:

> **"Can an accountant query a spreadsheet using DuckDB?"**

The upgraded question becomes:

> **"Can an accountant explore a messy dataset, discover its internal language and relationships, investigate unusual patterns, and then use SQL to prove what they found?"**

That is the reason this feature is worth building.

It gives LedgerDuck a reason to exist beyond being a fork of PondPilot.

PondPilot provides the pond.

LedgerDuck starts building the **duck's field notebook**. 🦆

And the Vocabulary Map could become one of its most distinctive tools.