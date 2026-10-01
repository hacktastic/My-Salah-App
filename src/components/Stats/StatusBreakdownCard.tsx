const StatusBreakdownCard = ({
  statusBreakdownData,
}: {
  statusBreakdownData: { title: string; value: number; color: string }[];
}) => {
  const totalStatusCount = statusBreakdownData.reduce(
    (total, item) => total + item.value,
    0,
  );

  const statusData = statusBreakdownData.map((item) => ({
    ...item,
    percentage: (item.value / totalStatusCount) * 100,
  }));

  return (
    <section className="px-4 pb-4 pt-1 mt-5 bg-[var(--card-bg-color)] rounded-2xl">
      <h2 className="text-base font-semibold">Status breakdown</h2>

      <div
        role="img"
        aria-label={statusData
          .map((item) => `${item.title}: ${item.percentage.toFixed(1)}%`)
          .join(", ")}
        // The gap separates Jamaah from Alone, which share a colour. flex-grow keeps the gaps inside the bar.
        className="flex h-3 mt-4 overflow-hidden rounded-full gap-[2px]"
      >
        {statusData
          .filter((item) => item.value > 0)
          .map((item) => (
            <span
              key={item.title}
              aria-hidden="true"
              style={{
                flex: `${item.percentage} 1 0`,
                backgroundColor: item.color,
              }}
            />
          ))}
      </div>

      <div className="grid grid-cols-4 gap-1 mt-4">
        {statusData.map((item) => (
          <div key={item.title} className="min-w-0">
            <div className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-[0.15rem] shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] truncate min-[375px]:text-xs">
                {item.title}
              </span>
            </div>
            <p className="pl-3 mt-1 text-xs font-semibold">
              {item.percentage.toFixed(1)}%
            </p>
            <p className="pl-3 mt-0.5 text-[10px] leading-tight opacity-60 min-[375px]:text-[11px]">
              {item.value.toLocaleString()} {item.value === 1 ? "prayer" : "prayers"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatusBreakdownCard;
