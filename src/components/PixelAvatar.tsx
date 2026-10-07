import type { CharacterId } from "../types/game";
import wangChuyi from "../assets/optimized/wang-chuyi.webp";

type AvatarKind = CharacterId | "cat";

interface PixelAvatarProps {
  kind: AvatarKind;
  size?: "small" | "large";
}

export function PixelAvatar({ kind, size = "large" }: PixelAvatarProps) {
  if (kind === "cat") {
    return <img className={`wang-chuyi wang-chuyi--${size}`} src={wangChuyi} alt="王初一" decoding="async" />;
  }

  return (
    <div className={`pixel-avatar pixel-avatar--${kind} pixel-avatar--${size}`} aria-hidden="true">
      <span className="avatar-ear avatar-ear--left" />
      <span className="avatar-ear avatar-ear--right" />
      <span className="avatar-hair" />
      <span className="avatar-face" />
      <span className="avatar-eye avatar-eye--left" />
      <span className="avatar-eye avatar-eye--right" />
      <span className="avatar-nose" />
      <span className="avatar-mouth" />
      <span className="avatar-body" />
      <span className="avatar-prop" />
    </div>
  );
}


