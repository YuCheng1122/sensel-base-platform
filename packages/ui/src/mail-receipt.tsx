import type { MailDelivery } from "@sensel/mail/contracts";

export function MailReceipt({ delivery }: { delivery: MailDelivery }) {
  const labels: Record<string, string> = {
    accepted: "供應商已接受，尚未確認送達",
    rejected: "供應商拒絕寄送",
    unknown: "寄送結果未知，可能已寄出",
    cancelled: "寄送已取消",
    pending: "等待寄送，尚未交付供應商",
    sending: "寄送處理中，尚未確認結果",
  };
  return (
    <div className="mail-receipt">
      <strong>{labels[delivery.state] ?? "未知投遞狀態"}</strong>
      {delivery.synthetic && (
        <span className="mail-synthetic">合成測試，未寄出真實郵件</span>
      )}
      {delivery.state === "accepted" && (
        <p>此紀錄不代表郵件已進入收件匣或已閱讀；目前未提供送達回查。</p>
      )}
      {delivery.state === "unknown" && (
        <p role="alert">
          請先核對信箱及供應商紀錄，勿直接重寄。重新整理只讀取紀錄，不會再次寄送。
        </p>
      )}
      {delivery.errorCode && (
        <p>
          狀態代碼：<code>{delivery.errorCode}</code>
        </p>
      )}
      {delivery.providerMessageId && (
        <p>
          供應商識別碼：<code>{delivery.providerMessageId}</code>
        </p>
      )}
    </div>
  );
}
