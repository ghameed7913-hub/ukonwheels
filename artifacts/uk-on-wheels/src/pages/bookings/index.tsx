import { useState } from "react";
import { useLocation } from "wouter";
import { useListBookings } from "@workspace/api-client-react";
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  MapPin, 
  CarFront, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Truck,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage vehicle collections and deliveries.</p>
        </div>
        <button 
          onClick={() => setLocation("/bookings/new")}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="w-4 h-4" />
          Create Booking
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by reference, customer or vehicle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Collected">Collected</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading bookings...</div>
        ) : bookings?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <CarFront className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No bookings found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">We couldn't find any bookings matching your criteria.</p>
            <button 
              onClick={() => { setSearchTerm(""); setStatusFilter(""); }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4 font-semibold">Reference</th>
                  <th className="px-6 py-4 font-semibold">Customer & Vehicle</th>
                  <th className="px-6 py-4 font-semibold">Route</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings?.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setLocation(`/bookings/${booking.id}`)}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{booking.reference}</div>
                      <div className="text-xs text-muted-foreground mt-1">£{booking.amount}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{booking.customer}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <CarFront className="w-3 h-3" />
                        {booking.vehicle}
                        {booking.registration && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-200">{booking.registration}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[180px]">{booking.pickup}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[180px]">{booking.destination}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {new Date(booking.collectionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                        booking.status === "Delivered" ? "bg-emerald-100 text-emerald-700" :
                        booking.status === "In Transit" ? "bg-blue-100 text-blue-700" :
                        booking.status === "Collected" ? "bg-indigo-100 text-indigo-700" :
                        booking.status === "Assigned" ? "bg-amber-100 text-amber-700" :
                        booking.status === "Cancelled" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {booking.status === "Pending" && <Clock className="w-3 h-3" />}
                        {booking.status === "Delivered" && <CheckCircle2 className="w-3 h-3" />}
                        {(booking.status === "In Transit" || booking.status === "Collected") && <Truck className="w-3 h-3" />}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setLocation(`/bookings/${booking.id}`); }}
                        className="inline-flex p-2 hover:bg-slate-100 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
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
