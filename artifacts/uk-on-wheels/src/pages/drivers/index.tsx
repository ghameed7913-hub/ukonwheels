import { Search, Plus, MapPin, Truck, Phone, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DriversPage() {
  const dummyDrivers = [
    { id: 1, name: "David Miller", status: "On Duty", location: "M6 Northbound", vehicle: "Transporter A1", jobsToday: 3, rating: 4.9 },
    { id: 2, name: "Sarah Jenkins", status: "Available", location: "Manchester Depot", vehicle: "Flatbed C4", jobsToday: 1, rating: 4.8 },
    { id: 3, name: "James Wilson", status: "On Duty", location: "London M25", vehicle: "Transporter B2", jobsToday: 4, rating: 5.0 },
    { id: 4, name: "Michael Chang", status: "Off Duty", location: "-", vehicle: "Unassigned", jobsToday: 0, rating: 4.7 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Drivers</h1>
          <p className="text-muted-foreground mt-1">Manage driver fleet, assignments, and availability.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Drivers</h3>
          <p className="text-3xl font-bold text-foreground">24</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Active Now</h3>
          <p className="text-3xl font-bold text-emerald-600">18</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Fleet Utilization</h3>
          <p className="text-3xl font-bold text-blue-600">82%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search drivers..." 
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50/50">
          {dummyDrivers.map((driver) => (
            <div key={driver.id} className="bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-600 border border-slate-200">
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{driver.name}</h3>
                    <div className="flex items-center text-xs text-amber-500 font-medium">
                      <Star className="w-3 h-3 fill-current mr-1" /> {driver.rating}
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                  driver.status === "On Duty" ? "bg-emerald-100 text-emerald-700" :
                  driver.status === "Available" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {driver.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{driver.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span>{driver.vehicle}</span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                  <div className="text-xs font-medium"><span className="text-foreground">{driver.jobsToday}</span> jobs today</div>
                  <button className="text-primary font-medium text-xs hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
