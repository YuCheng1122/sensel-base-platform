"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function SettingsDialog({
  open,
  onOpenChange,
  title,
  children,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="settings-dialog-overlay" />
        <Dialog.Content
          className="settings-dialog"
          aria-describedby={undefined}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close
            className="icon-button settings-dialog-close"
            aria-label="關閉"
            disabled={busy}
          >
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
