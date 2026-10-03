import { AuthPage } from "@/modules/auth/components/auth-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <AuthPage mode="reset" token={(await searchParams).token} />;
}
