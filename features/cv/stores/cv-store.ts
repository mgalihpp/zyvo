import { createStore } from "zustand/vanilla";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import type {
  CertificationInput,
  CustomInput,
  CvColors,
  CvContent,
  EducationInput,
  ExperienceInput,
  InterpersonalInput,
  LanguageInput,
  OrganizationInput,
  PersonalInput,
  ProjectInput,
  SkillInput,
  Typography,
} from "@/features/cv/schemas/cv";
import {
  emptyCertification,
  emptyColors,
  emptyCustom,
  emptyEducation,
  emptyExperience,
  emptyInterpersonal,
  emptyLanguage,
  emptyOrganization,
  emptyPersonal,
  emptyProject,
  emptySkill,
  emptyTypography,
} from "@/features/cv/schemas/cv";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type BuilderPanel =
  | "personal"
  | "sections"
  | "template"
  | "typography"
  | "colors"
  | "ai"
  | "history"
  | "export";

export const VALID_PANELS: readonly BuilderPanel[] = [
  "personal",
  "sections",
  "template",
  "typography",
  "colors",
  "ai",
  "history",
  "export",
];

/** Type guard for a `?panel=` value coming from an untrusted source (URL). */
export function isBuilderPanel(value: unknown): value is BuilderPanel {
  return (
    typeof value === "string" && VALID_PANELS.includes(value as BuilderPanel)
  );
}

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

export interface EditorTarget {
  section: EditorSection;
  mode: "add" | "edit";
  index: number | null;
}

export interface CvState extends CvContent {
  /** Uncommitted color edits (live preview); null when there is no draft. */
  draftColors: CvColors | null;

  cvId: string | null;
  currentStep: number;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  /** Bumped on every content mutation so the autosave hook can react. */
  revision: number;

  activePanel: BuilderPanel;
  sidebarCollapsed: boolean;
  setActivePanel: (panel: BuilderPanel) => void;
  toggleSidebar: () => void;

  editorTarget: EditorTarget | null;
  openEditor: (target: EditorTarget) => void;
  closeEditor: () => void;

  setStep: (step: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  markSaved: () => void;

  setTitle: (title: string) => void;
  setTemplateId: (templateId: string) => void;
  setSummary: (summary: string) => void;
  setTypography: (patch: Partial<Typography>) => void;

  setColors: (colors: CvColors) => void;
  setDraftColors: (colors: CvColors) => void;
  commitColors: () => void;
  resetColors: () => void;

  setPersonal: (patch: Partial<PersonalInput>) => void;

  addExperience: (value?: ExperienceInput) => void;
  updateExperience: (index: number, patch: Partial<ExperienceInput>) => void;
  removeExperience: (index: number) => void;
  reorderExperience: (from: number, to: number) => void;

  addEducation: (value?: EducationInput) => void;
  updateEducation: (index: number, patch: Partial<EducationInput>) => void;
  removeEducation: (index: number) => void;
  reorderEducation: (from: number, to: number) => void;

  addSkill: (value?: SkillInput) => void;
  updateSkill: (index: number, patch: Partial<SkillInput>) => void;
  removeSkill: (index: number) => void;
  reorderSkill: (from: number, to: number) => void;

  addInterpersonal: (value?: InterpersonalInput) => void;
  updateInterpersonal: (
    index: number,
    patch: Partial<InterpersonalInput>,
  ) => void;
  removeInterpersonal: (index: number) => void;
  reorderInterpersonal: (from: number, to: number) => void;

  addLanguage: (value?: LanguageInput) => void;
  updateLanguage: (index: number, patch: Partial<LanguageInput>) => void;
  removeLanguage: (index: number) => void;
  reorderLanguage: (from: number, to: number) => void;

  addCertification: (value?: CertificationInput) => void;
  updateCertification: (
    index: number,
    patch: Partial<CertificationInput>,
  ) => void;
  removeCertification: (index: number) => void;
  reorderCertification: (from: number, to: number) => void;

  addOrganization: (value?: OrganizationInput) => void;
  updateOrganization: (
    index: number,
    patch: Partial<OrganizationInput>,
  ) => void;
  removeOrganization: (index: number) => void;
  reorderOrganization: (from: number, to: number) => void;

  addProject: (value?: ProjectInput) => void;
  updateProject: (index: number, patch: Partial<ProjectInput>) => void;
  removeProject: (index: number) => void;
  reorderProject: (from: number, to: number) => void;

  addCustom: (value?: CustomInput) => void;
  updateCustom: (index: number, patch: Partial<CustomInput>) => void;
  removeCustom: (index: number) => void;
  reorderCustom: (from: number, to: number) => void;

  setShowSkillLevels: (show: boolean) => void;

  getContent: () => CvContent;

  /** Overwrites all content fields after a server-side restore. Does NOT bump
   *  revision — the restored state is already persisted. */
  replaceContent: (content: CvContent) => void;

  /** When set, the CV preview renders this content (a past version) instead
   *  of the live draft. Never persisted; cleared by passing null. */
  previewContent: CvContent | null;
  setPreviewContent: (content: CvContent | null) => void;
}

const emptyContent: CvContent = {
  title: "CV Tanpa Judul",
  templateId: "classic",
  typography: { ...emptyTypography },
  colors: { ...emptyColors },
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
  showSkillLevels: true,
};

/** Initial state a per-request store is seeded with (from SSR data). */
export interface CvStoreInit {
  cvId: string;
  content: CvContent;
  activePanel?: BuilderPanel;
}

/** Marks the draft dirty and bumps the revision counter. */
function touch(status: SaveStatus = "dirty") {
  return (state: CvState) => ({
    saveStatus: status,
    revision: state.revision + 1,
  });
}

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

export type CvStore = ReturnType<typeof createCvStore>;

/** Creates a per-request CV store seeded with SSR content. */
export const createCvStore = (init?: CvStoreInit) =>
  createStore<CvState>((set, get) => ({
    ...(init?.content ?? emptyContent),
    colors: init?.content?.colors ?? emptyColors,
    showSkillLevels: init?.content?.showSkillLevels ?? true,
    draftColors: null,
    cvId: init?.cvId ?? null,
    currentStep: 0,
    saveStatus: "idle",
    lastSavedAt: null,
    revision: 0,

    activePanel: init?.activePanel ?? "personal",
    sidebarCollapsed: false,
    setActivePanel: (activePanel) => set({ activePanel }),
    toggleSidebar: () =>
      set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    editorTarget: null,
    openEditor: (editorTarget) => set({ editorTarget }),
    closeEditor: () => set({ editorTarget: null }),

    setStep: (step) => set({ currentStep: step }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    markSaved: () => set({ saveStatus: "saved", lastSavedAt: Date.now() }),

    replaceContent: (content) =>
      set({
        ...content,
        draftColors: null,
        previewContent: null,
        saveStatus: "saved",
        lastSavedAt: Date.now(),
      }),

    previewContent: null,
    setPreviewContent: (previewContent) => set({ previewContent }),

    setTitle: (title) => set((s) => ({ title, ...touch()(s) })),
    // Selecting a template always applies that template's default palette and
    // fonts. Any in-flight color draft is dropped so the panel reflects the new
    // base.
    setTemplateId: (templateId) =>
      set((s) => ({
        templateId,
        colors: templateDefaultColors(templateId),
        typography: templateDefaultTypography(templateId),
        draftColors: null,
        ...touch()(s),
      })),
    setSummary: (summary) => set((s) => ({ summary, ...touch()(s) })),
    setShowSkillLevels: (showSkillLevels) =>
      set((s) => ({ showSkillLevels, ...touch()(s) })),
    setTypography: (patch) =>
      set((s) => ({
        typography: { ...s.typography, ...patch },
        ...touch()(s),
      })),

    setColors: (colors) => set((s) => ({ colors, ...touch()(s) })),
    setDraftColors: (draftColors) => set({ draftColors, saveStatus: "dirty" }),
    commitColors: () =>
      set((s) => {
        if (!s.draftColors) return {};
        return {
          colors: s.draftColors,
          draftColors: null,
          ...touch()(s),
        };
      }),
    resetColors: () => set({ draftColors: null }),

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
        interpersonal: [
          ...s.interpersonal,
          { ...emptyInterpersonal, ...value },
        ],
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
        typography: s.typography,
        colors: s.colors,
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
        showSkillLevels: s.showSkillLevels,
      };
    },
  }));
