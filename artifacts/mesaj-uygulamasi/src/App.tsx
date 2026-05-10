import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CallScreen from "@/pages/call";
import IncomingCallOverlay from "@/components/incoming-call-overlay";
import { CallProvider } from "@/contexts/call-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

const queryClient = new QueryClient();

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-background">
        <img src="/logo.png" alt="Braw" className="w-14 h-14 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/users" component={Users} />
      <Route path="/profile" component={Profile} />
      <Route path="/groups" component={Groups} />
      <Route path="/group/:id" component={GroupChat} />
      <Route path="/admin" component={Admin} />
      <Route path="/login">
        <Redirect to="/" />
      </Route>
      <Route path="/register">
        <Redirect to="/" />
      </Route>
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
        <AuthProvider>
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
