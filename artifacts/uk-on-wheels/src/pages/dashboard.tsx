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
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-xl border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-xl border border-border" />
          <div className="h-96 bg-white rounded-xl border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, John</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your operations today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/bookings/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
            New Booking
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboard.metrics.map((metric, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{metric.label}</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight">{metric.value}</span>
              <span className={cn(
                "text-xs font-medium mb-1 flex items-center",
                metric.change.startsWith('+') ? "text-primary" : "text-destructive"
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
            <h2 className="text-xl font-semibold tracking-tight">Recent Bookings</h2>
            <Link href="/bookings" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-border text-muted-foreground text-xs uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Customer & Vehicle</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboard.recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {booking.reference}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{booking.customer}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <CarFront className="w-3 h-3" /> {booking.vehicle}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate max-w-[200px]">{booking.pickup}</div>
                        <div className="truncate max-w-[200px] text-muted-foreground text-xs">→ {booking.destination}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          booking.status === "Delivered" ? "bg-emerald-100 text-emerald-700" :
                          booking.status === "In Transit" ? "bg-blue-100 text-blue-700" :
                          booking.status === "Collected" ? "bg-indigo-100 text-indigo-700" :
                          booking.status === "Assigned" ? "bg-amber-100 text-amber-700" :
                          booking.status === "Cancelled" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/bookings/${booking.id}`} className="inline-flex p-1.5 hover:bg-slate-100 rounded-md transition-colors text-muted-foreground hover:text-foreground">
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
            <h2 className="text-xl font-semibold tracking-tight">Status Overview</h2>
            <div className="bg-white rounded-xl border border-border shadow-sm p-4 space-y-3">
              {dashboard.statusCounts.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status.status === 'Pending' && <Clock className="w-4 h-4 text-slate-500" />}
                    {status.status === 'Assigned' && <Calendar className="w-4 h-4 text-amber-500" />}
                    {status.status === 'Collected' && <Truck className="w-4 h-4 text-indigo-500" />}
                    {status.status === 'In Transit' && <Truck className="w-4 h-4 text-blue-500" />}
                    {status.status === 'Delivered' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {status.status === 'Cancelled' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm font-medium">{status.status}</span>
                  </div>
                  <span className="text-sm font-bold bg-slate-100 px-2 py-0.5 rounded-md">{status.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <div className="space-y-5">
                {dashboard.activity.map((item, i) => (
                  <div key={item.id} className="relative flex gap-4">
                    {i !== dashboard.activity.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-px bg-border" />
                    )}
                    <div className={cn(
                      "w-4 h-4 rounded-full mt-1 shrink-0 z-10 border-2 border-white",
                      item.tone === 'success' ? "bg-emerald-500" :
                      item.tone === 'warning' ? "bg-amber-500" :
                      item.tone === 'info' ? "bg-blue-500" : "bg-slate-300"
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{item.occurredAt}</p>
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
