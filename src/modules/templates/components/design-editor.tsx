"use client";
import "./studio.css";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { templates, type TemplateId } from "../registry";
import { defaultTheme, themeConfigSchema, type ThemeConfig } from "../config";
import { saveDraft, publishDesign } from "../actions";
import { DesignControls } from "./design-controls";
import { LivePreview } from "./live-preview";
import { TemplateGallery } from "./template-gallery";
import { Button } from "@/components/ui/button";
export function DesignEditor({
  restaurantId,
  menuId,
  initial,
  version,
  statuses,
}: {
  restaurantId: string;
  menuId: string;
  initial: ThemeConfig;
  version: number;
  statuses: { id: TemplateId; status: "ACTIVE" | "RETIRED" | "BLOCKED" }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [config, setConfig] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [galleryPreview, setGalleryPreview] = useState<ThemeConfig | null>(
    null,
  );
  const dirty = JSON.stringify(config) !== JSON.stringify(initial);
  const preview = `/${locale}/preview/${restaurantId}/${menuId}`;
  function patch<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) {
    setConfig((old) => ({ ...old, [key]: value }));
    setSaved(false);
  }
  async function upload(file: File, key: "logoMediaId" | "coverMediaId") {
    setPending(true);
    setError("");
    try {
      const body = new FormData();
      body.set("image", file);
      const response = await fetch(
        `/api/uploads?restaurantId=${restaurantId}&menuId=${menuId}`,
        { method: "POST", body },
      );
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id)
        setError(t(result.error ?? "genericError"));
      else patch(key, result.id);
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }
  async function save() {
    setPending(true);
    setError("");
    const validated = themeConfigSchema.safeParse(config);
    if (!validated.success) {
      setError(t("themeInvalid"));
      setPending(false);
      return;
    }
    try {
      const result = await saveDraft(restaurantId, {
        menuId,
        expectedVersion: version,
        config: validated.data,
      });
      if (!result.ok) setError(t(result.error));
      else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }
  async function publish() {
    setPending(true);
    setError("");
    try {
      const result = await publishDesign(restaurantId, {
        menuId,
        expectedVersion: version,
      });
      if (!result.ok) setError(t(result.error));
      else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }
  const entry = templates.find((v) => v.id === config.templateId)!;
  return (
    <div className="design-studio">
      <TemplateGallery
        selected={config.templateId}
        preview={preview}
        statuses={statuses}
        onPreview={(id) => {
          setGalleryPreview({
            ...defaultTheme(id),
            logoMediaId: config.logoMediaId,
            coverMediaId: config.coverMediaId,
          });
          setPreviewOpen(true);
        }}
        onSelect={(id) => {
          setConfig({
            ...defaultTheme(id),
            logoMediaId: config.logoMediaId,
            coverMediaId: config.coverMediaId,
          });
          setSaved(false);
        }}
      />
      <div className="design-workbench">
        <DesignControls
          config={config}
          onChange={(next) => {
            setConfig(next);
            setSaved(false);
          }}
          pending={pending}
          upload={upload}
        />
        <div className="design-preview-column">
          <LivePreview
            base={preview}
            config={previewOpen && galleryPreview ? galleryPreview : config}
            open={previewOpen}
            setOpen={(open) => {
              setGalleryPreview(null);
              setPreviewOpen(open);
            }}
          />
          <div className="design-save-bar">
            <strong>{entry.name}</strong>
            <Button onClick={save} disabled={pending}>
              {t("saveDraft")}
            </Button>
            <Button
              onClick={publish}
              disabled={pending || dirty || version === 0}
            >
              {t("publishDesign")}
            </Button>
          </div>
          {dirty && <p className="muted">{t("saveBeforePublish")}</p>}
          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="notice notice-success">
              {t("saved")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
