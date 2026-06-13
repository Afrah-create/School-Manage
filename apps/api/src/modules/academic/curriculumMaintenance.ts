import type {
  CurriculumCatalogSeedInput,
  CurriculumClassTracksInput,
  CurriculumSetupInput,
  CurriculumSetupResult,
  CurriculumStatus,
} from "@uganda-cbc-sms/shared";
import {
  A_LEVEL_TRACK_SUBJECT_CODES,
  DEFAULT_A_LEVEL_SUBJECTS,
  DEFAULT_CBC_STRANDS_BY_SUBJECT_CODE,
  DEFAULT_O_LEVEL_SUBJECTS,
} from "@uganda-cbc-sms/shared";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";

function slugSubStrandCode(name: string, index: number): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10);
  return `${base || "SS"}${index + 1}`.slice(0, 20);
}

export async function seedDefaultSubjects(level: CurriculumCatalogSeedInput["level"] = "ALL") {
  let subjectsCreated = 0;
  const batches: Array<{ level: "O_LEVEL" | "A_LEVEL"; items: typeof DEFAULT_O_LEVEL_SUBJECTS }> = [];
  if (level === "ALL" || level === "O_LEVEL") {
    batches.push({ level: "O_LEVEL", items: DEFAULT_O_LEVEL_SUBJECTS });
  }
  if (level === "ALL" || level === "A_LEVEL") {
    batches.push({ level: "A_LEVEL", items: DEFAULT_A_LEVEL_SUBJECTS });
  }

  for (const batch of batches) {
    for (const subject of batch.items) {
      const result = await query(
        `INSERT INTO subjects (name, code, level)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, code, level) DO UPDATE SET
           name = EXCLUDED.name`,
        [subject.name, subject.code, batch.level],
      );
      subjectsCreated += result.rowCount ?? 0;
    }
  }

  return { subjectsCreated };
}

export async function seedDefaultCbcStrands() {
  let strandsCreated = 0;
  let subStrandsCreated = 0;

  const { rows: subjectRows } = await query<{ id: string; code: string }>(
    `SELECT id, code FROM subjects WHERE level = 'O_LEVEL'`,
  );
  const subjectByCode = new Map(subjectRows.map((row) => [row.code, row.id]));

  for (const [subjectCode, strands] of Object.entries(DEFAULT_CBC_STRANDS_BY_SUBJECT_CODE)) {
    const subjectId = subjectByCode.get(subjectCode);
    if (!subjectId) continue;

    for (const strand of strands) {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO cbc_strands (
           subject_id,
           name,
           strand_name,
           code,
           competencies,
           updated_at
         )
         VALUES ($1::uuid, $2::varchar, $2::varchar, $3::varchar, '[]'::jsonb, NOW())
         ON CONFLICT (code, subject_id) DO UPDATE SET
           name = EXCLUDED.name,
           strand_name = EXCLUDED.strand_name,
           updated_at = NOW()
         RETURNING id`,
        [subjectId, strand.name, strand.code],
      );
      const strandId = rows[0]?.id;
      if (!strandId) continue;
      strandsCreated += 1;

      for (let i = 0; i < strand.subStrands.length; i += 1) {
        const subName = strand.subStrands[i]!;
        const subCode = slugSubStrandCode(subName, i);
        const subResult = await query(
          `INSERT INTO cbc_sub_strands (strand_id, name, code, updated_at)
           SELECT $1::uuid, $2::varchar, $3::varchar, NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM cbc_sub_strands WHERE strand_id = $1::uuid AND code = $3::varchar
           )`,
          [strandId, subName, subCode],
        );
        subStrandsCreated += subResult.rowCount ?? 0;
      }
    }
  }

  return { strandsCreated, subStrandsCreated };
}

export async function seedCurriculumCatalog(input: CurriculumCatalogSeedInput) {
  const { subjectsCreated } = await seedDefaultSubjects(input.level);
  if (!input.includeStrands) {
    return { subjectsCreated, strandsCreated: 0, subStrandsCreated: 0 };
  }
  const strandResult = await seedDefaultCbcStrands();
  return { subjectsCreated, ...strandResult };
}

async function repairClassSubjectSubjectLevels() {
  await seedDefaultSubjects("ALL");
  const result = await query(
    `UPDATE class_subjects cs
     SET subject_id = s_ok.id,
         updated_at = NOW()
     FROM classes c,
          subjects s_wrong,
          subjects s_ok
     WHERE cs.class_id = c.id
       AND cs.subject_id = s_wrong.id
       AND s_ok.tenant_id = s_wrong.tenant_id
       AND s_ok.code = s_wrong.code
       AND s_ok.level = c.level
       AND c.level <> s_wrong.level`,
  );
  return result.rowCount ?? 0;
}

async function provisionOLevelClassSubjects(academicYearId: string, termId: string | null | undefined) {
  const result = await query(
    `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, term_id, created_at, updated_at)
     SELECT c.id, s.id, c.academic_year_id, $2::uuid, NOW(), NOW()
     FROM classes c
     CROSS JOIN subjects s
     WHERE c.academic_year_id = $1
       AND c.level = 'O_LEVEL'
       AND s.level = 'O_LEVEL'
     ON CONFLICT (class_id, subject_id, academic_year_id)
     DO UPDATE SET term_id = EXCLUDED.term_id, updated_at = NOW()`,
    [academicYearId, termId ?? null],
  );

  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM classes WHERE academic_year_id = $1 AND level = 'O_LEVEL'`,
    [academicYearId],
  );

  return {
    classSubjectsCreated: result.rowCount ?? 0,
    classesProcessed: Number(rows[0]?.count ?? "0"),
    classesSkippedNoTrack: 0,
  };
}

async function provisionALevelClassSubjects(academicYearId: string, termId: string | null | undefined) {
  let classSubjectsCreated = 0;
  const tracks = ["SCIENCES", "ARTS", "GENERAL"] as const;

  for (const track of tracks) {
    const codes = A_LEVEL_TRACK_SUBJECT_CODES[track];
    const result = await query(
      `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, term_id, created_at, updated_at)
       SELECT c.id, s.id, c.academic_year_id, $3::uuid, NOW(), NOW()
       FROM classes c
       INNER JOIN subjects s ON s.level = 'A_LEVEL' AND s.code = ANY($4::text[])
       WHERE c.academic_year_id = $1::uuid
         AND c.level = 'A_LEVEL'
         AND c.curriculum_track = $2::varchar
       ON CONFLICT (class_id, subject_id, academic_year_id)
       DO UPDATE SET term_id = EXCLUDED.term_id, updated_at = NOW()`,
      [academicYearId, track, termId ?? null, codes],
    );
    classSubjectsCreated += result.rowCount ?? 0;
  }

  const { rows } = await query<{
    processed: string;
    skipped: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE curriculum_track IS NOT NULL)::text AS processed,
       COUNT(*) FILTER (WHERE curriculum_track IS NULL)::text AS skipped
     FROM classes
     WHERE academic_year_id = $1 AND level = 'A_LEVEL'`,
    [academicYearId],
  );

  return {
    classSubjectsCreated,
    classesProcessed: Number(rows[0]?.processed ?? "0"),
    classesSkippedNoTrack: Number(rows[0]?.skipped ?? "0"),
  };
}

export async function provisionCurriculum(input: CurriculumSetupInput): Promise<CurriculumSetupResult> {
  const yearCheck = await query(`SELECT 1 FROM academic_years WHERE id = $1`, [input.academicYearId]);
  if (!yearCheck.rowCount) throw new HttpError(404, "Academic year not found");

  return withTransaction(async () => {
    let subjectsCreated = 0;
    let strandsCreated = 0;
    let subStrandsCreated = 0;

    if (input.installCatalog) {
      const catalog = await seedCurriculumCatalog({
        level: input.level === "O_LEVEL" ? "O_LEVEL" : "A_LEVEL",
        includeStrands: input.level === "O_LEVEL",
      });
      subjectsCreated = catalog.subjectsCreated;
      strandsCreated = catalog.strandsCreated;
      subStrandsCreated = catalog.subStrandsCreated;
    }

    await repairClassSubjectSubjectLevels();

    const provision =
      input.level === "O_LEVEL"
        ? await provisionOLevelClassSubjects(input.academicYearId, input.termId)
        : await provisionALevelClassSubjects(input.academicYearId, input.termId);

    return {
      installCatalog: input.installCatalog,
      subjectsCreated,
      strandsCreated,
      subStrandsCreated,
      classSubjectsCreated: provision.classSubjectsCreated,
      classesProcessed: provision.classesProcessed,
      classesSkippedNoTrack: provision.classesSkippedNoTrack,
    };
  });
}

export async function getCurriculumStatus(academicYearId: string): Promise<CurriculumStatus> {
  const yearCheck = await query(`SELECT 1 FROM academic_years WHERE id = $1`, [academicYearId]);
  if (!yearCheck.rowCount) throw new HttpError(404, "Academic year not found");

  const { rows } = await query<{
    o_level_subjects: string;
    a_level_subjects: string;
    cbc_strands: string;
    o_classes: string;
    o_class_subjects: string;
    o_fully: string;
    a_classes: string;
    a_sciences: string;
    a_arts: string;
    a_general: string;
    a_unset: string;
    a_class_subjects: string;
    a_fully: string;
  }>(
    `WITH o_counts AS (
       SELECT COUNT(*)::int AS n FROM subjects WHERE level = 'O_LEVEL'
     ),
     a_counts AS (
       SELECT COUNT(*)::int AS n FROM subjects WHERE level = 'A_LEVEL'
     ),
     strand_counts AS (
       SELECT COUNT(*)::int AS n FROM cbc_strands
     ),
     o_classes AS (
       SELECT id FROM classes WHERE academic_year_id = $1 AND level = 'O_LEVEL'
     ),
     a_classes AS (
       SELECT id, curriculum_track FROM classes WHERE academic_year_id = $1 AND level = 'A_LEVEL'
     ),
     o_slots AS (
       SELECT oc.id AS class_id, COUNT(cs.id)::int AS slot_count
       FROM o_classes oc
       LEFT JOIN class_subjects cs
         ON cs.class_id = oc.id AND cs.academic_year_id = $1
       GROUP BY oc.id
     ),
     a_slots AS (
       SELECT ac.id AS class_id, ac.curriculum_track, COUNT(cs.id)::int AS slot_count
       FROM a_classes ac
       LEFT JOIN class_subjects cs
         ON cs.class_id = ac.id AND cs.academic_year_id = $1
       GROUP BY ac.id, ac.curriculum_track
     )
     SELECT
       (SELECT n FROM o_counts)::text AS o_level_subjects,
       (SELECT n FROM a_counts)::text AS a_level_subjects,
       (SELECT n FROM strand_counts)::text AS cbc_strands,
       (SELECT COUNT(*) FROM o_classes)::text AS o_classes,
       (SELECT COALESCE(SUM(slot_count), 0) FROM o_slots)::text AS o_class_subjects,
       (SELECT COUNT(*) FROM o_slots os CROSS JOIN o_counts oc
         WHERE os.slot_count >= oc.n AND oc.n > 0)::text AS o_fully,
       (SELECT COUNT(*) FROM a_classes)::text AS a_classes,
       (SELECT COUNT(*) FROM a_classes WHERE curriculum_track = 'SCIENCES')::text AS a_sciences,
       (SELECT COUNT(*) FROM a_classes WHERE curriculum_track = 'ARTS')::text AS a_arts,
       (SELECT COUNT(*) FROM a_classes WHERE curriculum_track = 'GENERAL')::text AS a_general,
       (SELECT COUNT(*) FROM a_classes WHERE curriculum_track IS NULL)::text AS a_unset,
       (SELECT COALESCE(SUM(slot_count), 0) FROM a_slots)::text AS a_class_subjects,
       (SELECT COUNT(*) FROM a_slots s
         WHERE s.curriculum_track IS NOT NULL
           AND s.slot_count >= CARDINALITY(
             CASE s.curriculum_track
               WHEN 'SCIENCES' THEN $2::text[]
               WHEN 'ARTS' THEN $3::text[]
               WHEN 'GENERAL' THEN $4::text[]
               ELSE ARRAY[]::text[]
             END
           ))::text AS a_fully`,
    [
      academicYearId,
      A_LEVEL_TRACK_SUBJECT_CODES.SCIENCES,
      A_LEVEL_TRACK_SUBJECT_CODES.ARTS,
      A_LEVEL_TRACK_SUBJECT_CODES.GENERAL,
    ],
  );

  const row = rows[0];
  const oLevelSubjects = Number(row?.o_level_subjects ?? "0");
  const aLevelSubjects = Number(row?.a_level_subjects ?? "0");

  return {
    academicYearId,
    catalog: {
      oLevelSubjects,
      aLevelSubjects,
      cbcStrands: Number(row?.cbc_strands ?? "0"),
      catalogAvailable: oLevelSubjects >= DEFAULT_O_LEVEL_SUBJECTS.length,
    },
    oLevel: {
      classes: Number(row?.o_classes ?? "0"),
      expectedSlotsPerClass: oLevelSubjects,
      classesFullyProvisioned: Number(row?.o_fully ?? "0"),
      totalClassSubjectRows: Number(row?.o_class_subjects ?? "0"),
    },
    aLevel: {
      classes: Number(row?.a_classes ?? "0"),
      byTrack: {
        SCIENCES: Number(row?.a_sciences ?? "0"),
        ARTS: Number(row?.a_arts ?? "0"),
        GENERAL: Number(row?.a_general ?? "0"),
        unset: Number(row?.a_unset ?? "0"),
      },
      classesFullyProvisioned: Number(row?.a_fully ?? "0"),
      classesMissingTrack: Number(row?.a_unset ?? "0"),
      totalClassSubjectRows: Number(row?.a_class_subjects ?? "0"),
    },
  };
}

export async function updateClassCurriculumTracks(input: CurriculumClassTracksInput) {
  if (!input.updates.length) return { updated: 0 };

  const values: unknown[] = [];
  const tuples = input.updates
    .map((update, index) => {
      const base = index * 2 + 1;
      values.push(update.classId, update.curriculumTrack);
      return `($${base}::uuid, $${base + 1}::varchar)`;
    })
    .join(", ");

  const result = await query(
    `UPDATE classes AS c
     SET curriculum_track = v.track
     FROM (VALUES ${tuples}) AS v(id, track)
     WHERE c.id = v.id`,
    values,
  );

  return { updated: result.rowCount ?? 0 };
}
