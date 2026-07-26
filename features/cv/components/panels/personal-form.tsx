"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

/** Personal/contact info form (rendered inside the "Informasi Pribadi" panel). */
export function PersonalForm() {
  const personal = useCvStore((s) => s.personal);
  const setPersonal = useCvStore((s) => s.setPersonal);

  return (
    <FieldGroup>
      <div className="grid gap-4 @md/field-group:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="fullName">Nama</FieldLabel>
          <Input
            id="fullName"
            value={personal.fullName ?? ""}
            onChange={(e) => setPersonal({ fullName: e.target.value })}
            placeholder="Jane Doe"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="headline">Posisi</FieldLabel>
          <Input
            id="headline"
            value={personal.headline ?? ""}
            onChange={(e) => setPersonal({ headline: e.target.value })}
            placeholder="Senior Frontend Engineer"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={personal.email ?? ""}
            onChange={(e) => setPersonal({ email: e.target.value })}
            placeholder="jane@example.com"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">No. HP</FieldLabel>
          <Input
            id="phone"
            value={personal.phone ?? ""}
            onChange={(e) => setPersonal({ phone: e.target.value })}
            placeholder="+62 812 3456 7890"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="location">Alamat</FieldLabel>
          <Input
            id="location"
            value={personal.location ?? ""}
            onChange={(e) => setPersonal({ location: e.target.value })}
            placeholder="Jakarta, Indonesia"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="website">Website / Social Media</FieldLabel>
          <Input
            id="website"
            value={personal.website ?? ""}
            onChange={(e) => setPersonal({ website: e.target.value })}
            placeholder="janedoe.dev"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="linkedin">LinkedIn</FieldLabel>
          <Input
            id="linkedin"
            value={personal.linkedin ?? ""}
            onChange={(e) => setPersonal({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/janedoe"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="github">GitHub</FieldLabel>
          <Input
            id="github"
            value={personal.github ?? ""}
            onChange={(e) => setPersonal({ github: e.target.value })}
            placeholder="github.com/janedoe"
          />
        </Field>
      </div>
    </FieldGroup>
  );
}
