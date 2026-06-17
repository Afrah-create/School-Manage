# Uganda CBC Assessment (O-Level)

This document describes how **SchoolManage** aligns O-Level assessment and grading with UNEB/NCDC CBC policy. Confirm cut-points, year windows, and project counts against your school's current NCDC/UNEB circular before end-of-cycle reporting.

## §4 — A–E competency ratings

- Teachers record strand/competency ratings **A through E** (not A–D).
- Descriptors: A Exceptional, B Outstanding, C Satisfactory, D Basic, E Elementary.
- Ratings are stored in `assessments_cbc` and dual-synced to legacy `cbc_scores` when strand mapping exists.
- **Strand ratings are provisional fallback only** — they do not constitute official CA.

## §5 — 20/80 composite and project-work CA (HYBRID model)

- **Final subject grade** = `CA weight × CA + EOC weight × EOC` (default 20/80; configurable under **Grading scales → O-Level CA policy**).
- **Official CA** is derived from **scored project work** in `project_work_scores` (default **4 projects per term**, configurable).
- Cumulative CA aggregates project scores across a configurable **year window** (S1–S4, S3–S4, or custom forms). Set `curriculum_form` on each academic year under **Academic → Years**.
- **Fallback CA** (only when zero project scores exist in the window): strand ratings mapped via admin **fallback rating → %** table — labeled `strand_fallback` on reports; never shown as official.
- If required project slots are missing (and no admin override), CA is `incomplete` — not averaged into a final-looking number.
- **EOC (end of cycle)** comes from formal exam marks (`exam_marks`), normalized to 0–100.

Persisted composites live in `olevel_subject_results` with `ca_source`, `projects_completed`, `projects_expected`, and `formula_version`. Each explicit recompute appends a row to `olevel_subject_result_versions`.

**Recompute is explicit:** `npm run recalculate:olevel-grades` or **Grading scales → Recalculate O-Level grades**. Saving strand or project data does not auto-update published composites.

## §6 — Result 1 / 2 / 3 (divisions abolished at O-Level)

UCE certification is computed per student per academic year (`olevel_certification_status`):

| Code | Meaning |
|------|---------|
| **RESULT_1** | Qualifies for certificate |
| **RESULT_2** | Does not qualify (reasons stored) |
| **RESULT_3** | Every sat subject at grade E |

**Result 1** requires (configurable defaults):

- At least one subject at **D+** (grades A, B, C, or D)
- At least **8** subjects with final grades
- All **compulsory** subjects sat (catalog default: ENG, MATH, SCI, SST, CRE — overridable per school)
- **Official project-work CA** (`ca_source = project_work`) with required project slots complete for each sat subject

Result 2 stores explicit `reason_codes` (e.g. `ca_provisional_fallback`, `ca_incomplete_projects`, `missing_project`).

## §7 — Report card fields

CBC report payloads include:

- Strand-level competency lines (existing)
- **Subject summaries**: CA %, CA source label, EOC %, composite, final A–E grade, project completion counts
- **Certification** block: Result 1/2/3 label and reasons when applicable
- Class ranking uses **composite average** (not legacy best-8 points) when summaries exist

## A-Level

A-Level grading is unchanged (`grading_config.aLevel.scheme = legacy_uneb_points_v1`). Divisions and UNEB points still apply.

## Admin checklist

1. Apply O-Level CBC defaults on **Grading scales** (O-Level tab) if no scale exists.
2. Configure **O-Level CA policy** (weights, year window, projects/term, fallback map, verification dates).
3. Set **curriculum form (S1–S4)** on academic years for cumulative CA.
4. Configure **Assessment rules** (compulsory subjects, min subjects).
5. Teachers enter **project work** on CBC entry (Project work tab); strand ratings optional.
6. Enter EOC via formal exams.
7. Run **Recalculate O-Level grades** before generating report cards.
8. Verify certification reasons for incomplete or provisional CA.
