import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center flex-1 min-h-[calc(100vh-4rem)] p-8">
      <div className="max-w-[600px] space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Pulse <span className="text-muted-foreground font-light">Docs</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          Self-hostable, enterprise-grade feature flag service with real-time propagation.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link 
            href="/docs" 
            className="px-6 py-3 rounded-md font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            Get Started
          </Link>
          <Link 
            href="/docs/api-reference" 
            className="px-6 py-3 rounded-md font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            API Reference
          </Link>
          <Link 
            href="/docs/self-hosting" 
            className="px-6 py-3 rounded-md font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Self Hosting
          </Link>
        </div>
      </div>
    </div>
  );
}
