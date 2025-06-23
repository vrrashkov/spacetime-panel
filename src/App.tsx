import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/ui/use-toast";
import SpacetimeUI from "./components/spacetime";

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-screen">
            <SpacetimeUI onLogout={() => {}} />
          </div>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
