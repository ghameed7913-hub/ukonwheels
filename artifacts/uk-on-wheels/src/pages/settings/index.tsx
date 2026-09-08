import { Building, Bell, Shield, Paintbrush } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage portal configuration and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-64 flex flex-col gap-1 shrink-0">
          <button className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium bg-slate-100 text-foreground rounded-lg">
            <Building className="w-4 h-4 text-primary" /> General
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground rounded-lg transition-colors">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground rounded-lg transition-colors">
            <Shield className="w-4 h-4" /> Security & Access
          </button>
          <button className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-slate-50 hover:text-foreground rounded-lg transition-colors">
            <Paintbrush className="w-4 h-4" /> Appearance
          </button>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-border shadow-sm p-6 space-y-6 w-full">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">General Settings</h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company Name</label>
                <input type="text" defaultValue="UK On Wheels Ltd" className="w-full max-w-md px-3 py-2 border border-border rounded-md text-sm" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Support Email</label>
                <input type="email" defaultValue="support@ukonwheels.co.uk" className="w-full max-w-md px-3 py-2 border border-border rounded-md text-sm" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Timezone</label>
                <select className="w-full max-w-md px-3 py-2 border border-border rounded-md text-sm">
                  <option>London (GMT/BST)</option>
                  <option>Europe/Paris</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
