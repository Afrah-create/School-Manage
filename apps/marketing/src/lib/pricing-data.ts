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
    description: "For school groups managing more than one campus.",
    features: [
      "Everything in Growing School",
      "Separate records and staff accounts for each campus",
      "Coordinated setup for groups with multiple sites",
      "Choose which modules each school uses (fees, exams, analytics, and more)",
      "Dedicated onboarding and support planning",
    ],
  },
] as const;
