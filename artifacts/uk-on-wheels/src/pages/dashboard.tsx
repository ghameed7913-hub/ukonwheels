import { useGetDashboard } from "@workspace/api-client-react";
import { 
  CarFront, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  Truck,
  XCircle,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted/50 rounded-sm border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-muted/50 rounded-sm border border-border" />
          <div className="h-80 bg-muted/50 rounded-sm border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Today's operational metrics and activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/bookings/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm text-[13px] font-medium transition-colors bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 px-4 py-1.5">
            New Booking
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboard.metrics.map((metric, i) => (
          <div key={i} className="bg-card p-5 rounded-sm border border-border shadow-sm flex flex-col justify-between">
            <h3 className="text-[13px] font-medium text-muted-foreground">{metric.label}</h3>
            <div className="flex items-end justify-between mt-3">
              <span className="text-2xl font-semibold tracking-tight">{metric.value}</span>
              <span className={cn(
                "text-[11px] font-medium flex items-center px-1.5 py-0.5 rounded-sm",
                metric.change.startsWith('+') ? "text-emerald-700 bg-emerald-50" : "text-destructive bg-destructive/10"
              )}>
                {metric.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {metric.change.replace(/[+-]/, '')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Recent Bookings</h2>
            <Link href="/bookings" className="text-[13px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="bg-card rounded-sm border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] text-left">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground text-xs font-medium">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Reference</th>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Route</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboard.recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {booking.reference}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{booking.customer}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <CarFront className="w-3 h-3" /> {booking.vehicle}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate max-w-[180px] text-foreground">{booking.pickup}</div>
                        <div className="truncate max-w-[180px] text-[11px] text-muted-foreground mt-0.5">→ {booking.destination}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-medium",
                          booking.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          booking.status === "In Transit" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          booking.status === "Collected" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                          booking.status === "Assigned" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          booking.status === "Cancelled" ? "bg-red-50 text-red-700 border border-red-100" :
                          "bg-slate-50 text-slate-700 border border-slate-200"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/bookings/${booking.id}`} className="inline-flex p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-sm transition-all text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Feed & Status */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-tight">Status Overview</h2>
            <div className="bg-card rounded-sm border border-border shadow-sm p-4 space-y-3">
              {dashboard.statusCounts.map((status) => (
                <div key={status.status} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    {status.status === 'Pending' && <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    {status.status === 'Assigned' && <Calendar className="w-3.5 h-3.5 text-amber-500" />}
                    {status.status === 'Collected' && <Truck className="w-3.5 h-3.5 text-indigo-500" />}
                    {status.status === 'In Transit' && <Truck className="w-3.5 h-3.5 text-blue-500" />}
                    {status.status === 'Delivered' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {status.status === 'Cancelled' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className="font-medium text-foreground">{status.status}</span>
                  </div>
                  <span className="font-semibold text-muted-foreground">{status.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-tight">Recent Activity</h2>
            <div className="bg-card rounded-sm border border-border shadow-sm p-4">
              <div className="space-y-4">
                {dashboard.activity.map((item, i) => (
                  <div key={item.id} className="relative flex gap-3">
                    {i !== dashboard.activity.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-[-16px] w-px bg-border" />
                    )}
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 z-10 border-2 border-background",
                      item.tone === 'success' ? "bg-emerald-500" :
                      item.tone === 'warning' ? "bg-amber-500" :
                      item.tone === 'info' ? "bg-blue-500" : "bg-slate-300"
                    )} />
                    <div className="pb-1">
                      <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{item.occurredAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
