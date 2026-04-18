import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Pain } from "./components/Pain";
import { Pitch } from "./components/Pitch";
import { Why } from "./components/Why";
import { Scaling } from "./components/Scaling";
import { Install } from "./components/Install";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Pain />
        <Pitch />
        <Why />
        <Scaling />
        <Install />
      </main>
      <footer className="border-t border-paper-line dark:border-ink-line py-8 px-6 text-sm opacity-60 text-center space-y-1">
        <div>
          MIT · by{" "}
          <a
            href="https://ldlework.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:opacity-100"
          >
            ldlework
          </a>
        </div>
        <div className="text-xs opacity-70">
          <a href="https://github.com/dustinlacewell/workmark" target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
          {" · "}
          <a href="https://www.npmjs.com/package/@ldlework/workmark" target="_blank" rel="noreferrer" className="hover:underline">npm</a>
          {" · "}
          <a href="https://marketplace.visualstudio.com/items?itemName=ldlework.workmark-vsc" target="_blank" rel="noreferrer" className="hover:underline">VS Code Marketplace</a>
        </div>
      </footer>
    </div>
  );
}
