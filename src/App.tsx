import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NewJob from "./pages/NewJob";
import JobDetails from "./pages/JobDetails";
import NewCandidate from "./pages/NewCandidate";
import EvaluatePage from "./pages/EvaluatePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/evaluate/:token" element={<EvaluatePage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/jobs/new"
            element={
              <AuthGuard>
                <NewJob />
              </AuthGuard>
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <AuthGuard>
                <JobDetails />
              </AuthGuard>
            }
          />
          <Route
            path="/jobs/:jobId/candidates/new"
            element={
              <AuthGuard>
                <NewCandidate />
              </AuthGuard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
