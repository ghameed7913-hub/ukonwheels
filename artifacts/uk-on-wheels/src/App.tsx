import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

import { Layout } from './components/layout';
import DashboardPage from './pages/dashboard';
import BookingsPage from './pages/bookings';
import BookingDetailPage from './pages/bookings/detail';
import BusinessesPage from './pages/businesses';
import DriversPage from './pages/drivers';
import AccountsPage from './pages/accounts';
import ReportsPage from './pages/reports';
import HRPage from './pages/hr';
import MessagesPage from './pages/messages';
import SettingsPage from './pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/bookings" component={BookingsPage} />
          <Route path="/bookings/new" component={BookingDetailPage} />
          <Route path="/bookings/:id" component={BookingDetailPage} />
          <Route path="/businesses" component={BusinessesPage} />
          <Route path="/drivers" component={DriversPage} />
          <Route path="/accounts" component={AccountsPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/hr" component={HRPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
