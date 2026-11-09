import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Explore } from "./Explore";
import { Details } from "./Details";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function App() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    document.title =
      location.pathname === "/"
        ? "Registry — Docker image explorer"
        : "Repository details — Registry";
    window.scrollTo(0, 0);
    if (previousPath.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Registry home">
          <span className="brand-mark" aria-hidden="true">
            ▦
          </span>
          registry<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link
            to="/"
            aria-current={location.pathname === "/" ? "page" : undefined}
          >
            Explore
          </Link>
          <a
            href="https://hub.docker.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Docker Hub (opens in a new tab)"
          >
            Docker Hub ↗
          </a>
        </nav>
      </header>
      <main id="main" ref={mainRef} tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/repositories/:namespace/:name" element={<Details />} />
          <Route
            path="*"
            element={
              <div className="state">
                <h1>Page not found</h1>
                <Link to="/">Explore repositories</Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <span>
          <strong>registry.</strong> A small window into Docker Hub.
        </span>
        <span>Public images. Real metadata.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
