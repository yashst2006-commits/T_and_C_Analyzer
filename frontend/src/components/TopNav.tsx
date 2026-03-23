import { Link, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";

const navItems = [
  { label: "ANALYZE", path: "/" },
  { label: "DASHBOARD", path: "/dashboard" },
];

export function TopNav() {
  const { pathname } = useLocation();

  return (
    <header className="h-12 border-b flex items-center px-6 bg-background shrink-0">
      <Link to="/" className="flex items-center gap-2 mr-8">
        <Shield className="h-5 w-5" />
        <span className="font-bold text-sm tracking-widest">FAIRTERMS</span>
      </Link>
      <nav className="flex gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 text-xs font-semibold tracking-wider transition-colors ${
              pathname === item.path
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
