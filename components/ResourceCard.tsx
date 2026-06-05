type ResourceCardProps = {
  title: string;
  value: string | number;
};

export default function ResourceCard({
  title,
  value,
}: ResourceCardProps) {
  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <div className="text-zinc-500 text-xs">
        {title}
      </div>

      <div className="text-xl font-bold">
        {value}
      </div>
    </div>
  );
}
