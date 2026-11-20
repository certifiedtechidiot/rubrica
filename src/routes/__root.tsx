import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { ThemeProvider } from "../lib/theme";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#E52237" },
      { title: "Rubrica — AI Handwritten Paper Evaluation & Gradebook" },
      {
        name: "description",
        content:
          "Grade handwritten student papers in seconds with Rubrica AI. Vision scoring, custom syllabus rubrics, longitudinal mistake tracking, and auto-generated DPPs for educators.",
      },
      {
        name: "keywords",
        content:
          "Rubrica, Rubrica AI, AI paper evaluation, AI exam grading, automated paper grading, AI gradebook for teachers, student mistake tracking, handwritten test checker, JEE NEET paper checker, edtech AI India",
      },
      { name: "author", content: "Rehan Khan" },
      { name: "creator", content: "Rehan Khan" },
      { name: "publisher", content: "Rehan Khan" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      {
        name: "googlebot",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { property: "og:site_name", content: "Rubrica" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://rubrica.in/" },
      { property: "og:title", content: "Rubrica — AI Handwritten Paper Evaluation & Gradebook" },
      {
        property: "og:description",
        content:
          "Grade handwritten student papers in seconds with Rubrica AI. Vision scoring, custom syllabus rubrics, longitudinal mistake tracking, and auto-generated DPPs for educators.",
      },
      { property: "og:image", content: "https://rubrica.in/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Rubrica — AI Paper Evaluation & Gradebook" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@rubrica_in" },
      { name: "twitter:title", content: "Rubrica — AI Handwritten Paper Evaluation & Gradebook" },
      {
        name: "twitter:description",
        content:
          "Grade handwritten student papers in seconds with Rubrica AI. Vision scoring, custom syllabus rubrics, longitudinal mistake tracking, and auto-generated DPPs for educators.",
      },
      { name: "twitter:image", content: "https://rubrica.in/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://rubrica.in/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": "https://rubrica.in/#founder",
        "name": "Rehan Khan",
        "jobTitle": "Founder & Lead Architect",
        "url": "https://rubrica.in/",
        "sameAs": [
          "https://github.com/certifiedtechidiot"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://rubrica.in/#website",
        "url": "https://rubrica.in/",
        "name": "Rubrica",
        "description": "AI-assisted handwritten paper evaluation and longitudinal gradebook for teachers.",
        "inLanguage": "en-US"
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://rubrica.in/#application",
        "name": "Rubrica",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "All",
        "url": "https://rubrica.in/",
        "author": { "@id": "https://rubrica.in/#founder" },
        "creator": { "@id": "https://rubrica.in/#founder" },
        "description": "Grade handwritten student papers in seconds with AI vision scoring, custom syllabus rubrics, longitudinal mistake tracking, and auto-generated DPPs.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR"
        },
        "featureList": [
          "AI Handwritten Exam Evaluation",
          "Step-by-Step Mathematical & Physics OCR",
          "Custom Syllabus & School Rubrics",
          "Longitudinal Student Mistake Tracking",
          "Automated Daily Practice Problems (DPP) Worksheets"
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://rubrica.in/#organization",
        "name": "Rubrica",
        "url": "https://rubrica.in/",
        "logo": "https://rubrica.in/android-chrome-512x512.png",
        "founder": { "@id": "https://rubrica.in/#founder" },
        "sameAs": [
          "https://github.com/certifiedtechidiot/rubrica_main",
          "https://github.com/certifiedtechidiot"
        ]
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('theme') || 'system';
                  var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
