import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import Users from "@/pages/users";
import Profile from "@/pages/profile";
import Groups from "@/pages/groups";
import GroupChat from "@/pages/group-chat";
import CallScreen from "@/pages/call";
import IncomingCallOverlay from "@/components/incoming-call-overlay";
import { CallProvider } from "@/contexts/call-context";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/users" component={Users} />
      <Route path="/profile" component={Profile} />
      <Route path="/groups" component={Groups} />
      <Route path="/group/:id" component={GroupChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CallProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <div className="mx-auto max-w-md bg-background min-h-[100dvh] shadow-2xl relative overflow-hidden flex flex-col border-x border-border">
              <Router />
              <CallScreen />
            </div>
            <IncomingCallOverlay />
          </WouterRouter>
          <Toaster />
        </CallProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
