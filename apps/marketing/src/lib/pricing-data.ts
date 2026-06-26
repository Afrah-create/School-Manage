export const pricingTiers = [
  {
    name: "Starter School",
    description: "For a single secondary school getting started with digital records.",
    features: [
      "Student enrolment and class management",
      "O-Level CBC assessment and report cards",
      "Role-based access for core staff roles",
      "Email support during onboarding",
    ],
  },
  {
    name: "Growing School",
    description: "For schools that need the full academic and finance toolkit.",
    features: [
      "Everything in Starter School",
      "A-Level UNEB assessment and divisions",
      "Fees, invoices, and mobile money recording",
      "Analytics dashboards and report approval workflow",
      "Attendance and timetable modules",
    ],
    highlighted: true,
  },
  {
    name: "Multi-Campus",
    description: "For school groups or operators managing more than one campus.",
    features: [
      "Everything in Growing School",
      "Separate tenant per school with isolated data",
      "Platform administration for provisioning schools",
      "Per-school module toggles (fees, exams, analytics, and more)",
      "Dedicated onboarding and support planning",
    ],
  },
] as const;
