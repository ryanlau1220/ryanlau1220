import { HeadContent, Outlet, Scripts, createRootRoute, useLocation } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ryan Lau Jun Hong | Portfolio" },
      {
        name: "description",
        content:
          "Ryan Lau Jun Hong is a Software Engineering student at Asia Pacific University (APU) building AI systems, middleware, and full-stack solutions.",
      },
      // Open Graph (Social Previews)
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Ryan Lau Jun Hong | Portfolio" },
      {
        property: "og:description",
        content:
          "Software Engineering student specializing in DevOps, AI automation, and secure Backend architectures.",
      },
      { property: "og:url", content: "https://portfolio.ryanlau1220.workers.dev" },
      // Twitter Card
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Ryan Lau Jun Hong | Portfolio" },
      {
        name: "twitter:description",
        content:
          "Software Engineering student specializing in DevOps, AI automation, and secure Backend architectures.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
    scripts: [
      {
        children: `
          (function() {
            const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', savedTheme);
          })();
        `,
      },
      {
        src: "https://static.cloudflareinsights.com/beacon.min.js",
        defer: true,
        "data-cf-beacon": '{"token": "2694e0f121d542d9baa344c450858c6f"}',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Page Not Found</h2>
        <p className="text-sm text-neutral-500 mt-2 max-w-sm">
          The page or resource you are looking for does not exist, or the screenshot file has not
          been uploaded yet.
        </p>
        <a
          href="/"
          className="mt-6 text-xs font-mono px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
        >
          Return Home
        </a>
      </div>
    );
  },
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <RootLayout />
        {/* {process.env.NODE_ENV === 'development' && (
          <TanStackRouterDevtools position="bottom-right" />
        )} */}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeHash, setActiveHash] = useState("#home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Initialize theme state on client
  useEffect(() => {
    const savedTheme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(savedTheme as "light" | "dark");
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // Listen to scroll progress
  useEffect(() => {
    const handleScrollProgress = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (progressBarRef.current) {
        if (totalScroll > 0) {
          const progress = (window.scrollY / totalScroll) * 100;
          progressBarRef.current.style.width = `${progress}%`;
        } else {
          progressBarRef.current.style.width = "0%";
        }
      }
    };

    window.addEventListener("scroll", handleScrollProgress, { passive: true });
    handleScrollProgress();

    return () => {
      window.removeEventListener("scroll", handleScrollProgress);
    };
  }, []);

  // Listen to scroll events to update active section in header
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveHash("");
      return;
    }

    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let currentSectionId = "#home";
      const scrollPos = window.scrollY + 120; // offset for header

      sections.forEach((section) => {
        const top = (section as HTMLElement).offsetTop;
        const height = (section as HTMLElement).offsetHeight;
        const id = section.getAttribute("id");
        if (id && scrollPos >= top && scrollPos < top + height) {
          currentSectionId = `#${id}`;
        }
      });

      // Check if user has scrolled to the absolute bottom of the page
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;
      if (isAtBottom) {
        currentSectionId = "#contact";
      }

      setActiveHash((prev) => (prev !== currentSectionId ? currentSectionId : prev));
    };

    window.addEventListener("scroll", handleScroll);
    // Small delay to let child page mount and calculate coordinates correctly
    const timer = setTimeout(handleScroll, 150);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const isHashLink = href.includes("#");
    if (isHashLink && location.pathname === "/") {
      e.preventDefault();
      const id = href.split("#")[1];
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setActiveHash(`#${id}`);
      }
    }
  };

  const navLinks = [
    { href: "/#home", label: "Home" },
    { href: "/#about", label: "About" },
    { href: "/#skills", label: "Skills" },
    { href: "/#projects", label: "Projects" },
    { href: "/#timeline", label: "Timeline" },
    { href: "/#certifications", label: "Certifications" },
    { href: "/#contact", label: "Contact" },
  ];

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      const targetHash = `#${href.split("#")[1]}`;
      return activeHash === targetHash && location.pathname === "/";
    }
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-blue-500/10 selection:text-blue-500">
      <HeadContent />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200/85 dark:border-neutral-900/80 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md transition-all duration-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a
            href="/#home"
            onClick={(e) => handleNavClick(e, "/#home")}
            className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight hover:opacity-85"
          >
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
            <span>Ryan Lau.</span>
          </a>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-xs font-mono transition-colors hover:text-neutral-900 dark:hover:text-white ${
                  isActive(link.href)
                    ? "text-neutral-900 dark:text-white font-bold"
                    : "text-neutral-500 dark:text-neutral-500"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Controls (Theme Toggle) */}
          <div className="hidden md:flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors"
              title="Toggle theme"
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 cursor-pointer"
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-900 bg-white dark:bg-neutral-950 p-6 space-y-4 animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    handleNavClick(e, link.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-sm font-mono transition-colors ${
                    isActive(link.href)
                      ? "text-neutral-900 dark:text-white font-bold"
                      : "text-neutral-500"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        )}
        {/* Scroll Progress Bar (Racing Line) */}
        <div ref={progressBarRef} className="scroll-progress-bar" />
      </header>

      {/* Main Outlet */}
      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <Scripts />
    </div>
  );
}
