import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  children: ReactNode;
};

export default function SectionCard({
  title,
  children,
}: SectionCardProps) {
  return (
    <div
      className="
        mt-4
        rounded-2xl
        border
        border-blue-500/15
        bg-white/5
        backdrop-blur-md
        p-4
        shadow-lg
      "
    >
      <div className="text-sm text-blue-200/70">
        {title}
      </div>

      <div className="mt-3">
        {children}
      </div>
    </div>
  );
}
