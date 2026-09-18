export default function App() {
  return (
    <main className="app-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">A calm logic puzzle</p>
        <h1 id="welcome-title">Loops</h1>
        <p className="welcome-copy">
          Connect the clues into one continuous loop. Your first puzzle is on
          its way.
        </p>
        <button className="primary-action" type="button">
          Start a puzzle
        </button>
      </section>
    </main>
  );
}
