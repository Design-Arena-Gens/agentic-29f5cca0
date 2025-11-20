import "./globals.css";
import dynamic from "next/dynamic";

const CartoonSinger = dynamic(() => import("../components/CartoonSinger"), { ssr: false });

export default function Page() {
  return (
    <main>
      <div className="card">
        <div className="header">
          <div className="title">Peekaboo Cartoon ? ?Johny Johny Yes Papa?</div>
          <div className="actions">
            <a className="btn secondary" href="https://agentic-29f5cca0.vercel.app" target="_blank" rel="noreferrer">
              Open on Production
            </a>
          </div>
        </div>
        <CartoonSinger />
      </div>
    </main>
  );
}

