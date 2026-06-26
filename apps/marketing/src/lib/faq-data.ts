import type { FaqItem } from "@/components/FaqAccordion";

export const faqItems: FaqItem[] = [
  {
    question: "How are O-Level and A-Level handled in the same system?",
    answer:
      "O-Level (S1 to S4) and A-Level (S5 to S6) use separate assessment flows aligned to their curricula. O-Level follows CBC: competency ratings (A to E), project work for continuous assessment, end-of-cycle exams, and Result 1/2/3 certification. A-Level follows UNEB conventions: numerical scores convert to grades, points, and divisions. Both share the same student records, academic structure, and reporting tools.",
  },
  {
    question: "Does SchoolManage work on slow connections or 3G?",
    answer:
      "SchoolManage is a web application. You need an internet connection to sign in and save data. The interface is lightweight for typical school-day use on desktop or mobile browsers. It is not an offline-first app. We recommend a stable connection, including 3G or better, for assessment entry and report generation.",
  },
  {
    question: "How is our school data kept secure?",
    answer:
      "Staff sign in with their own email and password. Each person sees only the screens and data allowed for their role — teachers enter assessments, bursars handle fees, headteachers approve reports. Your school's records are kept separate from other schools. Connections are encrypted, sessions time out after inactivity, and access is logged for accountability.",
  },
  {
    question: "Can we record mobile money fee payments?",
    answer:
      "Yes. The bursar can record payments by cash or mobile money and enter the mobile money transaction reference. Invoices, balances, and financial reports are kept in Ugandan shillings (UGX). Automated payment gateway integration is not part of the current release. Payments are recorded manually after you receive them.",
  },
  {
    question: "Can one organisation manage multiple schools?",
    answer:
      "Yes. School groups and organisations with more than one campus can use SchoolManage with a dedicated setup for each school. Each campus keeps its own student records, staff accounts, and settings. Contact us to discuss how this fits your group and which modules each school needs.",
  },
  {
    question: "How is data backed up?",
    answer:
      "Regular backups are part of the hosted service. Before go-live we agree recovery expectations with your school. If you need copies of your data for your own records, contact us to discuss export options.",
  },
  {
    question: "Do you provide training and onboarding?",
    answer:
      "New schools go through a guided setup for academic years, classes, subjects, and grading scales. We provide onboarding support to help administrators configure CBC and UNEB rules correctly. Training scope and format depend on your plan. Contact us to discuss what your staff need.",
  },
  {
    question: "How do we get support?",
    answer:
      "Reach us through the contact form on this site or by email. For schools already using the product, your administrator can escalate issues through the channels agreed at onboarding. We aim to respond to setup and billing questions promptly during business hours.",
  },
  {
    question: "Are SMS notifications to parents available?",
    answer:
      "Not yet. SMS notifications for fees, attendance, or report cards are on the product roadmap and are not live in the current release. Schools should continue using their existing communication channels until this feature ships.",
  },
  {
    question: "Is there a parent portal?",
    answer:
      "A parent portal for viewing fees, attendance, and report cards is planned but not available yet. Parents cannot sign in today. We will announce it when it is ready for schools to use.",
  },
];
