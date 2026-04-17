import { Header } from "./components/Header";
import { Hero } from "./components/Hero";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
      </main>
      <footer className="border-t border-paper-line dark:border-ink-line py-8 px-6 text-sm opacity-60 text-center">
        MIT · by{" "}
        <a
          href="https://ldlework.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:opacity-100"
        >
          ldlework
        </a>
      </footer>
    </div>
  );
}
