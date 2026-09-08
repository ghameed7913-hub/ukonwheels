import { Briefcase, Search, Plus, Filter } from "lucide-react";

export default function BusinessesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client businesses and dealerships.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13px] font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 px-4 py-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Customer
        </button>
      </div>

      <div className="bg-card rounded-sm border border-border shadow-sm flex flex-col">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row items-center gap-3 bg-muted/10">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] font-medium hover:bg-muted transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        <div className="p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Briefcase className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground">No customers found</h3>
          <p className="text-[13px] text-muted-foreground mt-1 mb-4 max-w-sm">Customer records will appear here.</p>
        </div>
      </div>
    </div>
  );
}