import type { CvContent } from "@/features/cv/schemas/cv";
import {
  DEFAULT_SECTION_ORDER,
  emptyColors,
  emptyTypography,
} from "@/features/cv/schemas/cv";

/**
 * Static sample CV used to render template thumbnails in the picker. Kept small
 * so thumbnails stay cheap to render on low-end devices.
 */
export const SAMPLE_CV: CvContent = {
  title: "Sample",
  templateId: "classic",
  typography: { ...emptyTypography },
  colors: { ...emptyColors },
  showSkillLevels: true,
  showLanguageLevels: true,
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  personal: {
    fullName: "Cecily Bakker",
    headline: "Digital Marketing Specialist",
    email: "cecily@email.com",
    phone: "+62 812 3456 7890",
    location: "Jakarta, Indonesia",
    website: "cecily.design",
    linkedin: "in/cecily",
    github: "",
    photo: "https://i.pravatar.cc/150?img=47",
  },
  summary:
    "Marketing specialist with 5+ years driving growth through data-led campaigns and brand storytelling across B2B and B2C.",
  experience: [
    {
      company: "Nova Agency",
      role: "Senior Marketing Specialist",
      location: "Jakarta",
      startDate: "2021",
      endDate: "",
      current: true,
      description:
        "Led multi-channel campaigns increasing qualified leads by 42% year over year.",
    },
    {
      company: "Bright Media",
      role: "Marketing Associate",
      location: "Bandung",
      startDate: "2019",
      endDate: "2021",
      current: false,
      description: "Managed social content calendar and paid acquisition.",
    },
  ],
  education: [
    {
      school: "University of Indonesia",
      degree: "B.A.",
      field: "Communications",
      location: "Depok",
      startDate: "2015",
      endDate: "2019",
      gpa: "3.8",
    },
  ],
  skills: [
    { name: "SEO", level: 1 },
    { name: "Google Ads", level: 2 },
    { name: "Analytics", level: 2 },
    { name: "Copywriting", level: 1 },
  ],
  interpersonal: [{ name: "Leadership" }, { name: "Communication" }],
  languages: [
    { name: "Indonesian", level: "Native" },
    { name: "English", level: "Fluent" },
  ],
  certifications: [
    {
      name: "Google Analytics",
      issuer: "Google",
      date: "2022",
      url: "",
      description: "",
    },
  ],
  organizations: [],
  projects: [
    {
      name: "Rebrand Campaign",
      type: "Brand",
      date: "2023",
      skill: "",
      description: "End-to-end rebrand lifting engagement 3x.",
    },
  ],
  custom: [],
};
