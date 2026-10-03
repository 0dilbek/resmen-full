import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/modules/auth/server";
import { acceptInvitation } from "@/modules/memberships/actions";
import { ActionForm } from "@/components/ui/action-form";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!(await getSession())) redirect(`/${locale}/login`);
  const t = await getTranslations();
  async function accept() {
    "use server";
    return acceptInvitation(token);
  }
  return (
    <main className="page-center panel">
      <h1>{t("invitation")}</h1>
      <ActionForm
        action={accept}
        submitKey="acceptInvitation"
        redirectTo={`/${locale}/dashboard`}
      >
        <p className="muted">{t("accountNote")}</p>
      </ActionForm>
    </main>
  );
}
