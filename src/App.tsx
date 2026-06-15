import { useCallback, useState } from "react";
import { AppShell } from "./components/AppShell";
import { SplashScreen } from "./components/SplashScreen";

function App(): JSX.Element {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  if (!ready) {
    return <SplashScreen onReady={handleReady} />;
  }

  return <AppShell />;
}

export default App;
