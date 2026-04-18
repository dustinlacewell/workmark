import { ViteReactSSG } from "vite-react-ssg";
import { Home } from "./pages/Home";
import { Docs } from "./pages/Docs";
import "./index.css";

export const createRoot = ViteReactSSG({
  routes: [
    { path: "/", element: <Home /> },
    { path: "/docs", element: <Docs /> },
  ],
});
