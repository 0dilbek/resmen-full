"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Maximize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { themeConfigSchema, type ThemeConfig } from "../config";
export function LivePreview({
  base,
  config,
  open,
  setOpen,
}: {
  base: string;
  config: ThemeConfig;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const t = useTranslations();
  const [device, setDevice] = useState<"mobile" | "tablet">("mobile");
  const [source, setSource] = useState(`${base}?embedded=1`);
  const valid = themeConfigSchema.safeParse(config).success;
  const serialized = JSON.stringify(config);
  useEffect(() => {
    if (!valid) return;
    const timer = setTimeout(
      () =>
        setSource(
          `${base}?embedded=1&config=${encodeURIComponent(serialized)}`,
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [base, serialized, valid]);
  const controls = (
    <div
      className="preview-controls"
      role="group"
      aria-label={t("previewDevice")}
    >
      {(["mobile", "tablet"] as const).map((d) => (
        <button
          type="button"
          key={d}
          aria-pressed={device === d}
          onClick={() => setDevice(d)}
        >
          {t(d)}
        </button>
      ))}
    </div>
  );
  const frame = (
    <div className={`live-preview-device device-${device}`}>
      <iframe
        title={t("liveMenuPreview")}
        src={source}
        referrerPolicy="same-origin"
      />
    </div>
  );
  return (
    <section className="live-preview" aria-label={t("liveMenuPreview")}>
      <div className="live-preview-bar">
        <div>
          <strong>{t("liveMenuPreview")}</strong>
          <p>{t("realDataPreview")}</p>
        </div>
        {controls}
        <button
          type="button"
          className="button button-outline"
          onClick={() => setOpen(true)}
          aria-label={t("fullScreenPreview")}
        >
          <Maximize2 size={18} />
        </button>
      </div>
      {!valid && (
        <p role="alert" className="notice notice-error">
          {t("themeInvalid")}
        </p>
      )}
      {!open && <div className="preview-stage">{frame}</div>}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="design-preview-dialog">
            <div className="live-preview-bar">
              <Dialog.Title>{t("liveMenuPreview")}</Dialog.Title>
              {controls}
              <Dialog.Close
                className="button button-outline"
                aria-label={t("close")}
              >
                <X />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              {t("realDataPreview")}
            </Dialog.Description>
            <div className="preview-stage">{frame}</div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
