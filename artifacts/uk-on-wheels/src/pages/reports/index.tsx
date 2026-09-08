import { BarChart3, Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate performance and operational reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Monthly Deliveries", desc: "Completed runs vs targets" },
          { title: "Revenue by Customer", desc: "Breakdown of top accounts" },
          { title: "Driver Performance", desc: "Timings and completion rates" },
          { title: "Geographic Hotspots", desc: "Most active pickup/dropoff areas" },
        ].map((report, i) => (
          <div key={i} className="bg-card p-5 rounded-sm border border-border shadow-sm hover:border-primary/30 transition-colors group cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center text-muted-foreground mb-4 group-hover:text-primary transition-colors">
                <BarChart3 className="w-4 h-4" />
              </div>
              <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
            <p className="text-[13px] text-muted-foreground mt-1">{report.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}