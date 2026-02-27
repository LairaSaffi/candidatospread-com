import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Bootstrap from "./pages/Bootstrap";
import NewJob from "./pages/NewJob";
import EditJob from "./pages/EditJob";
import JobDetails from "./pages/JobDetails";
import NewCandidate from "./pages/NewCandidate";
import CandidateDetails from "./pages/CandidateDetails";
import EditCandidate from "./pages/EditCandidate";
import EvaluateJob from "./pages/EvaluateJob";
import AdminUsers from "./pages/AdminUsers";
import AdminCandidates from "./pages/AdminCandidates";
import AdminTags from "./pages/AdminTags";
import AvailableTalents from "./pages/AvailableTalents";
import ViewCandidate from "./pages/ViewCandidate";
import ViewTalents from "./pages/ViewTalents";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/bootstrap" element={<Bootstrap />} />
            <Route path="/evaluate/:token" element={<EvaluateJob />} />
            <Route path="/candidate/:token" element={<ViewCandidate />} />
            <Route path="/talents/:token" element={<ViewTalents />} />
            <Route path="/change-password" element={<ChangePassword />} />
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
              path="/jobs/:id/edit"
              element={
                <AuthGuard>
                  <EditJob />
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
            <Route
              path="/jobs/:jobId/candidates/:candidateId"
              element={
                <AuthGuard>
                  <CandidateDetails />
                </AuthGuard>
              }
            />
            <Route
              path="/jobs/:jobId/candidates/:candidateId/edit"
              element={
                <AuthGuard>
                  <EditCandidate />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AuthGuard>
                  <AdminUsers />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/candidates"
              element={
                <AuthGuard>
                  <AdminCandidates />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/tags"
              element={
                <AuthGuard>
                  <AdminTags />
                </AuthGuard>
              }
            />
            <Route
              path="/talents"
              element={
                <AuthGuard>
                  <AvailableTalents />
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
