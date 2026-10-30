import { ImageResponse } from "next/og";
import { MarkSvg } from "@/components/icons";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<MarkSvg size={64} brand="#f2a71b" ink="#1c1303" radius={8} />, size);
}
