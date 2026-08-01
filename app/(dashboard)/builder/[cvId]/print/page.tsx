import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { CvPaginator } from "@/features/cv/components/cv-paginator";
import { getTemplate } from "@/features/cv/components/templates";
import { getEagerTemplate } from "@/features/cv/components/templates/eager";
import { toCvContent } from "@/features/cv/lib/cv-content";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import { prisma } from "@/lib/db";

export const metadata = { robots: { index: false } };

/**
 * Bare full-page render of a CV template, used only as the target for headless
 * Chromium during PDF/PNG export. No editor chrome. Auth + ownership enforced
 * here as well as in the export API.
 */
export default async function CvPrintPage({
  params,
}: {
  params: Promise<{ cvId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const { cvId } = await params;
  const cv = await prisma.cV.findUnique({ where: { id: cvId } });
  if (!cv || cv.userId !== session.user.id) notFound();

  const content = toCvContent(cv);
  const template = getTemplate(content.templateId);
  const Template = getEagerTemplate(content.templateId);

  return (
    <main
      data-print-root
      className="mx-auto w-[794px] bg-white"
      style={cvRootStyle(content)}
    >
      <CvPaginator pagination={template.pagination}>
        <Template cv={content} />
      </CvPaginator>
    </main>
  );
}
