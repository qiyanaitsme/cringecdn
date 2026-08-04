interface DashboardHeaderProps {
  user: {
    username: string;
    role: string;
  } | null;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-background border-b">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <h1 className="text-xl font-semibold">ImageHost</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.username || ''}</span>
          <a href="/gallery" className="text-sm hover:text-primary">Галерея</a>
          {user?.role === 'ADMIN' && (
            <a href="/admin" className="text-sm text-primary hover:text-primary/80">Администрирование</a>
          )}
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }} 
            className="text-sm text-destructive"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}