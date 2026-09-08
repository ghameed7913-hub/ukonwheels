import { MessageSquare, Search, Edit } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">Driver chat and customer notifications.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13px] font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 px-4 py-1.5 transition-colors">
          <Edit className="w-3.5 h-3.5" />
          New Message
        </button>
      </div>

      <div className="flex-1 bg-card rounded-sm border border-border shadow-sm flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-border flex flex-col bg-muted/10">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-[12px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Empty state for sidebar */}
            <div className="p-6 text-center text-[12px] text-muted-foreground">
              No recent conversations
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-background">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground">No conversation selected</h3>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">Select a thread from the list to view messages.</p>
        </div>
      </div>
    </div>
  );
}