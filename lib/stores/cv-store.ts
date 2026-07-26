import { create } from "zustand";
import type {
  CertificationInput,
  CustomInput,
  CvContent,
  EducationInput,
  ExperienceInput,
  InterpersonalInput,
  LanguageInput,
  OrganizationInput,
  PersonalInput,
  ProjectInput,
  SkillInput,
} from "@/lib/schemas/cv";
import {
  emptyCertification,
  emptyCustom,
  emptyEducation,
  emptyExperience,
  emptyInterpersonal,
  emptyLanguage,
  emptyOrganization,
  emptyPersonal,
  emptyProject,
  emptySkill,
} from "@/lib/schemas/cv";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** Panels selectable from the builder's left icon rail. */
export type BuilderPanel =
  | "personal"
  | "sections"
  | "template"
  | "typography"
  | "colors"
  | "ai"
  | "export";

/** All valid panel ids, in rail order. Shared by server + client. */
export const VALID_PANELS: readonly BuilderPanel[] = [
  "personal",
  "sections",
  "template",
  "typography",
  "colors",
  "ai",
  "export",
];

/** Type guard for a `?panel=` value coming from an untrusted source (URL). */
export function isBuilderPanel(value: unknown): value is BuilderPanel {
  return (
    typeof value === "string" && VALID_PANELS.includes(value as BuilderPanel)
  );
}

/** List-backed sections that open an item editor dialog. */
export type EditorSection =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "interpersonal"
  | "languages"
  | "certifications"
  | "organizations"
  | "projects"
  | "custom";

/** Which section/item the edit dialog is currently editing (null = closed). */
export interface EditorTarget {
  section: EditorSection;
  /**
   * "add" opens a blank draft form that is only committed to the list when the
   * user confirms; "edit" edits an existing item live by index.
   */
  mode: "add" | "edit";
  /**
   * Index into the section's list. For "edit" it points at the item being
   * edited; for "add" it is null (the draft is not in the list yet). Always
   * null for singleton sections (summary).
   */
  index: number | null;
}

export interface CvState extends CvContent {
  /** DB id of the CV currently being edited. */
  cvId: string | null;
  currentStep: number;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  /** Bumped on every content mutation so the autosave hook can react. */
  revision: number;

  // builder UI
  activePanel: BuilderPanel;
  sidebarCollapsed: boolean;
  setActivePanel: (panel: BuilderPanel) => void;
  toggleSidebar: () => void;

  /** Item currently open in the edit dialog, or null when closed. */
  editorTarget: EditorTarget | null;
  openEditor: (target: EditorTarget) => void;
  closeEditor: () => void;

  // lifecycle
  hydrate: (
    cvId: string,
    content: CvContent,
    initialPanel?: BuilderPanel,
  ) => void;
  setStep: (step: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  markSaved: () => void;

  // top-level
  setTitle: (title: string) => void;
  setTemplateId: (templateId: string) => void;
  setSummary: (summary: string) => void;

  // personal
  setPersonal: (patch: Partial<PersonalInput>) => void;

  // experience
  addExperience: (value?: ExperienceInput) => void;
  updateExperience: (index: number, patch: Partial<ExperienceInput>) => void;
  removeExperience: (index: number) => void;
  reorderExperience: (from: number, to: number) => void;

  // education
  addEducation: (value?: EducationInput) => void;
  updateEducation: (index: number, patch: Partial<EducationInput>) => void;
  removeEducation: (index: number) => void;
  reorderEducation: (from: number, to: number) => void;

  // skills
  addSkill: (value?: SkillInput) => void;
  updateSkill: (index: number, patch: Partial<SkillInput>) => void;
  removeSkill: (index: number) => void;
  reorderSkill: (from: number, to: number) => void;

  // interpersonal
  addInterpersonal: (value?: InterpersonalInput) => void;
  updateInterpersonal: (
    index: number,
    patch: Partial<InterpersonalInput>,
  ) => void;
  removeInterpersonal: (index: number) => void;
  reorderInterpersonal: (from: number, to: number) => void;

  // languages
  addLanguage: (value?: LanguageInput) => void;
  updateLanguage: (index: number, patch: Partial<LanguageInput>) => void;
  removeLanguage: (index: number) => void;
  reorderLanguage: (from: number, to: number) => void;

  // certifications
  addCertification: (value?: CertificationInput) => void;
  updateCertification: (
    index: number,
    patch: Partial<CertificationInput>,
  ) => void;
  removeCertification: (index: number) => void;
  reorderCertification: (from: number, to: number) => void;

  // organizations
  addOrganization: (value?: OrganizationInput) => void;
  updateOrganization: (
    index: number,
    patch: Partial<OrganizationInput>,
  ) => void;
  removeOrganization: (index: number) => void;
  reorderOrganization: (from: number, to: number) => void;

  // projects
  addProject: (value?: ProjectInput) => void;
  updateProject: (index: number, patch: Partial<ProjectInput>) => void;
  removeProject: (index: number) => void;
  reorderProject: (from: number, to: number) => void;

  // custom
  addCustom: (value?: CustomInput) => void;
  updateCustom: (index: number, patch: Partial<CustomInput>) => void;
  removeCustom: (index: number) => void;
  reorderCustom: (from: number, to: number) => void;

  /** Returns the current serializable content snapshot. */
  getContent: () => CvContent;
}

const initialContent: CvContent = {
  title: "Untitled CV",
  templateId: "classic",
  personal: { ...emptyPersonal },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  interpersonal: [],
  languages: [],
  certifications: [],
  organizations: [],
  projects: [],
  custom: [],
};

/** Marks the draft dirty and bumps the revision counter. */
function touch(status: SaveStatus = "dirty") {
  return (state: CvState) => ({
    saveStatus: status,
    revision: state.revision + 1,
  });
}

/** Returns a copy of `list` with the item at `from` moved to `to`. */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const useCvStore = create<CvState>((set, get) => ({
  ...initialContent,
  cvId: null,
  currentStep: 0,
  saveStatus: "idle",
  lastSavedAt: null,
  revision: 0,

  activePanel: "personal",
  sidebarCollapsed: false,
  setActivePanel: (activePanel) => set({ activePanel }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  editorTarget: null,
  openEditor: (editorTarget) => set({ editorTarget }),
  closeEditor: () => set({ editorTarget: null }),

  hydrate: (cvId, content, initialPanel) =>
    set({
      cvId,
      ...content,
      currentStep: 0,
      saveStatus: "idle",
      lastSavedAt: null,
      revision: 0,
      // Adopt the panel resolved on the server (from `?panel=`) so the correct
      // panel renders on the first paint — no client-side flicker.
      ...(initialPanel ? { activePanel: initialPanel } : {}),
    }),

  setStep: (step) => set({ currentStep: step }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  markSaved: () => set({ saveStatus: "saved", lastSavedAt: Date.now() }),

  setTitle: (title) => set((s) => ({ title, ...touch()(s) })),
  setTemplateId: (templateId) => set((s) => ({ templateId, ...touch()(s) })),
  setSummary: (summary) => set((s) => ({ summary, ...touch()(s) })),

  setPersonal: (patch) =>
    set((s) => ({ personal: { ...s.personal, ...patch }, ...touch()(s) })),

  addExperience: (value) =>
    set((s) => ({
      experience: [...s.experience, { ...emptyExperience, ...value }],
      ...touch()(s),
    })),
  updateExperience: (index, patch) =>
    set((s) => ({
      experience: s.experience.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeExperience: (index) =>
    set((s) => ({
      experience: s.experience.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderExperience: (from, to) =>
    set((s) => ({
      experience: moveItem(s.experience, from, to),
      ...touch()(s),
    })),

  addEducation: (value) =>
    set((s) => ({
      education: [...s.education, { ...emptyEducation, ...value }],
      ...touch()(s),
    })),
  updateEducation: (index, patch) =>
    set((s) => ({
      education: s.education.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeEducation: (index) =>
    set((s) => ({
      education: s.education.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderEducation: (from, to) =>
    set((s) => ({
      education: moveItem(s.education, from, to),
      ...touch()(s),
    })),

  addSkill: (value) =>
    set((s) => ({
      skills: [...s.skills, { ...emptySkill, ...value }],
      ...touch()(s),
    })),
  updateSkill: (index, patch) =>
    set((s) => ({
      skills: s.skills.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeSkill: (index) =>
    set((s) => ({
      skills: s.skills.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderSkill: (from, to) =>
    set((s) => ({
      skills: moveItem(s.skills, from, to),
      ...touch()(s),
    })),

  addInterpersonal: (value) =>
    set((s) => ({
      interpersonal: [...s.interpersonal, { ...emptyInterpersonal, ...value }],
      ...touch()(s),
    })),
  updateInterpersonal: (index, patch) =>
    set((s) => ({
      interpersonal: s.interpersonal.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeInterpersonal: (index) =>
    set((s) => ({
      interpersonal: s.interpersonal.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderInterpersonal: (from, to) =>
    set((s) => ({
      interpersonal: moveItem(s.interpersonal, from, to),
      ...touch()(s),
    })),

  addLanguage: (value) =>
    set((s) => ({
      languages: [...s.languages, { ...emptyLanguage, ...value }],
      ...touch()(s),
    })),
  updateLanguage: (index, patch) =>
    set((s) => ({
      languages: s.languages.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeLanguage: (index) =>
    set((s) => ({
      languages: s.languages.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderLanguage: (from, to) =>
    set((s) => ({
      languages: moveItem(s.languages, from, to),
      ...touch()(s),
    })),

  addCertification: (value) =>
    set((s) => ({
      certifications: [
        ...s.certifications,
        { ...emptyCertification, ...value },
      ],
      ...touch()(s),
    })),
  updateCertification: (index, patch) =>
    set((s) => ({
      certifications: s.certifications.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeCertification: (index) =>
    set((s) => ({
      certifications: s.certifications.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderCertification: (from, to) =>
    set((s) => ({
      certifications: moveItem(s.certifications, from, to),
      ...touch()(s),
    })),

  addOrganization: (value) =>
    set((s) => ({
      organizations: [...s.organizations, { ...emptyOrganization, ...value }],
      ...touch()(s),
    })),
  updateOrganization: (index, patch) =>
    set((s) => ({
      organizations: s.organizations.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeOrganization: (index) =>
    set((s) => ({
      organizations: s.organizations.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderOrganization: (from, to) =>
    set((s) => ({
      organizations: moveItem(s.organizations, from, to),
      ...touch()(s),
    })),

  addProject: (value) =>
    set((s) => ({
      projects: [...s.projects, { ...emptyProject, ...value }],
      ...touch()(s),
    })),
  updateProject: (index, patch) =>
    set((s) => ({
      projects: s.projects.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeProject: (index) =>
    set((s) => ({
      projects: s.projects.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderProject: (from, to) =>
    set((s) => ({
      projects: moveItem(s.projects, from, to),
      ...touch()(s),
    })),

  addCustom: (value) =>
    set((s) => ({
      custom: [...s.custom, { ...emptyCustom, ...value }],
      ...touch()(s),
    })),
  updateCustom: (index, patch) =>
    set((s) => ({
      custom: s.custom.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
      ...touch()(s),
    })),
  removeCustom: (index) =>
    set((s) => ({
      custom: s.custom.filter((_, i) => i !== index),
      ...touch()(s),
    })),
  reorderCustom: (from, to) =>
    set((s) => ({
      custom: moveItem(s.custom, from, to),
      ...touch()(s),
    })),

  getContent: () => {
    const s = get();
    return {
      title: s.title,
      templateId: s.templateId,
      personal: s.personal,
      summary: s.summary,
      experience: s.experience,
      education: s.education,
      skills: s.skills,
      interpersonal: s.interpersonal,
      languages: s.languages,
      certifications: s.certifications,
      organizations: s.organizations,
      projects: s.projects,
      custom: s.custom,
    };
  },
}));
