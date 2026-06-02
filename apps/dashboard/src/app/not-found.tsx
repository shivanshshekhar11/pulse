import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="size-full flex bg-background text-foreground bg-grid scanlines min-h-screen items-center justify-center">
      <div className="flex flex-col items-center text-center p-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-4">// error 404</div>
        <h1 className="text-[32px] md:text-[40px] leading-tight mb-4 max-w-[500px]">
          <span className="gradient-text">Page not found</span>
        </h1>
        <p className="font-mono text-[13px] text-muted-foreground mb-8 max-w-[400px]">
          The page you are looking for does not exist, has been moved, or is currently unavailable.
        </p>
        
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            return home
          </Link>
          <Link 
            href="javascript:history.back()"
            className="flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-[13px] bg-surface-2 text-foreground border border-border hover:bg-surface-3 transition-colors"
          >
            go back
          </Link>
        </div>
      </div>
    </div>
  );
}
