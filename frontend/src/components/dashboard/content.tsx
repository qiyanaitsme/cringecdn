import { api } from '@/lib/api';

export function DashboardContent() {
  return (
    <div className="container mx-auto px-6 py-8 mt-16">
      <h2 className="text-2xl font-semibold mb-4">Дашборд</h2>
      <p className="text-muted-foreground">Загрузка контента...</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <a href="/gallery" className="p-6 rounded-lg border bg-card hover:bg-accent/10 transition">
          <h3 className="text-lg font-semibold">Загрузить изображение</h3>
          <p className="text-sm text-muted-foreground">Загрузка изображений в систему</p>
        </a>
        <a href="/gallery" className="p-6 rounded-lg border bg-card hover:bg-accent/10 transition">
          <h3 className="text-lg font-semibold">Галерея</h3>
          <p className="text-sm text-muted-foreground">Просмотр и управление загруженными изображениями</p>
        </a>
      </div>
    </div>
  );
}