"use client";
import { useCallback, useEffect, useState } from "react";
import type { MailDelivery } from "@sensel/mail/contracts";

interface MailOperation {
  key: string;
  recipient: string;
  version: number;
  attempted: boolean;
  receipt?: MailDelivery;
}
export function useMailOperation(actorId: string, version: number) {
  const storageKey = `sensel-mail-test:${actorId}`;
  const [operation, setOperation] = useState<MailOperation>({
    key: "",
    recipient: "",
    version,
    attempted: false,
  });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      ) as MailOperation | null;
      if (
        stored &&
        stored.version === version &&
        typeof stored.key === "string" &&
        typeof stored.recipient === "string"
      )
        setOperation(stored);
      else
        setOperation({
          key: crypto.randomUUID(),
          recipient: "",
          version,
          attempted: false,
        });
    } catch {
      setOperation({
        key: crypto.randomUUID(),
        recipient: "",
        version,
        attempted: false,
      });
    }
    setReady(true);
  }, [storageKey, version]);
  const update = useCallback(
    (next: MailOperation) => {
      setOperation(next);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* The in-memory operation remains stable if browser storage is unavailable. */
      }
    },
    [storageKey],
  );
  const observe = useCallback(
    (items: MailDelivery[]) => {
      setOperation((current) => {
        const receipt = items.find(
          (item) =>
            item.idempotencyKey === current.key &&
            item.configVersion === current.version,
        );
        if (!receipt) return current;
        const next = { ...current, attempted: true, receipt };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* Keep state in memory. */
        }
        return next;
      });
    },
    [storageKey],
  );
  return { operation, ready, update, observe };
}
