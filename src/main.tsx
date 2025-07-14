import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SettingsPage from "./SettingsPage";
import PromptEditor from "./PromptEditor";

const params = new URLSearchParams(window.location.search);
let Component: React.ComponentType = App;
if (params.has("settings")) {
  Component = SettingsPage;
} else if (params.has("edit") || params.has("add")) {
  Component = PromptEditor;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>,
);
