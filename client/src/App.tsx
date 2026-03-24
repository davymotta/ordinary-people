import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// ── Client Portal (/app) ──────────────────────────────────────────────────────
import ClientDashboard from "./pages/client/ClientDashboard";
import TargetingPanel from "./pages/client/TargetingPanel";
import CampaignIngestion from "./pages/client/CampaignIngestion";
import SimulateLive from "./pages/client/SimulateLive";
import SimulateReport from "./pages/client/SimulateReport";
import BrandOnboarding from "./pages/client/BrandOnboarding";
import JourneySimulationPanel from "./pages/client/JourneySimulationPanel";
import JourneyResults from "./pages/client/JourneyResults";
import AgentPsycheState from "./pages/client/AgentPsycheState";

// ── Admin Console (/admin) ────────────────────────────────────────────────────
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminBrandAgents from "./pages/admin/AdminBrandAgents";
import AdminAccuracy from "./pages/admin/AdminAccuracy";
import AdminSocialAuth from "./pages/admin/AdminSocialAuth";
import AdminDataset from "./pages/admin/AdminDataset";
import AdminRetraining from "./pages/admin/AdminRetraining";
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
import GteDashboard from "./pages/lab/GteDashboard";
import StrategicSimulations from "./pages/lab/StrategicSimulations";
import PsycheCalibration from "./pages/lab/PsycheCalibration";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Pricing from "./pages/Pricing";
import Calibration from "./pages/Calibration";
import DashboardLayout from "./components/DashboardLayout";
import { AdminLayout } from "./components/AdminLayout";
import { LabLayout } from "./components/LabLayout";

function Router() {
  return (
    <Switch>
      {/* Root → Landing Page pubblica */}
      <Route path="/">
        <Landing />
      </Route>

      {/* Auth → Login / Register */}
      <Route path="/auth">
        <AuthPage />
      </Route>

      {/* Pricing */}
      <Route path="/pricing">
        <Pricing />
      </Route>

      {/* ── Client Portal ── */}
      <Route path="/app">
        <ClientDashboard />
      </Route>
      <Route path="/app/simulate/new">
        <TargetingPanel />
      </Route>
      <Route path="/app/simulate/journey">
        <JourneySimulationPanel />
      </Route>
      <Route path="/app/journey/:id">
        <JourneyResults />
      </Route>
      <Route path="/app/psyche">
        <AgentPsycheState />
      </Route>
      <Route path="/app/simulations">
        <ClientDashboard />
      </Route>
      <Route path="/app/ingest">
        <CampaignIngestion />
      </Route>
      <Route path="/app/onboarding">
        <BrandOnboarding />
      </Route>
      <Route path="/app/simulate/:id/report">
        <SimulateReport />
      </Route>
      <Route path="/app/simulate/:id">
        <SimulateLive />
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

      {/* ── Admin: nuove sezioni ── */}
      <Route path="/admin/clients">
        <AdminClients />
      </Route>
      <Route path="/admin/brand-agents">
        <AdminBrandAgents />
      </Route>
      <Route path="/admin/accuracy">
        <AdminAccuracy />
      </Route>
      <Route path="/admin/social-auth">
        <AdminSocialAuth />
      </Route>
      <Route path="/admin/dataset">
        <AdminDataset />
      </Route>
      <Route path="/admin/retraining">
        <AdminRetraining />
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
      <Route path="/lab/gte">
        <LabLayout>
          <GteDashboard />
        </LabLayout>
      </Route>
      <Route path="/lab/strategic">
        <StrategicSimulations />
      </Route>
      <Route path="/lab/psyche-calibration">
        <LabLayout>
          <PsycheCalibration />
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
