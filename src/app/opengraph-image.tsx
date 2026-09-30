import { socialImage } from "@/lib/brand-art";

export const alt = "Elara, the intelligent workspace for executive operations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return socialImage(size.width, size.height);
}
