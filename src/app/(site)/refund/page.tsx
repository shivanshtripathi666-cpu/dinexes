import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { APP_NAME, TRIAL_DAYS } from "@/lib/config";
import { env } from "@/lib/server/env";

export const metadata: Metadata = { title: "Cancellation and refund policy" };

export default function Refund() {
  const mail = env.supportEmail;
  return (
    <LegalPage title="Cancellation and refund policy" updated="31 October 2026">
      <ul>
        <li>Every restaurant gets a {TRIAL_DAYS}-day free trial so you can try {APP_NAME} before paying anything.</li>
        <li>Plans are paid in advance and do not renew automatically. To stop, simply do not buy the next period; there is nothing to cancel.</li>
        <li>If you were charged twice for the same period, or charged but the plan was not added, write to us and we refund the extra amount in full.</li>
        <li>If you ask within 7 days of paying and have not received any orders through {APP_NAME} in that period, we refund the full amount.</li>
        <li>Approved refunds go back to the original payment method through Razorpay within 5 to 7 working days.</li>
      </ul>
      <p>
        Write to <a className="underline" href={`mailto:${mail}`}>{mail}</a> with your restaurant name and payment reference.
      </p>
    </LegalPage>
  );
}
