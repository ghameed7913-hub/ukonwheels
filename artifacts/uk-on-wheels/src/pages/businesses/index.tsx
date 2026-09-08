import { Plus, Search, MoreVertical, MapPin, Mail } from "lucide-react";

export default function BusinessesPage() {
  const dummyBusinesses = [
    { id: 1, name: "Acme Fleet Services", type: "Dealership", location: "Manchester", activeBookings: 12, revenue: 14500, status: "Active" },
    { id: 2, name: "Global Rentals UK", type: "Rental Fleet", location: "London", activeBookings: 8, revenue: 9200, status: "Active" },
    { id: 3, name: "Northern Auto Traders", type: "Auction House", location: "Leeds", activeBookings: 3, revenue: 4100, status: "Active" },
    { id: 4, name: "Prime Corporate Lease", type: "Leasing", location: "Birmingham", activeBookings: 0, revenue: 1250, status: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Customers & Businesses</h1>
          <p className="text-muted-foreground mt-1">Manage corporate clients and regular customers.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-muted-foreground text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4 font-semibold">Business Name</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold text-center">Active Bookings</th>
                <th className="px-6 py-4 font-semibold text-right">YTD Revenue</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dummyBusinesses.map((business) => (
                <tr key={business.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {business.name.charAt(0)}
                      </div>
                      <div>
                        {business.name}
                        <div className="text-xs text-muted-foreground font-normal">{business.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {business.location}</div>
                      <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> contact@{business.name.toLowerCase().replace(/\s/g, '')}.com</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${business.activeBookings > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {business.activeBookings}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    £{business.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex p-2 hover:bg-slate-100 rounded-md transition-colors text-muted-foreground hover:text-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
