import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import type { z } from "zod";

const {
  academicYearSchema,
  termSchema,
  classSchema,
  subjectSchema,
  classSubjectSchema,
  combinationSchema,
  cbcStrandSchema,
} = sharedSchemas;

type YearIn = z.infer<typeof academicYearSchema>;
type TermIn = z.infer<typeof termSchema>;
type ClassIn = z.infer<typeof classSchema>;
type SubjectIn = z.infer<typeof subjectSchema>;
type ClassSubjectIn = z.infer<typeof classSubjectSchema>;
type ComboIn = z.infer<typeof combinationSchema>;
type CbcStrandIn = z.infer<typeof cbcStrandSchema>;

function mapYear(r: {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}) {
  return {
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    isActive: r.is_active,
  };
}

function mapTerm(r: {
  id: string;
  academic_year_id: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}) {
  return {
    id: r.id,
    academicYearId: r.academic_year_id,
    termNumber: r.term_number,
    startDate: r.start_date,
    endDate: r.end_date,
    isActive: r.is_active,
  };
}

function mapClass(r: {
  id: string;
  name: string;
  stream: string;
  level: string;
  academic_year_id: string;
  class_teacher_id: string | null;
}) {
  return {
    id: r.id,
    name: r.name,
    stream: r.stream,
    level: r.level,
    academicYearId: r.academic_year_id,
    classTeacherId: r.class_teacher_id,
  };
}

function mapSubject(r: { id: string; name: string; code: string; level: string }) {
  return { id: r.id, name: r.name, code: r.code, level: r.level };
}

export async function createAcademicYear(input: YearIn) {
  try {
    if (input.isActive) {
      await query(`UPDATE academic_years SET is_active = false`);
    }
    const { rows } = await query(
      `INSERT INTO academic_years (name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, COALESCE($4, false)) RETURNING *`,
      [input.name, input.startDate, input.endDate, input.isActive ?? false],
    );
    return mapYear(rows[0]! as never);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create academic year");
  }
}

export async function listAcademicYears() {
  try {
    const { rows } = await query(
      `SELECT * FROM academic_years ORDER BY start_date DESC`,
    );
    return (rows as never[]).map((r) => mapYear(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list years");
  }
}

export async function createTerm(input: TermIn) {
  try {
    if (input.isActive) {
      await query(`UPDATE terms SET is_active = false WHERE academic_year_id = $1`, [
        input.academicYearId,
      ]);
    }
    const { rows } = await query(
      `INSERT INTO terms (academic_year_id, term_number, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, false)) RETURNING *`,
      [
        input.academicYearId,
        input.termNumber,
        input.startDate,
        input.endDate,
        input.isActive ?? false,
      ],
    );
    return mapTerm(rows[0]! as never);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create term");
  }
}

export async function listTerms() {
  try {
    const { rows } = await query(`SELECT * FROM terms ORDER BY start_date`);
    return (rows as never[]).map((r) => mapTerm(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list terms");
  }
}

export async function createClass(input: ClassIn) {
  try {
    const { rows } = await query(
      `INSERT INTO classes (name, stream, level, academic_year_id, class_teacher_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.name, input.stream, input.level, input.academicYearId, input.classTeacherId ?? null],
    );
    return mapClass(rows[0]! as never);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create class");
  }
}

export async function listClasses() {
  try {
    const { rows } = await query(`SELECT * FROM classes ORDER BY name, stream`);
    return (rows as never[]).map((r) => mapClass(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list classes");
  }
}

export async function createSubject(input: SubjectIn) {
  try {
    const { rows } = await query(
      `INSERT INTO subjects (name, code, level) VALUES ($1, $2, $3) RETURNING *`,
      [input.name, input.code, input.level],
    );
    return mapSubject(rows[0]! as never);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Subject code already exists");
    throw new Error(e instanceof Error ? e.message : "Could not create subject");
  }
}

export async function listSubjects() {
  try {
    const { rows } = await query(`SELECT * FROM subjects ORDER BY code`);
    return (rows as never[]).map((r) => mapSubject(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list subjects");
  }
}

export async function createClassSubject(input: ClassSubjectIn) {
  try {
    const { rows } = await query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [input.classId, input.subjectId, input.teacherId ?? null],
    );
    return rows[0];
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Subject already assigned to class");
    throw new Error(e instanceof Error ? e.message : "Could not assign subject");
  }
}

export async function createCombination(input: ComboIn) {
  try {
    const { rows } = await query(
      `INSERT INTO subject_combinations (code, name, subjects) VALUES ($1, $2, $3::jsonb) RETURNING *`,
      [input.code, input.name, JSON.stringify(input.subjects)],
    );
    const r = rows[0]! as { id: string; code: string; name: string; subjects: unknown };
    return { id: r.id, code: r.code, name: r.name, subjects: r.subjects };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create combination");
  }
}

export async function listCombinations() {
  try {
    const { rows } = await query(`SELECT * FROM subject_combinations ORDER BY code`);
    return rows.map((r) => {
      const x = r as { id: string; code: string; name: string; subjects: unknown };
      return { id: x.id, code: x.code, name: x.name, subjects: x.subjects };
    });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list combinations");
  }
}

export async function createCbcStrand(input: CbcStrandIn) {
  try {
    const { rows } = await query(
      `INSERT INTO cbc_strands (subject_id, strand_name, competencies) VALUES ($1, $2, $3::jsonb) RETURNING *`,
      [input.subjectId, input.strandName, JSON.stringify(input.competencies)],
    );
    const r = rows[0]! as {
      id: string;
      subject_id: string;
      strand_name: string;
      competencies: unknown;
    };
    return {
      id: r.id,
      subjectId: r.subject_id,
      strandName: r.strand_name,
      competencies: r.competencies,
    };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create strand");
  }
}

export async function listCbcStrands(subjectId?: string) {
  try {
    const { rows } = subjectId
      ? await query(
          `SELECT * FROM cbc_strands WHERE subject_id = $1 ORDER BY strand_name`,
          [subjectId],
        )
      : await query(`SELECT * FROM cbc_strands ORDER BY strand_name`);
    return rows.map((r) => {
      const x = r as {
        id: string;
        subject_id: string;
        strand_name: string;
        competencies: unknown;
      };
      return {
        id: x.id,
        subjectId: x.subject_id,
        strandName: x.strand_name,
        competencies: x.competencies,
      };
    });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list strands");
  }
}
