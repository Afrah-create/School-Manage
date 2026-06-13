import type { StructureSetupInput, StructureSetupResult, StructureStatus } from "@uganda-cbc-sms/shared";
import {
  buildALevelClasses,
  buildOLevelClasses,
  UGANDA_3_TERMS,
} from "@uganda-cbc-sms/shared";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { createAcademicYear } from "./academic.service";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(base: string, months: number): string {
  const d = new Date(`${base}T12:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatDate(d);
}

function addDays(base: string, days: number): string {
  const d = new Date(`${base}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

async function resolveYearId(input: StructureSetupInput): Promise<string> {
  if (input.academicYearId) {
    const check = await query(`SELECT id FROM academic_years WHERE id = $1`, [input.academicYearId]);
    if (!check.rowCount) throw new HttpError(404, "Academic year not found");
    return input.academicYearId;
  }
  if (!input.createYear) {
    throw new HttpError(400, "Provide academicYearId or createYear");
  }
  const created = await createAcademicYear({
    ...input.createYear,
    isActive: input.activateYear ?? true,
  });
  return created.id;
}

export async function getStructureStatus(academicYearId?: string): Promise<StructureStatus> {
  let yearId = academicYearId ?? null;
  if (!yearId) {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM academic_years WHERE is_active = true ORDER BY start_date DESC LIMIT 1`,
    );
    yearId = rows[0]?.id ?? null;
  }
  if (!yearId) {
    return {
      academicYearId: null,
      terms: 0,
      oLevelClasses: 0,
      aLevelClasses: 0,
      termsComplete: false,
      classesComplete: false,
    };
  }

  const { rows } = await query<{
    terms: string;
    o_level: string;
    a_level: string;
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM terms WHERE academic_year_id = $1) AS terms,
       (SELECT COUNT(*)::text FROM classes WHERE academic_year_id = $1 AND level = 'O_LEVEL') AS o_level,
       (SELECT COUNT(*)::text FROM classes WHERE academic_year_id = $1 AND level = 'A_LEVEL') AS a_level`,
    [yearId],
  );
  const row = rows[0];
  const terms = Number(row?.terms ?? "0");
  const oLevelClasses = Number(row?.o_level ?? "0");
  const aLevelClasses = Number(row?.a_level ?? "0");

  return {
    academicYearId: yearId,
    terms,
    oLevelClasses,
    aLevelClasses,
    termsComplete: terms >= 3,
    classesComplete: oLevelClasses >= 4 || aLevelClasses >= 2,
  };
}

export async function provisionStructure(input: StructureSetupInput): Promise<StructureSetupResult> {
  return withTransaction(async () => {
    const academicYearId = await resolveYearId(input);

    if (input.activateYear) {
      await query(`UPDATE academic_years SET is_active = false`);
      await query(`UPDATE academic_years SET is_active = true WHERE id = $1`, [academicYearId]);
    }

    const { rows: yearRows } = await query<{ start_date: string; end_date: string }>(
      `SELECT start_date::text AS start_date, end_date::text AS end_date FROM academic_years WHERE id = $1`,
      [academicYearId],
    );
    const yearStart = yearRows[0]?.start_date?.slice(0, 10) ?? `${new Date().getFullYear()}-02-01`;

    let termsCreated = 0;
    if (input.installTerms) {
      for (const term of UGANDA_3_TERMS) {
        const startDate = addMonths(yearStart, term.startMonthOffset);
        const endDate = addDays(addMonths(startDate, term.durationMonths), -1);
        const result = await query(
          `INSERT INTO terms (academic_year_id, term_number, start_date, end_date, is_active)
           SELECT $1::uuid, $2::int, $3::date, $4::date, $5::boolean
           WHERE NOT EXISTS (
             SELECT 1 FROM terms WHERE academic_year_id = $1::uuid AND term_number = $2::int
           )`,
          [academicYearId, term.termNumber, startDate, endDate, term.termNumber === 1],
        );
        termsCreated += result.rowCount ?? 0;
      }
    }

    const template = input.classTemplate ?? "BOTH";
    const classDefs =
      template === "NONE"
        ? []
        : template === "O_LEVEL_S1_S4"
          ? buildOLevelClasses(input.oLevelStreams)
          : template === "A_LEVEL_S5_S6"
            ? buildALevelClasses(input.aLevelStreams)
            : [...buildOLevelClasses(input.oLevelStreams), ...buildALevelClasses(input.aLevelStreams)];

    let classesCreated = 0;
    for (const cls of classDefs) {
      const result = await query(
        `INSERT INTO classes (name, stream, level, academic_year_id, curriculum_track)
         SELECT $1::varchar, $2::varchar, $3::varchar, $4::uuid, $5::varchar
         WHERE NOT EXISTS (
           SELECT 1 FROM classes
           WHERE academic_year_id = $4::uuid AND name = $1::varchar AND stream = $2::varchar AND level = $3::varchar
         )`,
        [cls.name, cls.stream, cls.level, academicYearId, cls.curriculumTrack ?? null],
      );
      classesCreated += result.rowCount ?? 0;
    }

    return {
      academicYearId,
      termsCreated,
      classesCreated,
      activatedYear: Boolean(input.activateYear),
    };
  });
}
