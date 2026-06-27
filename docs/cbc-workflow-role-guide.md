# CBC competency workflow — role guide

This guide explains how **SchoolManage** handles NCDC O-Level competency assessment from school setup through teacher entry, headteacher review, and admin oversight. It complements the policy document [uganda-cbc-assessment.md](./uganda-cbc-assessment.md) and the API reference [api-cbc-competency-endpoints.md](./api-cbc-competency-endpoints.md).

---

## 1. Overview

CBC competency assessment in SchoolManage follows the **activity → rating → term summary** model aligned with NCDC’s four-level descriptor scale:

| Stored value | Display label |
|--------------|---------------|
| `exceeds_expectations` | Exceeds Expectations |
| `meets_expectations` | Meets Expectations |
| `approaching_expectations` | Approaching Expectations |
| `below_expectations` | Below Expectations |

**High-level flow:**

1. **Admin** configures academic structure, subjects, CBC strands, and grading policy.
2. **Subject teacher** (or **class teacher** when assigned to a subject) creates **assessment activities**, enters competency levels per learner, and **locks** each activity when complete.
3. The system **aggregates** all activity ratings for a learner + subject + term into a **term competency summary** (most frequent level; ties favour the higher rank).
4. **Headteacher** reviews summaries and may **override** a competency with a written justification.
5. **Admin** monitors progress read-only on the CBC oversight screen before report cards.
6. **Project work** and **formal exams** run in parallel — they feed continuous assessment and end-of-cycle grades but are separate from the competency activity grid.

---

## 2. Roles and permissions

| Role | CBC competency tasks |
|------|----------------------|
| **Admin** | Academic setup, strands, class subjects, grading policy; read-only term summaries |
| **Subject teacher** | Create activities, enter ratings, lock activities, learning outcomes, project work (if assigned) |
| **Class teacher** | Same as subject teacher **for subjects they are assigned to**; homeroom duties do not grant CBC entry without a subject assignment |
| **Headteacher** | Review term summaries, override with justification, legacy sheet unlock (old flow only) |
| **Bursar / others** | No CBC entry |

---

## 3. Admin — setup (do this before teachers enter data)

### 3.1 Academic structure

**Path:** Academic → Years, Terms, Classes

1. Create the **academic year** and set curriculum form (S1–S4) where applicable.
2. Create **terms** for that year.
3. Create **O-Level classes** (e.g. S1 · A) linked to the year.

Without this, teachers will not see assignments.

### 3.2 Subjects and class assignments

**Path:** Academic → Subjects, Class subjects, Teacher assignments

1. Ensure the **subject catalogue** includes O-Level subjects (e.g. ART — Art and Design).
2. Under **Class subjects**, assign subjects to each class for the academic year.
3. Under **Teacher assignments**, assign each subject teacher to the correct class + subject + year.

Only assigned teachers see a class/subject on **Assessment → CBC**.

### 3.3 CBC strands and competencies

**Path:** Academic → CBC strands

1. For each O-Level subject, define **strands** and **competencies** (sub-strands).
2. These names must match what teachers rate against in the competency grid.

Competency UUIDs are resolved from strand configuration and term-summary data after the first ratings exist.

### 3.4 Assessment policy and grading

**Path:** Assessment → Rules, Academic → Grading scales

1. **Assessment rules** — compulsory subjects, minimum subjects for certification, CA weights (default 20% CA / 80% EOC).
2. **Grading scales (O-Level)** — apply CBC A–E defaults for **composite final grades** (distinct from the four-level competency descriptors).
3. **O-Level CA policy** — projects per term, year window for cumulative CA, fallback rating map.

Teachers need policy in place before report cards; competency activities can start once strands and assignments exist.

### 3.5 Admin oversight (read-only)

**Path:** Assessment → CBC competency oversight

1. Select year, class, term, subject, and **learner**.
2. View **term competency summary** — one row per competency with:
   - **Report level** — level used on reports (honours headteacher override).
   - **From activities** — auto-aggregated level from teacher ratings.
3. Use **previous / next learner** to walk the class without re-picking filters.

If the summary is empty, teachers have not yet saved ratings for that learner, subject, and term — see Section 5.

---

## 4. Headteacher — review and override

**Path:** Assessment → CBC assessments

### 4.1 Term summary review

Same filters as admin. For each competency you see:

- **Report level** — effective level after aggregation (and override if any).
- **Notes** — either “Auto-aggregated from teacher activity ratings” or override details with justification.

### 4.2 Override (when needed)

1. Click **Override** on a competency row.
2. Choose the **report level** (four-level selector).
3. Enter a **justification** (required; submit stays disabled until non-empty).
4. Confirm — the effective level updates; override is auditable on the row.

Use overrides sparingly when professional judgement differs from the automatic most-frequent aggregation.

### 4.3 Legacy sheet unlock

Below the summary panel, **Legacy CBC sheet progress** applies only to the **old strand sheet** submit/unlock flow. New assessment uses **per-activity lock**; teachers cannot edit a locked activity without a future unlock feature on activities.

---

## 5. Subject teacher & class teacher — daily workflow

**Path:** Assessment → CBC → choose assignment → **Enter**

Both roles use the **same screens**. Class teachers only see subjects they are assigned to teach.

### 5.1 Choose assignment

From the assignments list, pick **academic year**, **term**, and the **class + subject** row, then open **Enter**.

### 5.2 Tab: Activities & ratings (competency descriptors)

This is the **primary NCDC competency path**.

#### Step A — Create an assessment activity

1. Open **Activities & ratings**.
2. Fill in **activity type** (assignment, project, group work, practical, participation, presentation, test).
3. Enter **title** and **activity date**.
4. Click **Create activity**.

Each activity is one graded event (e.g. “Term 1 practical — colour mixing”).

#### Step B — Enter competency levels

1. Select the activity from the dropdown.
2. Optionally filter by **strand** if the subject has many competencies.
3. In the grid, **rows = learners**, **columns = competencies**.
4. For each cell, choose a level: Exceeds / Meets / Approaching / Below Expectations.
5. Click **Save ratings**.

You can save partial grids and return later while the activity is unlocked.

#### Step C — Lock the activity

When all ratings for that event are final:

1. Click **Lock activity**.
2. Confirm — locking is **irreversible** from the teacher account.

Locked activities are view-only. Ratings feed term-summary aggregation.

**Repeat** Steps A–C for each test, assignment, or practical in the term.

### 5.3 Tab: Project work (official CA)

**Path:** same entry screen → **Project work (official CA)**

1. Enter **scored project work** per learner (score / max per project slot).
2. This drives **official continuous assessment** for composite grades — not the four-level descriptor grid.
3. Configure expected projects per term under admin **O-Level CA policy**.

### 5.4 Tab: Learning outcomes

**Path:** same entry screen → **Learning outcomes**

1. **Add outcome** — pick strand, write description, save.
2. **Record achievement** — pick outcome, learner, achievement level (same four-level scale), optional remark.

Learning outcomes supplement strand competencies for finer tracking.

### 5.5 Formal exams (EOC)

**Path:** Exams (not CBC Assessment)

Enter **end-of-cycle exam marks** linked to report cards. EOC combines with project CA for final A–E subject grades.

---

## 6. How term summaries are calculated

For each **learner + subject + term + competency**:

1. Collect all **competency ratings** from **all assessment activities** in that term.
2. Apply **most-frequent** level across those ratings.
3. If two levels tie, pick the **higher** rank (Exceeds > Meets > Approaching > Below).
4. Store in `term_competency_summary`.
5. If the headteacher sets an override, **report level** = override; otherwise report level = aggregated level.

Opening the oversight or headteacher screen triggers a refresh of cached summary rows for that scope.

---

## 7. What appears on report cards

- Strand/competency lines use **report levels** from term summaries (four-level labels).
- **Subject summaries** also show CA %, EOC %, composite, and final A–E grade from project work + exams — see [uganda-cbc-assessment.md](./uganda-cbc-assessment.md).
- Certification (Result 1 / 2 / 3) uses composite grades and project completion — not the descriptor grid alone.

---

## 8. Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Empty term summary | No activity ratings saved for that learner/subject/term | Teacher: create activity → rate → save |
| Subject missing from teacher list | Not assigned on timetable | Admin: Teacher assignments |
| No competencies in grid | Strands not configured or IDs not resolved | Admin: CBC strands; ensure at least one rating exists |
| Cannot save ratings | Activity locked | Create a new activity or headteacher legacy unlock (old flow only) |
| Admin sees empty class | No learners enrolled | Admin: Students → enrolment |
| Project CA “incomplete” on reports | Missing project slots | Teacher: Project work tab; Admin: CA policy |

---

## 9. Quick reference — menu paths

| Task | Who | Menu path |
|------|-----|-----------|
| Configure strands | Admin | Academic → CBC strands |
| Assign teachers | Admin | Academic → Teacher assignments |
| Create activity & rate | Subject / class teacher | Assessment → CBC → Enter → Activities & ratings |
| Lock activity | Subject / class teacher | Same → Lock activity |
| Project scores | Subject / class teacher | Assessment → CBC → Enter → Project work |
| Learning outcomes | Subject / class teacher | Assessment → CBC → Enter → Learning outcomes |
| Review summaries | Headteacher | Assessment → CBC assessments |
| Override competency | Headteacher | Same → Override |
| Oversight (read-only) | Admin | Assessment → CBC competency oversight |
| Exam marks | Subject / class teacher | Exams |
| Report cards | Admin / headteacher | Reports |

---

## 10. Related documents

- [uganda-cbc-assessment.md](./uganda-cbc-assessment.md) — CA/EOC composite, Result 1/2/3, report fields
- [api-cbc-competency-endpoints.md](./api-cbc-competency-endpoints.md) — REST endpoints for integrations

---

*Last updated for NCDC 4-level activity-based competency assessment (SchoolManage).*
