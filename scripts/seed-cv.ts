import { prisma } from "@/lib/db";

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: bun scripts/seed-cv.ts <userId>");
  process.exit(1);
}

const mockCVs = [
  {
    title: "Software Engineer",
    personal: {
      fullName: "Budi Santoso",
      headline: "Senior Software Engineer",
      email: "budi.santoso@example.com",
      phone: "+62 812-3456-7890",
      location: "Jakarta, Indonesia",
      website: "https://budisantoso.dev",
      linkedin: "linkedin.com/in/budisantoso",
      github: "github.com/budisantoso",
    },
    summary:
      "Senior software engineer with 8+ years building scalable web applications using TypeScript, React, and Node.js. Experienced leading cross-functional teams and shipping products used by millions.",
    experience: [
      {
        company: "TechCorp Indonesia",
        role: "Senior Software Engineer",
        location: "Jakarta",
        startDate: "Jan 2021",
        endDate: "",
        current: true,
        description:
          "Lead engineer for a payments platform serving 2M+ users. Built microservices with Node.js and PostgreSQL, reduced API latency by 40%, and mentored 5 junior engineers.",
      },
      {
        company: "StartupHub",
        role: "Software Engineer",
        location: "Bandung",
        startDate: "Mar 2018",
        endDate: "Dec 2020",
        current: false,
        description:
          "Developed features for a B2B SaaS product using React and NestJS. Improved test coverage from 30% to 75% and introduced CI/CD pipelines.",
      },
      {
        company: "DigitalAgency",
        role: "Frontend Developer",
        location: "Jakarta",
        startDate: "Jun 2016",
        endDate: "Feb 2018",
        current: false,
        description:
          "Built responsive marketing sites and web apps for 15+ clients using React, vanilla JS, and CSS.",
      },
    ],
    education: [
      {
        school: "Institut Teknologi Bandung",
        degree: "Bachelor's Degree",
        field: "Informatics Engineering",
        startDate: "2012",
        endDate: "2016",
        gpa: "3.6/4.0",
      },
    ],
    skills: [
      { name: "TypeScript", level: 2 },
      { name: "React", level: 2 },
      { name: "Node.js", level: 2 },
      { name: "PostgreSQL", level: 2 },
      { name: "Docker", level: 3 },
      { name: "AWS", level: 3 },
      { name: "GraphQL", level: 3 },
      { name: "Tailwind CSS", level: 2 },
    ],
    interpersonal: [
      { name: "Team Leadership" },
      { name: "Mentoring" },
      { name: "Cross-team Communication" },
    ],
    languages: [
      { name: "Indonesian", level: "Native" },
      { name: "English", level: "Professional" },
      { name: "Japanese", level: "Beginner" },
    ],
    certifications: [
      {
        name: "AWS Certified Solutions Architect – Associate",
        issuer: "Amazon Web Services",
        date: "Jun 2023",
        url: "https://aws.amazon.com/verification",
        description: "",
      },
      {
        name: "Professional Scrum Master I (PSM I)",
        issuer: "Scrum.org",
        date: "Feb 2022",
        url: "",
        description: "",
      },
    ],
    organizations: [
      {
        name: "Indonesian Developers Community",
        role: "Chapter Lead",
        date: "2020 – Present",
        description:
          "Organized monthly meetups and workshops for 200+ members.",
      },
    ],
    projects: [
      {
        name: "Open-Source UI Library",
        type: "Open Source",
        date: "2022 – Present",
        skill: "React, TypeScript, Vite",
        description:
          "Component library with 1.2k GitHub stars; maintainer of 3 core packages.",
      },
      {
        name: "E-commerce Analytics Dashboard",
        type: "Personal",
        date: "2021",
        skill: "Next.js, Recharts, PostgreSQL",
        description:
          "Real-time sales dashboard processing 100k events/day for a local retailer.",
      },
    ],
    custom: [],
  },
  {
    title: "Product Designer",
    personal: {
      fullName: "Siti Rahayu",
      headline: "Product Designer (UI/UX)",
      email: "siti.rahayu@example.com",
      phone: "+62 813-5555-1234",
      location: "Yogyakarta, Indonesia",
      website: "https://sitirahayu.design",
      linkedin: "linkedin.com/in/sitirahayu",
      github: "",
    },
    summary:
      "Product designer with 6 years of experience crafting intuitive web and mobile experiences. Skilled in end-to-end design process from research to hi-fi prototypes and design systems.",
    experience: [
      {
        company: "FinTech Solutions",
        role: "Senior Product Designer",
        location: "Yogyakarta",
        startDate: "May 2020",
        endDate: "",
        current: true,
        description:
          "Led UX redesign of a mobile banking app, increasing task success rate by 25%. Built and maintained a design system used by 4 product teams.",
      },
      {
        company: "CreativeLab",
        role: "UI/UX Designer",
        location: "Surabaya",
        startDate: "Feb 2018",
        endDate: "Apr 2020",
        current: false,
        description:
          "Designed user flows and wireframes for 20+ web projects. Conducted usability testing and iterated based on user feedback.",
      },
    ],
    education: [
      {
        school: "Universitas Gadjah Mada",
        degree: "Bachelor's Degree",
        field: "Visual Communication Design",
        startDate: "2012",
        endDate: "2016",
        gpa: "3.7/4.0",
      },
    ],
    skills: [
      { name: "Figma", level: 1 },
      { name: "User Research", level: 2 },
      { name: "Prototyping", level: 2 },
      { name: "Design Systems", level: 2 },
      { name: "Wireframing", level: 1 },
      { name: "Usability Testing", level: 2 },
      { name: "Adobe XD", level: 3 },
      { name: "HTML/CSS", level: 3 },
    ],
    interpersonal: [
      { name: "Stakeholder Management" },
      { name: "Collaboration" },
      { name: "Presentation" },
    ],
    languages: [
      { name: "Indonesian", level: "Native" },
      { name: "English", level: "Fluent" },
    ],
    certifications: [
      {
        name: "Google UX Design Professional Certificate",
        issuer: "Google",
        date: "Aug 2021",
        url: "",
        description: "",
      },
    ],
    organizations: [
      {
        name: "Designers Meetup Yogyakarta",
        role: "Co-founder",
        date: "2019 – Present",
        description:
          "Community of 500+ designers hosting monthly sharing sessions.",
      },
    ],
    projects: [
      {
        name: "Design System 'Neutra'",
        type: "Work",
        date: "2021 – Present",
        skill: "Figma, Storybook, React",
        description:
          "Component library with theming, accessibility support, and documentation.",
      },
    ],
    custom: [],
  },
];

for (const mock of mockCVs) {
  const cv = await prisma.cV.create({
    data: {
      userId,
      title: mock.title,
      templateId: "classic",
      personal: mock.personal,
      summary: mock.summary,
      experience: mock.experience,
      education: mock.education,
      skills: mock.skills,
      interpersonal: mock.interpersonal,
      languages: mock.languages,
      certifications: mock.certifications,
      organizations: mock.organizations,
      projects: mock.projects,
      custom: mock.custom,
    },
    select: { id: true },
  });
  console.log(`Created: ${mock.title} (${cv.id})`);
}

await prisma.$disconnect();
