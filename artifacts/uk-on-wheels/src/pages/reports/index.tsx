import { PieChart, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Operational Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 bg-white border border-border rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option>Last 30 Days</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placeholder Charts */}
        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Revenue Trend</h3>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="h-64 flex items-end justify-between gap-2 px-2 pb-6 pt-4 border-b border-border/50 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:100%_2rem]">
            {/* Dummy bars */}
            <div className="w-full bg-primary/20 rounded-t-sm h-[30%] hover:bg-primary/40 transition-colors relative group"><div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">Week 1</div></div>
            <div className="w-full bg-primary/40 rounded-t-sm h-[50%] hover:bg-primary/60 transition-colors relative group"><div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">Week 2</div></div>
            <div className="w-full bg-primary/60 rounded-t-sm h-[40%] hover:bg-primary/80 transition-colors relative group"><div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">Week 3</div></div>
            <div className="w-full bg-primary rounded-t-sm h-[80%] hover:bg-primary/90 transition-colors relative group"><div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">Week 4</div></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Deliveries by Region</h3>
            <PieChart className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="h-64 flex items-center justify-center">
             <div className="w-48 h-48 rounded-full border-[16px] border-slate-100 relative">
               <div className="absolute inset-[-16px] border-[16px] border-primary rounded-full" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 50%)' }}></div>
               <div className="absolute inset-[-16px] border-[16px] border-amber-500 rounded-full" style={{ clipPath: 'polygon(50% 50%, 0 50%, 0 0, 40% 0)' }}></div>
               <div className="absolute inset-[-16px] border-[16px] border-emerald-500 rounded-full" style={{ clipPath: 'polygon(50% 50%, 40% 0, 100% 0)' }}></div>
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <span className="text-3xl font-bold">142</span>
                 <span className="text-xs text-muted-foreground uppercase font-medium">Total</span>
               </div>
             </div>
          </div>
          <div className="flex justify-center gap-4 text-sm mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-primary rounded-sm"></div> North</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> South</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded-sm"></div> Midlands</div>
          </div>
        </div>
      </div>
    </div>
  );
}
