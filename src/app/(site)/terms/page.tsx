import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { APP_NAME, MAX_STAFF, PLANS, TRIAL_DAYS } from "@/lib/config";
import { env } from "@/lib/server/env";

export const metadata: Metadata = { title: "Terms of service" };

export default function Terms() {
  const mail = env.supportEmail;
  return (
    <LegalPage title="Terms of service" updated="31 October 2026">
      <p>These terms apply to restaurants that use {APP_NAME}. By registering a restaurant you accept them.</p>
      <h2>The service</h2>
      <ul>
        <li>{APP_NAME} lets guests order from a QR code on their seat and shows those orders to the restaurant&apos;s staff.</li>
        <li>Guests pay the restaurant directly. {APP_NAME} takes no commission on food orders and is not a party to the sale of food.</li>
        <li>The restaurant is responsible for its menu, prices, taxes, food quality and service.</li>
      </ul>
      <h2>Accounts</h2>
      <ul>
        <li>One owner registers one restaurant. The owner may create up to {MAX_STAFF} logins in total (including their own) for staff of that restaurant.</li>
        <li>Keep passwords private. The owner is responsible for the staff logins they create and should remove access when someone leaves.</li>
      </ul>
      <h2>Trial and plans</h2>
      <ul>
        <li>A {TRIAL_DAYS}-day free trial starts on registration. No payment details are needed for the trial.</li>
        <li>Plans: {PLANS.map((p) => `${p.label} ₹${p.priceInr}`).join(", ")}, taxes as applicable. A paid plan adds its days after the current trial or plan ends.</li>
        <li>When no trial or plan is active, guests cannot place new orders. The dashboard and past records stay available.</li>
        <li>Prices may change with 30 days&apos; notice; a period you have already paid for is not affected.</li>
      </ul>
      <h2>Fair use</h2>
      <p>Do not misuse the service: no attempts to access other restaurants&apos; data, overload the system, or place fake orders. We may suspend accounts that do.</p>
      <h2>Availability</h2>
      <p>
        We work to keep {APP_NAME} available at all times but cannot promise it will never be interrupted. Voice announcements depend on the
        browser and phone; orders always remain visible on screen. Our liability is limited to the amount paid for the current plan period.
      </p>
      <h2>Contact</h2>
      <p>
        Questions: <a className="underline" href={`mailto:${mail}`}>{mail}</a>. These terms are governed by the laws of India.
      </p>
    </LegalPage>
  );
}
