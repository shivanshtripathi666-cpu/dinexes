"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cfg } from "@/lib/firebase/client";

export function seatUrl(token: string) {
  return `${cfg().platformUrl}/t/${token}`;
}

/** QR code as inline SVG (sharp at any print size). */
export function QrSvg({ value, className = "size-40" }: { value: string; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#121826", light: "#ffffff" } }).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [value]);
  return <div className={className} role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export async function downloadQrPng(value: string, filename: string, caption: string) {
  const qr = await QRCode.toDataURL(value, { width: 900, margin: 2, errorCorrectionLevel: "M", color: { dark: "#121826", light: "#ffffff" } });
  const img = new Image();
  img.src = qr;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1040;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, 900, 900);
  ctx.fillStyle = "#121826";
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(caption, 450, 990);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}
