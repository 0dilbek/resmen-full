"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
export function BranchSwitcher({
  branches,
  selected,
}: {
  branches: { id: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const t = useTranslations();
  return (
    <select
      className="branch-select"
      aria-label={t("chooseBranch")}
      value={selected}
      onChange={(event) => router.push(`${path}?branch=${event.target.value}`)}
    >
      {branches.map((branch) => (
        <option value={branch.id} key={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}
