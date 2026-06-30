/** Default Uganda CBC / NCDC Lower Secondary catalogue (tenant installs via curriculum setup). */

export type CatalogSubject = {
  code: string;
  name: string;
};

export type CatalogStrand = {
  code: string;
  name: string;
  subStrands: string[];
};

/**
 * NCDC Lower Secondary teaching subjects (21 national menu items).
 * Schools offer 12 at S1–S2: 11 compulsory + at least 1 elective.
 * CRE and IRE are separate catalog entries; learners take one RE offering (or both
 * where the school provides both — override compulsorySubjectCodes in assessment_config).
 */
export const DEFAULT_O_LEVEL_SUBJECTS: CatalogSubject[] = [
  // Compulsory at S1–S2 (11)
  { code: "ENG", name: "English" },
  { code: "MATH", name: "Mathematics" },
  { code: "PHY", name: "Physics" },
  { code: "CHEM", name: "Chemistry" },
  { code: "BIO", name: "Biology" },
  { code: "GEO", name: "Geography" },
  { code: "HPE", name: "History and Political Education" },
  { code: "CRE", name: "Christian Religious Education" },
  { code: "IRE", name: "Islamic Religious Education" },
  { code: "KISW", name: "Kiswahili" },
  { code: "ENT", name: "Entrepreneurship" },
  { code: "PE", name: "Physical Education" },
  // Electives (school picks at least 1 for S1–S2; more as the school scales)
  { code: "LIT", name: "Literature in English" },
  { code: "ART", name: "Art and Design" },
  { code: "PFA", name: "Performing Arts" },
  { code: "AGR", name: "Agriculture" },
  { code: "TAD", name: "Technology and Design" },
  { code: "ICT", name: "ICT" },
  { code: "NFT", name: "Nutrition and Food Technology" },
  { code: "FRE", name: "French" },
  { code: "GER", name: "German" },
  { code: "ARA", name: "Arabic" },
  { code: "CHI", name: "Chinese" },
  { code: "LOCL", name: "Local Language (school-specific)" },
];

/**
 * Default compulsory O-Level subjects for UCE certification (school may override in assessment_config).
 * Religious Education: CRE is the default compulsory code; schools offering IRE instead should
 * replace CRE with IRE (or configure both offerings) in assessment_config.compulsorySubjectCodes.
 */
export const DEFAULT_O_LEVEL_COMPULSORY_SUBJECT_CODES = [
  "ENG",
  "MATH",
  "PHY",
  "CHEM",
  "BIO",
  "GEO",
  "HPE",
  "CRE",
  "KISW",
  "ENT",
  "PE",
] as const;

export const DEFAULT_A_LEVEL_SUBJECTS: CatalogSubject[] = [
  { code: "GP", name: "General Paper" },
  { code: "MATH", name: "Mathematics" },
  { code: "PHY", name: "Physics" },
  { code: "CHEM", name: "Chemistry" },
  { code: "BIO", name: "Biology" },
  { code: "HIS", name: "History" },
  { code: "GEO", name: "Geography" },
  { code: "DIV", name: "Divinity" },
  { code: "ECON", name: "Economics" },
  { code: "LIT", name: "Literature" },
  { code: "ENT", name: "Entrepreneurship" },
  { code: "ICT", name: "ICT" },
];

export const A_LEVEL_TRACK_SUBJECT_CODES = {
  SCIENCES: ["GP", "MATH", "PHY", "CHEM", "BIO", "ICT"],
  ARTS: ["GP", "HIS", "GEO", "DIV", "ECON", "LIT", "ENT"],
  GENERAL: ["GP", "MATH", "ICT"],
} as const;

export type ALevelTrackKey = keyof typeof A_LEVEL_TRACK_SUBJECT_CODES;

export const DEFAULT_CBC_STRANDS_BY_SUBJECT_CODE: Record<string, CatalogStrand[]> = {
  ENG: [
    {
      code: "LISTEN",
      name: "Listening and Speaking",
      subStrands: ["Oral communication", "Pronunciation and fluency"],
    },
    {
      code: "READ",
      name: "Reading",
      subStrands: ["Comprehension", "Vocabulary development"],
    },
    {
      code: "WRITE",
      name: "Writing",
      subStrands: ["Composition", "Functional writing"],
    },
    {
      code: "GRAM",
      name: "Grammar and Language",
      subStrands: ["Sentence structure", "Language use"],
    },
  ],
  MATH: [
    {
      code: "NUM",
      name: "Numbers and Operations",
      subStrands: ["Whole numbers", "Fractions and decimals", "Ratio and proportion"],
    },
    {
      code: "ALG",
      name: "Algebra",
      subStrands: ["Expressions", "Equations and inequalities"],
    },
    {
      code: "GEOM",
      name: "Geometry and Measurement",
      subStrands: ["Shapes and space", "Measurement"],
    },
    {
      code: "DATA",
      name: "Data Handling",
      subStrands: ["Statistics", "Probability"],
    },
  ],
  // TODO(ncdc-strands): Source strand/sub-strand names from official NCDC syllabus PDFs
  // (https://ncdc.go.ug/resource) before production use — do not invent placeholder names.
  PHY: [],
  CHEM: [],
  BIO: [],
  GEO: [
    {
      code: "PHYSGEO",
      name: "Physical Geography",
      subStrands: ["Physical geography"],
    },
    {
      code: "HUMGEO",
      name: "Human Geography",
      subStrands: ["Human geography"],
    },
  ],
  HPE: [],
  CRE: [
    {
      code: "BIB",
      name: "Biblical Studies",
      subStrands: ["Old Testament themes", "New Testament themes"],
    },
    {
      code: "MORAL",
      name: "Christian Living",
      subStrands: ["Values and ethics", "Service and leadership"],
    },
  ],
  // TODO(ncdc-strands): Source from NCDC IRE syllabus PDFs at ncdc.go.ug/resource.
  IRE: [],
  KISW: [],
  ENT: [],
  ICT: [
    {
      code: "COMP",
      name: "Computer Skills",
      subStrands: ["Word processing", "Spreadsheets", "Presentation"],
    },
    {
      code: "NET",
      name: "Digital Literacy",
      subStrands: ["Internet safety", "Online research"],
    },
  ],
  LIT: [
    {
      code: "PROSE",
      name: "Prose and Drama",
      subStrands: ["Character and plot", "Themes"],
    },
    {
      code: "POETRY",
      name: "Poetry",
      subStrands: ["Imagery and tone", "Structure"],
    },
  ],
  ART: [
    {
      code: "CREATE",
      name: "Creative Production",
      subStrands: ["Drawing", "Design"],
    },
    {
      code: "APPREC",
      name: "Art Appreciation",
      subStrands: ["Elements of art", "Local art forms"],
    },
  ],
  PE: [
    {
      code: "FIT",
      name: "Physical Fitness",
      subStrands: ["Athletics", "Games and sports"],
    },
    {
      code: "HEALTH",
      name: "Health and Wellness",
      subStrands: ["Nutrition", "Personal safety"],
    },
  ],
};
