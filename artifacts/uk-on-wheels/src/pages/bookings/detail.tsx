import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetBooking, useCreateBooking, useUpdateBooking, getGetBookingQueryKey, getListBookingsQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, MapPin, CarFront, Calendar, Truck, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Zod schemas matching OpenAPI specs
const createBookingSchema = z.object({
  customer: z.string().min(2, "Customer name is required"),
  vehicle: z.string().min(2, "Vehicle details are required"),
  registration: z.string().optional(),
  pickup: z.string().min(2, "Pickup address is required"),
  destination: z.string().min(2, "Destination address is required"),
  collectionDate: z.string().min(1, "Collection date is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  driver: z.string().optional(),
});

type CreateBookingValues = z.infer<typeof createBookingSchema>;

export default function BookingDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNew = !params.id || params.id === "new";
  const bookingId = isNew ? null : Number(params.id);

  const { data: booking, isLoading: isLoadingBooking } = useGetBooking(bookingId!, {
    query: {
      enabled: !isNew && bookingId !== null,
      queryKey: getGetBookingQueryKey(bookingId!)
    }
  });

  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const form = useForm<CreateBookingValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customer: "",
      vehicle: "",
      registration: "",
      pickup: "",
      destination: "",
      collectionDate: new Date().toISOString().split('T')[0],
      amount: 0,
      driver: "",
    }
  });

  // For updates that don't need full form validation (status/driver)
  const [quickStatus, setQuickStatus] = useState<string>("");
  const [quickDriver, setQuickDriver] = useState<string>("");

  useEffect(() => {
    if (booking && !isNew) {
      form.reset({
        customer: booking.customer,
        vehicle: booking.vehicle,
        registration: booking.registration || "",
        pickup: booking.pickup,
        destination: booking.destination,
        collectionDate: new Date(booking.collectionDate).toISOString().split('T')[0],
        amount: booking.amount,
        driver: booking.driver || "",
      });
      setQuickStatus(booking.status);
      setQuickDriver(booking.driver || "");
    }
  }, [booking, isNew, form]);

  const onSubmit = (values: CreateBookingValues) => {
    if (isNew) {
      createBooking.mutate({ data: values }, {
        onSuccess: (data) => {
          toast({ title: "Booking created successfully", description: `Reference: ${data.reference}` });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setLocation(`/bookings/${data.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create booking", variant: "destructive" });
        }
      });
    } else {
      updateBooking.mutate({ id: bookingId!, data: values }, {
        onSuccess: (data) => {
          toast({ title: "Booking updated successfully" });
          queryClient.setQueryData(getGetBookingQueryKey(bookingId!), data);
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update booking", variant: "destructive" });
        }
      });
    }
  };

  const handleQuickUpdate = () => {
    if (!bookingId) return;
    
    // Type casting to handle the specific status enum
    const updateData: any = {};
    if (quickStatus && quickStatus !== booking?.status) updateData.status = quickStatus;
    if (quickDriver !== booking?.driver) updateData.driver = quickDriver;

    if (Object.keys(updateData).length === 0) return;

    updateBooking.mutate({ id: bookingId, data: updateData }, {
      onSuccess: (data) => {
        toast({ title: "Status updated successfully" });
        queryClient.setQueryData(getGetBookingQueryKey(bookingId), data);
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    });
  };

  if (!isNew && isLoadingBooking) {
    return <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading booking details...</div>;
  }

  const isSaving = createBooking.isPending || updateBooking.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setLocation("/bookings")}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-muted-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isNew ? "Create New Booking" : `Booking ${booking?.reference}`}
          </h1>
          {!isNew && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {new Date(booking!.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form id="booking-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-lg font-semibold border-b border-border pb-3">Booking Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input 
                    {...form.register("customer")} 
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                {form.formState.errors.customer && <p className="text-xs text-destructive">{form.formState.errors.customer.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Collection Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="date"
                    {...form.register("collectionDate")} 
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring"
                  />
                </div>
                {form.formState.errors.collectionDate && <p className="text-xs text-destructive">{form.formState.errors.collectionDate.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Make/Model</label>
                <div className="relative">
                  <CarFront className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input 
                    {...form.register("vehicle")} 
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring"
                    placeholder="e.g. Ford Transit Custom"
                  />
                </div>
                {form.formState.errors.vehicle && <p className="text-xs text-destructive">{form.formState.errors.vehicle.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Registration <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <input 
                  {...form.register("registration")} 
                  className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono uppercase focus:ring-2 focus:ring-ring/20 focus:border-ring"
                  placeholder="AB12 CDE"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Route</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pickup Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      {...form.register("pickup")} 
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring"
                      placeholder="Full pickup address"
                    />
                  </div>
                  {form.formState.errors.pickup && <p className="text-xs text-destructive">{form.formState.errors.pickup.message}</p>}
                </div>
                
                <div className="pl-5 py-1 flex">
                  <div className="w-px h-6 bg-slate-300 border-l border-dashed border-slate-300"></div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-primary" />
                    <input 
                      {...form.register("destination")} 
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring"
                      placeholder="Full delivery address"
                    />
                  </div>
                  {form.formState.errors.destination && <p className="text-xs text-destructive">{form.formState.errors.destination.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Financials</h3>
              
              <div className="space-y-2 max-w-xs">
                <label className="text-sm font-medium">Agreed Amount (£)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">£</span>
                  <input 
                    type="number"
                    step="0.01"
                    {...form.register("amount")} 
                    className="w-full pl-8 pr-3 py-2 border border-border rounded-md text-sm font-medium focus:ring-2 focus:ring-ring/20 focus:border-ring"
                  />
                </div>
                {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isNew ? "Create Booking" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {!isNew && booking && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-5">
              <h2 className="text-base font-semibold border-b border-border pb-2">Status & Assignment</h2>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Status</label>
                  <select 
                    value={quickStatus}
                    onChange={(e) => setQuickStatus(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 border border-border rounded-md text-sm font-semibold focus:ring-2 focus:ring-ring/20 focus:border-ring",
                      quickStatus === "Delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      quickStatus === "In Transit" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      quickStatus === "Collected" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                      quickStatus === "Assigned" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      quickStatus === "Cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-slate-50 text-slate-700"
                    )}
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
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Driver</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input 
                      value={quickDriver}
                      onChange={(e) => setQuickDriver(e.target.value)}
                      placeholder="Unassigned"
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring"
                    />
                  </div>
                </div>

                <button
                  onClick={handleQuickUpdate}
                  disabled={updateBooking.isPending || (quickStatus === booking.status && quickDriver === (booking.driver || ""))}
                  className="w-full mt-2 bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Status
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-border space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
                  Generate Invoice
                </button>
                <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
                  Send Driver Instructions
                </button>
                <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
                  View Route Map
                </button>
                <div className="h-px bg-slate-200 my-2"></div>
                <button className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-red-50 hover:text-red-700 transition-colors">
                  Cancel Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
