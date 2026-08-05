"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AwardIcon,
  BriefcaseIcon,
  CircleDashedIcon,
  CircleMinusIcon,
  FolderGitIcon,
  GraduationCapIcon,
  GripVerticalIcon,
  HeartHandshakeIcon,
  LanguagesIcon,
  type LucideIcon,
  PlusIcon,
  StarIcon,
  UserIcon,
  UsersRoundIcon,
} from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { MainSectionId } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { cn } from "@/lib/utils";

/** A draggable, clickable row for a single list item within a section. */
function SortableRow({
  id,
  label,
  draggable,
  onEdit,
  onRemove,
}: {
  id: string;
  label: string;
  draggable: boolean;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 border-t bg-card px-2 py-1.5 first:border-t-0",
        isDragging && "z-10 opacity-80 shadow-sm",
      )}
    >
      {draggable ? (
        <button
          type="button"
          className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Seret untuk mengurutkan"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      ) : (
        <span className="size-6 shrink-0" aria-hidden />
      )}
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 truncate text-left text-sm font-medium text-primary hover:underline"
      >
        {label}
      </button>
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Hapus"
        >
          <CircleMinusIcon className="text-muted-foreground" />
        </Button>
      ) : null}
    </div>
  );
}

/** A section card grouping one CV section's items with add/reorder/remove. */
function SectionCard({
  icon: Icon,
  title,
  items,
  onAdd,
  onEdit,
  onRemove,
  onReorder,
  moveUp,
  moveDown,
  emptyLabel,
}: {
  icon: LucideIcon;
  title: string;
  items: { id: string; label: string }[];
  onAdd?: () => void;
  onEdit: (index: number) => void;
  onRemove?: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  moveUp?: () => void;
  moveDown?: () => void;
  emptyLabel: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const from = items.findIndex((it) => it.id === active.id);
    const to = items.findIndex((it) => it.id === over.id);
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="flex-1 truncate text-sm font-semibold">{title}</h3>
        {moveUp || moveDown ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={moveUp}
              disabled={!moveUp}
              aria-label={`Pindah ${title} ke atas`}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={moveDown}
              disabled={!moveDown}
              aria-label={`Pindah ${title} ke bawah`}
            >
              <ArrowDownIcon />
            </Button>
          </div>
        ) : null}
        {onAdd ? (
          <Button
            type="button"
            size="icon-sm"
            onClick={onAdd}
            aria-label={`Tambah ${title}`}
          >
            <PlusIcon />
          </Button>
        ) : moveUp || moveDown ? (
          <span className="size-6 shrink-0" aria-hidden />
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((it) => it.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((it, i) => (
              <SortableRow
                key={it.id}
                id={it.id}
                label={it.label}
                draggable={Boolean(onReorder) && items.length > 1}
                onEdit={() => onEdit(i)}
                onRemove={onRemove ? () => onRemove(i) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/** The "Konten" panel: a scrollable stack of section cards. */
export function ContentPanel() {
  const experience = useCvStore((s) => s.experience);
  const education = useCvStore((s) => s.education);
  const skills = useCvStore((s) => s.skills);
  const interpersonal = useCvStore((s) => s.interpersonal);
  const languages = useCvStore((s) => s.languages);
  const certifications = useCvStore((s) => s.certifications);
  const organizations = useCvStore((s) => s.organizations);
  const projects = useCvStore((s) => s.projects);
  const custom = useCvStore((s) => s.custom);

  const removeExperience = useCvStore((s) => s.removeExperience);
  const reorderExperience = useCvStore((s) => s.reorderExperience);
  const removeEducation = useCvStore((s) => s.removeEducation);
  const reorderEducation = useCvStore((s) => s.reorderEducation);
  const removeSkill = useCvStore((s) => s.removeSkill);
  const reorderSkill = useCvStore((s) => s.reorderSkill);
  const showSkillLevels = useCvStore((s) => s.showSkillLevels);
  const setShowSkillLevels = useCvStore((s) => s.setShowSkillLevels);
  const removeInterpersonal = useCvStore((s) => s.removeInterpersonal);
  const reorderInterpersonal = useCvStore((s) => s.reorderInterpersonal);
  const removeLanguage = useCvStore((s) => s.removeLanguage);
  const reorderLanguage = useCvStore((s) => s.reorderLanguage);
  const showLanguageLevels = useCvStore((s) => s.showLanguageLevels);
  const setShowLanguageLevels = useCvStore((s) => s.setShowLanguageLevels);
  const removeCertification = useCvStore((s) => s.removeCertification);
  const reorderCertification = useCvStore((s) => s.reorderCertification);
  const removeOrganization = useCvStore((s) => s.removeOrganization);
  const reorderOrganization = useCvStore((s) => s.reorderOrganization);
  const removeProject = useCvStore((s) => s.removeProject);
  const reorderProject = useCvStore((s) => s.reorderProject);
  const removeCustom = useCvStore((s) => s.removeCustom);
  const reorderCustom = useCvStore((s) => s.reorderCustom);

  const sectionOrder = useCvStore((s) => s.sectionOrder);
  const moveSection = useCvStore((s) => s.moveSection);
  const setSummary = useCvStore((s) => s.setSummary);

  const openEditor = useCvStore((s) => s.openEditor);

  function arrowHandlers(id: MainSectionId) {
    const i = sectionOrder.indexOf(id);
    if (i === -1) return { moveUp: undefined, moveDown: undefined };
    return {
      moveUp: i > 0 ? () => moveSection(i, i - 1) : undefined,
      moveDown:
        i < sectionOrder.length - 1 ? () => moveSection(i, i + 1) : undefined,
    };
  }

  const mainCards: Record<MainSectionId, ReactElement> = {
    summary: (
      <SectionCard
        icon={UserIcon}
        title="Profil"
        emptyLabel="Belum ada profil."
        items={[{ id: "summary", label: "Profil" }]}
        onEdit={() =>
          openEditor({ section: "summary", mode: "edit", index: null })
        }
        onRemove={() => setSummary("")}
        {...arrowHandlers("summary")}
      />
    ),
    experience: (
      <SectionCard
        icon={BriefcaseIcon}
        title="Pengalaman"
        emptyLabel="Belum ada pengalaman."
        items={experience.map((e, i) => ({
          id: `exp-${i}`,
          label: e.company || e.role || `Pengalaman ${i + 1}`,
        }))}
        onAdd={() =>
          openEditor({ section: "experience", mode: "add", index: null })
        }
        onEdit={(i) =>
          openEditor({ section: "experience", mode: "edit", index: i })
        }
        onRemove={removeExperience}
        onReorder={reorderExperience}
        {...arrowHandlers("experience")}
      />
    ),
    education: (
      <SectionCard
        icon={GraduationCapIcon}
        title="Pendidikan"
        emptyLabel="Belum ada pendidikan."
        items={education.map((e, i) => ({
          id: `edu-${i}`,
          label: e.school || `Pendidikan ${i + 1}`,
        }))}
        onAdd={() =>
          openEditor({ section: "education", mode: "add", index: null })
        }
        onEdit={(i) =>
          openEditor({ section: "education", mode: "edit", index: i })
        }
        onRemove={removeEducation}
        onReorder={reorderEducation}
        {...arrowHandlers("education")}
      />
    ),
    projects: (
      <SectionCard
        icon={FolderGitIcon}
        title="Proyek"
        emptyLabel="Tidak Ada Proyek"
        items={projects.map((p, i) => ({
          id: `proj-${i}`,
          label: p.name || `Proyek ${i + 1}`,
        }))}
        onAdd={() =>
          openEditor({ section: "projects", mode: "add", index: null })
        }
        onEdit={(i) =>
          openEditor({ section: "projects", mode: "edit", index: i })
        }
        onRemove={removeProject}
        onReorder={reorderProject}
        {...arrowHandlers("projects")}
      />
    ),
    organizations: (
      <SectionCard
        icon={UsersRoundIcon}
        title="Organisasi"
        emptyLabel="Tidak Ada Organisasi"
        items={organizations.map((o, i) => ({
          id: `org-${i}`,
          label: o.name || `Organisasi ${i + 1}`,
        }))}
        onAdd={() =>
          openEditor({ section: "organizations", mode: "add", index: null })
        }
        onEdit={(i) =>
          openEditor({ section: "organizations", mode: "edit", index: i })
        }
        onRemove={removeOrganization}
        onReorder={reorderOrganization}
        {...arrowHandlers("organizations")}
      />
    ),
    custom: (
      <SectionCard
        icon={CircleDashedIcon}
        title="Kustom"
        emptyLabel="Tidak Ada Kustom"
        items={custom.map((c, i) => ({
          id: `custom-${i}`,
          label: c.title || `Kustom ${i + 1}`,
        }))}
        onAdd={() =>
          openEditor({ section: "custom", mode: "add", index: null })
        }
        onEdit={(i) =>
          openEditor({ section: "custom", mode: "edit", index: i })
        }
        onRemove={removeCustom}
        onReorder={reorderCustom}
        {...arrowHandlers("custom")}
      />
    ),
  };

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Konten</h2>
        <p className="text-xs text-muted-foreground">
          Tambah, ubah, atau seret (⇕) untuk mengurutkan konten CV Anda.
        </p>
      </div>

      <div className="space-y-4 p-4">
        {sectionOrder.map((id) => (
          <div key={id}>{mainCards[id]}</div>
        ))}

        <SectionCard
          icon={StarIcon}
          title="Keahlian"
          emptyLabel="Belum ada keahlian."
          items={skills.map((s, i) => ({
            id: `skill-${i}`,
            label: s.name || `Keahlian ${i + 1}`,
          }))}
          onAdd={() =>
            openEditor({ section: "skills", mode: "add", index: null })
          }
          onEdit={(i) =>
            openEditor({ section: "skills", mode: "edit", index: i })
          }
          onRemove={removeSkill}
          onReorder={reorderSkill}
        />

        <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
          <label
            htmlFor="show-skill-levels"
            className="text-sm text-muted-foreground"
          >
            Tampilkan level keahlian
          </label>
          <Switch
            id="show-skill-levels"
            size="sm"
            checked={showSkillLevels}
            onCheckedChange={setShowSkillLevels}
          />
        </div>

        <SectionCard
          icon={HeartHandshakeIcon}
          title="Keahlian Interpersonal"
          emptyLabel="Tidak Ada Keahlian Interpersonal"
          items={interpersonal.map((it, i) => ({
            id: `interp-${i}`,
            label: it.name || `Keahlian ${i + 1}`,
          }))}
          onAdd={() =>
            openEditor({ section: "interpersonal", mode: "add", index: null })
          }
          onEdit={(i) =>
            openEditor({ section: "interpersonal", mode: "edit", index: i })
          }
          onRemove={removeInterpersonal}
          onReorder={reorderInterpersonal}
        />

        <SectionCard
          icon={LanguagesIcon}
          title="Bahasa"
          emptyLabel="Tidak Ada Bahasa"
          items={languages.map((l, i) => ({
            id: `lang-${i}`,
            label: l.name || `Bahasa ${i + 1}`,
          }))}
          onAdd={() =>
            openEditor({ section: "languages", mode: "add", index: null })
          }
          onEdit={(i) =>
            openEditor({ section: "languages", mode: "edit", index: i })
          }
          onRemove={removeLanguage}
          onReorder={reorderLanguage}
        />

        <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
          <label
            htmlFor="show-language-levels"
            className="text-sm text-muted-foreground"
          >
            Tampilkan tingkat bahasa
          </label>
          <Switch
            id="show-language-levels"
            size="sm"
            checked={showLanguageLevels}
            onCheckedChange={setShowLanguageLevels}
          />
        </div>

        <SectionCard
          icon={AwardIcon}
          title="Sertifikasi"
          emptyLabel="Tidak Ada Sertifikasi"
          items={certifications.map((c, i) => ({
            id: `cert-${i}`,
            label: c.name || `Sertifikasi ${i + 1}`,
          }))}
          onAdd={() =>
            openEditor({ section: "certifications", mode: "add", index: null })
          }
          onEdit={(i) =>
            openEditor({ section: "certifications", mode: "edit", index: i })
          }
          onRemove={removeCertification}
          onReorder={reorderCertification}
        />
      </div>
    </div>
  );
}
