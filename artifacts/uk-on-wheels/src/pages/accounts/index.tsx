import { FileText, Download, DollarSign } from "lucide-react";

export default function AccountsPage() {
  const dummyInvoices = [
    { id: "INV-2024-001", client: "Acme Fleet Services", date: "2024-10-25", amount: 1450.00, status: "Paid" },
    { id: "INV-2024-002", client: "Global Rentals UK", date: "2024-10-26", amount: 820.50, status: "Pending" },
    { id: "INV-2024-003", client: "Northern Auto Traders", date: "2024-10-27", amount: 410.00, status: "Overdue" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Accounts & Finance</h1>
        <p className="text-muted-foreground mt-1">Manage invoices, payments, and financial summaries.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
          <p className="text-2xl font-bold text-foreground mt-1">£42,500</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Outstanding Invoices</h3>
          <p className="text-2xl font-bold text-foreground mt-1">£8,240</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Overdue Amount</h3>
          <p className="text-2xl font-bold text-destructive mt-1">£1,450</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Invoices</h2>
          <button className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-muted-foreground text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date Issued</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dummyInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-foreground">{inv.id}</td>
                  <td className="px-6 py-4 font-medium">{inv.client}</td>
                  <td className="px-6 py-4 text-muted-foreground">{inv.date}</td>
                  <td className="px-6 py-4 font-bold">£{inv.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary font-medium hover:underline text-sm">View</button>
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
