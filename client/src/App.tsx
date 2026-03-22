import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Personas from "./pages/Personas";
import PersonaDetail from "./pages/PersonaDetail";
import Campaigns from "./pages/Campaigns";
import CampaignCreate from "./pages/CampaignCreate";
import Simulation from "./pages/Simulation";
import Results from "./pages/Results";
import SimulationDetail from "./pages/SimulationDetail";
import GroundTruth from "./pages/GroundTruth";
import Calibration from "./pages/Calibration";
import Agents from "./pages/Agents";
import WorldEvents from "./pages/WorldEvents";
import CampaignTesting from "./pages/CampaignTesting";
import LifeHistory from "./pages/LifeHistory";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/personas" component={Personas} />
        <Route path="/personas/:id" component={PersonaDetail} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/new" component={CampaignCreate} />
        <Route path="/simulation" component={Simulation} />
        <Route path="/results" component={Results} />
        <Route path="/results/:id" component={SimulationDetail} />
        <Route path="/ground-truth" component={GroundTruth} />
        <Route path="/calibration" component={Calibration} />
        <Route path="/agents" component={Agents} />
        <Route path="/world" component={WorldEvents} />
        <Route path="/campaign-testing" component={CampaignTesting} />
        <Route path="/life-history" component={LifeHistory} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
