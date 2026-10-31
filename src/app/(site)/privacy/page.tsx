import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { APP_NAME } from "@/lib/config";
import { env } from "@/lib/server/env";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  const mail = env.supportEmail;
  return (
    <LegalPage title="Privacy policy" updated="31 October 2026">
      <p>
        {APP_NAME} provides QR code ordering software to restaurants. This policy explains what we collect, why, and your choices. It follows the
        Digital Personal Data Protection Act, 2023 (India).
      </p>
      <h2>Guests who order</h2>
      <ul>
        <li>Guests do not create an account and we do not ask for their name, phone number or email.</li>
        <li>We store the order itself (dishes, quantities, instructions, seat, time) so the restaurant can prepare and bill it.</li>
        <li>If a guest rates dishes, we store the stars and the optional comment with the order number, not with any personal details.</li>
        <li>The guest&apos;s phone keeps the cart and a list of their recent orders in its own browser storage. This never leaves the phone.</li>
      </ul>
      <h2>Restaurant owners and staff</h2>
      <ul>
        <li>Name, email, restaurant details you enter, and the logins the owner creates for staff.</li>
        <li>Passwords are handled by Google Firebase Authentication and are stored only in scrambled (hashed) form. Nobody at {APP_NAME} and no restaurant owner can read them.</li>
        <li>Plan payments are processed by Razorpay. We never see or store card or bank details; we keep the payment reference, amount and dates.</li>
        <li>If a kitchen device turns on notifications, we store a device token to send order alerts. It is deleted when staff access is removed.</li>
      </ul>
      <h2>Where data is kept</h2>
      <p>Data is stored on Google Cloud (Firebase) servers in Mumbai, India, with encryption in transit and at rest. Each restaurant can see only its own data.</p>
      <h2>How long we keep it</h2>
      <p>Order and sales records are kept while the restaurant uses {APP_NAME} so it can see its history. A restaurant owner can ask us to delete the restaurant and its data at any time.</p>
      <h2>We do not</h2>
      <ul>
        <li>sell personal data, show advertising, or use the microphone or camera of any device;</li>
        <li>share data with anyone except the service providers needed to run {APP_NAME} (Google Cloud, Razorpay), or when the law requires it.</li>
      </ul>
      <h2>Your rights and contact</h2>
      <p>
        You can ask to see, correct or delete your data, or raise a grievance, by writing to <a className="underline" href={`mailto:${mail}`}>{mail}</a>. We reply within 7 working days.
      </p>
    </LegalPage>
  );
}
