import { SignOut } from "@/modules/auth/components/sign-out";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/modules/auth/server";
import { SecurityForm } from "@/modules/auth/components/security-form";
import { Brand } from "@/components/brand";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const t = await getTranslations();
  return (
    <main className="page-center">
      <Brand href={`/${locale}/dashboard`} />
      <div className="page-title" style={{ marginTop: 35 }}>
        <div>
          <h1>{session.user.name}</h1>
          <p className="muted">{session.user.email}</p>
        </div>
        <Link className="button button-outline" href={`/${locale}/dashboard`}>
          {t("workspace")}
        </Link>
      </div>
      <section className="panel">
        <SecurityForm enabled={session.user.twoFactorEnabled ?? false} />
      </section>
      <SignOut />
    </main>
  );
}
