import { Users, FileText, Plus } from "lucide-react";

export default function HRPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">HR Records</h1>
          <p className="text-muted-foreground mt-1">Manage employee documents, leaves, and compliance.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg">Staff Directory</h2>
          </div>
          <div className="p-0">
             <div className="p-8 text-center border-b border-border/50">
               <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                 <Users className="w-6 h-6 text-slate-400" />
               </div>
               <p className="text-foreground font-medium">Directory functionality coming soon</p>
               <p className="text-sm text-muted-foreground mt-1">View and manage all internal staff members here.</p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h2 className="font-semibold text-lg mb-4">Compliance Alerts</h2>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Driver License Expiry</h4>
                  <p className="text-xs text-amber-700 mt-1">D. Miller's CPC certification expires in 14 days.</p>
                </div>
              </div>
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                <FileText className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Missing Documentation</h4>
                  <p className="text-xs text-red-700 mt-1">S. Jenkins right-to-work check pending.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
