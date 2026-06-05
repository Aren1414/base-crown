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
    <div className="mt-4 border border-zinc-800 rounded-xl p-4">
      <div className="text-sm text-zinc-500">
        {title}
      </div>

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}
