import React from "react";
import ReactDOM from "react-dom/client";
// S2 base styles + Adobe Clean font + page background. For a full-page app this
// applies the dark color scheme to <html> (with data-color-scheme="dark") before
// the app's JS loads. Must come before global.css so our resets win.
import "@react-spectrum/s2/page.css";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
