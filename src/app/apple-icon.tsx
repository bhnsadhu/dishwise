import { ImageResponse } from "next/og";
import { MarkSvg } from "@/components/icons";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Square corners: iOS applies its own rounded mask to home-screen icons.
export default function AppleIcon() {
  return new ImageResponse(<MarkSvg size={180} brand="#f2a71b" ink="#1c1303" radius={0} />, size);
}
