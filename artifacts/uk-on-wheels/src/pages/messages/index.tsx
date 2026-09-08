import { Search, Send } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Communications</h1>
        <p className="text-muted-foreground mt-1">Internal chat and customer notifications.</p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-border shadow-sm flex overflow-hidden min-h-0">
        <div className="w-80 border-r border-border flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring shadow-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="p-3 bg-white border border-border shadow-sm rounded-lg cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-sm">David Miller (Driver)</h4>
                <span className="text-[10px] text-muted-foreground">10:42 AM</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">Stuck in traffic on M6, will be delayed by 20m.</p>
            </div>
            <div className="p-3 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-sm">System Alerts</h4>
                <span className="text-[10px] text-muted-foreground">Yesterday</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">Invoice INV-2024-001 has been paid.</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-border flex justify-between items-center shadow-sm z-10">
            <div>
              <h3 className="font-semibold text-foreground">David Miller (Driver)</h3>
              <p className="text-xs text-emerald-600 font-medium">Online</p>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-slate-50/30">
            <div className="flex justify-center">
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">Today</span>
            </div>
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">DM</div>
              <div className="bg-white border border-border p-3 rounded-2xl rounded-tl-none shadow-sm">
                <p className="text-sm text-slate-700">Stuck in traffic on M6, will be delayed by 20m for the Manchester collection.</p>
                <p className="text-[10px] text-muted-foreground mt-1">10:42 AM</p>
              </div>
            </div>
            <div className="flex items-start gap-2 max-w-[80%] self-end flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">JS</div>
              <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-none shadow-sm">
                <p className="text-sm">Copy that. I'll notify the customer. Drive safely.</p>
                <p className="text-[10px] text-primary-foreground/70 mt-1 text-right">10:45 AM</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-white">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Type a message..." 
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
