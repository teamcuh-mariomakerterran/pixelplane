import { catalogPixelSrc, toolPixelSrc, type IconTheme } from "@/lib/icon-library/pixel-packs";
import { useIconTheme } from "@/lib/icon-library/theme";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Props = {
  /** catalog id e.g. chrome.studio OR tool id e.g. brush */
  id?: string;
  toolId?: string;
  size?: number;
  className?: string;
  alt?: string;
  /** force theme */
  theme?: IconTheme;
  /** lucide fallback node */
  fallback?: React.ReactNode;
};

/**
 * Renders Brian’s pixel icon when theme is amber/cyan; otherwise fallback.
 * Photo-sliced packs use auto rendering (not pixelated) so JPEG fringes stay soft.
 */
export function PixelIcon({
  id,
  toolId,
  size = 22,
  className,
  alt = "",
  theme: themeProp,
  fallback,
}: Props) {
  const storeTheme = useIconTheme((s) => s.theme);
  const theme = themeProp ?? storeTheme;
  const [failed, setFailed] = useState(false);

  if (theme === "vector" || failed) {
    return <>{fallback}</>;
  }

  const src = toolId
    ? toolPixelSrc(toolId, theme)
    : id
      ? catalogPixelSrc(id, theme)
      : null;

  if (!src) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("pointer-events-none select-none object-contain", className)}
      style={{
        imageRendering: "auto",
        width: size,
        height: size,
      }}
    />
  );
}
