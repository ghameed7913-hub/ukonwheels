import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useListBookings } from "@workspace/api-client-react";
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  CarFront, 
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [, setLocation] = useLocation();

  const { data: bookings, isLoading } = useListBookings({
    search: searchTerm || undefined,
    status: statusFilter || undefined
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage vehicle collections and deliveries.</p>
        </div>
        <button 
          onClick={() => setLocation("/bookings/new")}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13px] font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 px-4 py-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Booking
        </button>
      </div>

      <div className="bg-card rounded-sm border border-border shadow-sm flex flex-col">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row items-center gap-3 bg-muted/10">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input 
              type="text" 
              placeholder="Search references, customers, vehicles..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-40">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Collected">Collected</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-muted"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </div>
          </div>
        ) : bookings?.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <CarFront className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground">No bookings found</h3>
            <p className="text-[13px] text-muted-foreground mt-1 mb-4 max-w-sm">We couldn't find any bookings matching your current filters.</p>
            {(searchTerm || statusFilter) && (
              <button 
                onClick={() => { setSearchTerm(""); setStatusFilter(""); }}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground text-xs font-medium">
                <tr>
                  <th className="px-4 py-2.5 font-medium w-[120px]">Reference</th>
                  <th className="px-4 py-2.5 font-medium">Customer & Vehicle</th>
                  <th className="px-4 py-2.5 font-medium">Route</th>
                  <th className="px-4 py-2.5 font-medium w-[140px]">Status</th>
                  <th className="px-4 py-2.5 font-medium w-[120px] text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings?.map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{booking.reference}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{booking.collectionDate}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{booking.customer}</div>
                      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-0.5">
                        <CarFront className="w-3 h-3" />
                        <span>{booking.vehicle}</span>
                        {booking.registration && (
                          <span className="bg-muted px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] ml-1 border border-border">
                            {booking.registration}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top max-w-[280px]">
                      <div className="flex flex-col gap-1">
                        <div className="truncate text-foreground" title={booking.pickup}>{booking.pickup}</div>
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground truncate" title={booking.destination}>
                          <ArrowRight className="w-3 h-3 shrink-0" />
                          <span className="truncate">{booking.destination}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
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
                      {booking.driver && (
                        <div className="text-[11px] text-muted-foreground mt-1.5 truncate">
                          Driver: {booking.driver}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="font-medium text-foreground">£{booking.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <Link href={`/bookings/${booking.id}`} className="inline-flex p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
