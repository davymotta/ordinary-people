import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// ── Client Portal (/app) ──────────────────────────────────────────────────────
import ClientDashboard from "./pages/client/ClientDashboard";
import TargetingPanel from "./pages/client/TargetingPanel";

// ── Admin Console (/admin) ────────────────────────────────────────────────────
import AdminDashboard from "./pages/admin/AdminDashboard";
// Re-use existing pages inside AdminLayout
import Agents from "./pages/Agents";
import WorldEvents from "./pages/WorldEvents";
import LifeHistory from "./pages/LifeHistory";
import Simulation from "./pages/Simulation";
import SimulationDetail from "./pages/SimulationDetail";
import Results from "./pages/Results";

// ── Lab (/lab) ────────────────────────────────────────────────────────────────
import LabDashboard from "./pages/lab/LabDashboard";
import ArchetypeMatrix from "./pages/ArchetypeMatrix";
import CalibratedSampler from "./pages/CalibratedSampler";
import CampaignTesting from "./pages/CampaignTesting";

// ── Legacy (keep working during transition) ───────────────────────────────────
import Home from "./pages/Home";
import Personas from "./pages/Personas";
import PersonaDetail from "./pages/PersonaDetail";
import Campaigns from "./pages/Campaigns";
import CampaignCreate from "./pages/CampaignCreate";
import GroundTruth from "./pages/GroundTruth";
import Calibration from "./pages/Calibration";
import DashboardLayout from "./components/DashboardLayout";
import { AdminLayout } from "./components/AdminLayout";
import { LabLayout } from "./components/LabLayout";

function Router() {
  return (
    <Switch>
      {/* Root → redirect to Client Portal */}
      <Route path="/">
        <Redirect to="/app" />
      </Route>

      {/* ── Client Portal ── */}
      <Route path="/app">
        <ClientDashboard />
      </Route>
      <Route path="/app/simulate/new">
        <TargetingPanel />
      </Route>
      <Route path="/app/simulations">
        <ClientDashboard />
      </Route>

      {/* ── Admin Console ── */}
      <Route path="/admin">
        <AdminDashboard />
      </Route>
      <Route path="/admin/agents">
        <AdminLayout>
          <Agents />
        </AdminLayout>
      </Route>
      <Route path="/admin/world">
        <AdminLayout>
          <WorldEvents />
        </AdminLayout>
      </Route>
      <Route path="/admin/life-history">
        <AdminLayout>
          <LifeHistory />
        </AdminLayout>
      </Route>
      <Route path="/admin/simulations">
        <AdminLayout>
          <Results />
        </AdminLayout>
      </Route>
      <Route path="/admin/simulations/:id">
        {(params) => (
          <AdminLayout>
            <SimulationDetail />
          </AdminLayout>
        )}
      </Route>

      {/* ── Lab ── */}
      <Route path="/lab">
        <LabDashboard />
      </Route>
      <Route path="/lab/archetypes">
        <LabLayout>
          <ArchetypeMatrix />
        </LabLayout>
      </Route>
      <Route path="/lab/sampler">
        <LabLayout>
          <CalibratedSampler />
        </LabLayout>
      </Route>
      <Route path="/lab/life-history">
        <LabLayout>
          <LifeHistory />
        </LabLayout>
      </Route>
      <Route path="/lab/campaign-testing">
        <LabLayout>
          <CampaignTesting />
        </LabLayout>
      </Route>

      {/* ── Legacy routes (keep working) ── */}
      <Route path="/legacy">
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      <Route path="/legacy/personas">
        <DashboardLayout>
          <Personas />
        </DashboardLayout>
      </Route>
      <Route path="/legacy/personas/:id">
        <DashboardLayout>
          <PersonaDetail />
        </DashboardLayout>
      </Route>
      <Route path="/legacy/campaigns">
        <DashboardLayout>
          <Campaigns />
        </DashboardLayout>
      </Route>
      <Route path="/legacy/campaigns/new">
        <DashboardLayout>
          <CampaignCreate />
        </DashboardLayout>
      </Route>
      <Route path="/legacy/ground-truth">
        <DashboardLayout>
          <GroundTruth />
        </DashboardLayout>
      </Route>
      <Route path="/legacy/calibration">
        <DashboardLayout>
          <Calibration />
        </DashboardLayout>
      </Route>

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
