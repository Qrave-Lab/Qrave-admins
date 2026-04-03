import { Overview } from "@/lib/types";

type Props = {
  data: Overview;
};

export default function KpiCards({ data }: Props) {
  const cards = [
    { label: "Total Restaurants", value: data.totalRestaurants.toLocaleString("en-IN") },
    { label: "Active Restaurants", value: data.activeRestaurants.toLocaleString("en-IN") },
    { label: "MRR", value: `₹${data.mrr.toLocaleString("en-IN")}` },
    { label: "Total Revenue (Range)", value: `₹${data.totalRevenueRange.toLocaleString("en-IN")}` },
  ];

  return (
    <div className="card-grid">
      {cards.map((card) => (
        <div className="card" key={card.label}>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-value">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
