import { brandIcon } from "@/lib/brand-art";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return brandIcon(size.width, size.height);
}
