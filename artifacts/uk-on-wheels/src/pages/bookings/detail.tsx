import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetBooking, useCreateBooking, useUpdateBooking } from "@workspace/api-client-react";
import { 
  ArrowLeft, 
  MapPin, 
  CarFront, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Truck,
  FileText,
  CreditCard,
  User,
  ShieldAlert,
  Loader2,
  Save,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getListBookingsQueryKey, getGetBookingQueryKey } from "@workspace/api-client-react";

export default function BookingDetailPage() {
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const id = isNew ? 0 : parseInt(params.id!);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useGetBooking(id, {
    query: {
      enabled: !isNew,
      queryKey: getGetBookingQueryKey(id),
    }
  });

  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  // Form State
  const [formData, setFormData] = useState({
    customer: "",
    vehicle: "",
    registration: "",
    pickup: "",
    destination: "",
    collectionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    driver: "",
  });

  // Quick Action State
  const [quickStatus, setQuickStatus] = useState<string>("Pending");
  const [quickDriver, setQuickDriver] = useState("");

  useEffect(() => {
    if (booking && !isNew) {
      setFormData({
        customer: booking.customer,
        vehicle: booking.vehicle,
        registration: booking.registration || "",
        pickup: booking.pickup,
        destination: booking.destination,
        collectionDate: booking.collectionDate,
        amount: booking.amount,
        driver: booking.driver || "",
      });
      setQuickStatus(booking.status);
      setQuickDriver(booking.driver || "");
    }
  }, [booking, isNew]);

  const handleSave = () => {
    if (isNew) {
      createBooking.mutate({
        data: formData
      }, {
        onSuccess: () => {
          toast.success("Booking created successfully");
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          setLocation("/bookings");
        },
        onError: () => {
          toast.error("Failed to create booking");
        }
      });
    } else {
      updateBooking.mutate({
        id,
        data: {
          status: quickStatus as any,
          driver: formData.driver,
          amount: formData.amount
        }
      }, {
        onSuccess: (updatedData) => {
          toast.success("Booking updated successfully");
          queryClient.setQueryData(getGetBookingQueryKey(id), updatedData);
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        },
        onError: () => {
          toast.error("Failed to update booking");
        }
      });
    }
  };

  const handleQuickUpdate = () => {
    if (isNew) return;
    
    updateBooking.mutate({
      id,
      data: {
        status: quickStatus as any,
        driver: quickDriver || undefined
      }
    }, {
      onSuccess: (updatedData) => {
        toast.success("Status updated");
        setFormData(prev => ({ ...prev, driver: quickDriver }));
        queryClient.setQueryData(getGetBookingQueryKey(id), updatedData);
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to update status");
      }
    });
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/bookings")}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {isNew ? "New Booking" : booking?.reference}
              </h1>
              {!isNew && booking && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wider",
                  booking.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                  booking.status === "In Transit" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                  booking.status === "Collected" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                  booking.status === "Assigned" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                  booking.status === "Cancelled" ? "bg-red-50 text-red-700 border border-red-100" :
                  "bg-slate-50 text-slate-700 border border-slate-200"
                )}>
                  {booking.status}
                </span>
              )}
            </div>
            {!isNew && booking && (
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Created on {booking.createdAt}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button className="text-[13px] font-medium text-foreground hover:bg-muted px-3 py-1.5 rounded-sm border border-border transition-colors shadow-sm">
              Print Job Sheet
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={createBooking.isPending || updateBooking.isPending}
            className="flex items-center gap-2 text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {createBooking.isPending || updateBooking.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Details
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer & Vehicle */}
          <div className="bg-card rounded-sm border border-border shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-muted-foreground" />
              Customer & Vehicle Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Customer Name</label>
                <input 
                  value={formData.customer}
                  onChange={e => setFormData({...formData, customer: e.target.value})}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Acme Dealerships"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Vehicle Model</label>
                <div className="relative">
                  <CarFront className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input 
                    value={formData.vehicle}
                    onChange={e => setFormData({...formData, vehicle: e.target.value})}
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="e.g. Ford Transit Custom"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Registration</label>
                <input 
                  value={formData.registration}
                  onChange={e => setFormData({...formData, registration: e.target.value})}
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary uppercase"
                  placeholder="AB12 CDE"
                />
              </div>
            </div>
          </div>

          {/* Route Details */}
          <div className="bg-card rounded-sm border border-border shadow-sm p-5 space-y-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 border-b border-border pb-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Route & Logistics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Collection Location</label>
                <textarea 
                  value={formData.pickup}
                  onChange={e => setFormData({...formData, pickup: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Full pickup address..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Delivery Destination</label>
                <textarea 
                  value={formData.destination}
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Full delivery address..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Collection Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input 
                    type="date"
                    value={formData.collectionDate}
                    onChange={e => setFormData({...formData, collectionDate: e.target.value})}
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Sidebar Status & Finance */}
        <div className="space-y-6">
          
          {!isNew && (
            <div className="bg-muted/30 p-5 rounded-sm border border-border space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                Operational Status
              </h2>
              
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Current Phase</label>
                  <select 
                    value={quickStatus}
                    onChange={(e) => setQuickStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-sm text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Collected">Collected</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assigned Driver</label>
                  <div className="relative">
                    <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                    <input 
                      value={quickDriver}
                      onChange={(e) => setQuickDriver(e.target.value)}
                      placeholder="Unassigned"
                      className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  onClick={handleQuickUpdate}
                  disabled={updateBooking.isPending || (quickStatus === booking?.status && quickDriver === (booking?.driver || ""))}
                  className="w-full flex justify-center items-center gap-2 bg-foreground text-background px-4 py-1.5 rounded-sm font-medium text-[13px] hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {updateBooking.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Update Status
                </button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-sm border border-border shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 border-b border-border pb-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Finance
            </h2>
            
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Agreed Amount (£)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-medium text-[13px]">£</span>
                <input 
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-sm text-[13px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>

          {!isNew && (
            <div className="bg-card rounded-sm border border-border shadow-sm p-4 space-y-3">
              <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
              <div className="space-y-1">
                <button className="w-full text-left px-3 py-1.5 rounded-sm text-[13px] font-medium text-foreground hover:bg-muted transition-colors">
                  Generate Invoice
                </button>
                <button className="w-full text-left px-3 py-1.5 rounded-sm text-[13px] font-medium text-foreground hover:bg-muted transition-colors">
                  Email Driver Instructions
                </button>
                <button className="w-full text-left px-3 py-1.5 rounded-sm text-[13px] font-medium text-foreground hover:bg-muted transition-colors">
                  View Route Map
                </button>
                <div className="h-px bg-border my-2"></div>
                <button className="w-full text-left px-3 py-1.5 rounded-sm text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
                  Cancel Booking
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
