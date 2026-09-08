import { Settings, Save, Shield, Bell, User } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your portal preferences.</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13px] font-medium bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-8 px-4 py-1.5 transition-colors">
          <Save className="w-3.5 h-3.5" />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-sm bg-muted text-foreground">
            <User className="w-4 h-4" /> Account
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <Shield className="w-4 h-4" /> Security
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <Settings className="w-4 h-4" /> System
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="bg-card rounded-sm border border-border shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-semibold border-b border-border pb-3">Profile Information</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground">First Name</label>
                  <input 
                    type="text" 
                    defaultValue="John"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground">Last Name</label>
                  <input 
                    type="text" 
                    defaultValue="Smith"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="john.smith@ukonwheels.co.uk"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-sm border border-border shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-semibold border-b border-border pb-3">Company Details</h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Company Name</label>
                <input 
                  type="text" 
                  defaultValue="UK On Wheels Ltd"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Registration Number</label>
                <input 
                  type="text" 
                  defaultValue="12345678"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}