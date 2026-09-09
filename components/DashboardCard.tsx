type DashboardCardProps = {
  title: string;
  value: string;
  description?: string;
};

export default function DashboardCard({
  title,
  value,
  description,
}: DashboardCardProps) {
  return (
    <div className="rounded-xl border p-4 shadow-sm bg-white">
      <h3 className="text-lg font-bold">
        {title}
      </h3>

      <p className="text-2xl font-semibold mt-2">
        {value}
      </p>

      {description && (
        <p className="text-sm mt-2 text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}
