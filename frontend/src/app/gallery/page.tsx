'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/api';
import type { Image } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatBytes, formatDate, copyToClipboard, getImageUrl } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Copy, X, QRCode } from 'lucide-react';

export default function GalleryPage() {
  const { user, isAuthenticated } = useAuth();
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listImages({ page, limit: 20 });
      setImages(data.images);
      setTotal(data.total);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить изображения', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        const newImage = await api.uploadImage(file);
        setImages(prev => [newImage, ...prev]);
        toast({ title: 'Успешно', description: `${file.name} загружен` });
      } catch (error) {
        toast({ title: 'Ошибка', description: `Ошибка загрузки ${file.name}`, variant: 'destructive' });
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }, maxFiles: 10, maxSize: 20 * 1024 * 1024 });

  const handleDelete = async (id: string) => {
    try {
      await api.deleteImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      toast({ title: 'Успешно', description: 'Изображение удалено' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить изображение', variant: 'destructive' });
    }
  };

  const copyFormat = async (format: string, image: Image) => {
    const formats: Record<string, string> = {
      url: image.directUrl || getImageUrl(image.fileName),
      html: image.html || `<img src="${getImageUrl(image.fileName)}" alt="${image.originalName}" />`,
      bbcode: image.bbcode || `[img]${getImageUrl(image.fileName)}[/img]`,
      markdown: image.markdown || `![${image.originalName}](${getImageUrl(image.fileName)})`,
    };
    await copyToClipboard(formats[format]);
    toast({ title: 'Скопировано', description: `${format.toUpperCase()} ссылка скопирована` });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <h1 className="text-xl font-semibold">ImageHost — Галерея</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.username}</span>
            {user?.role === 'ADMIN' && <a href="/admin" className="text-sm text-primary hover:text-primary/80">Админка</a>}
            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="text-sm text-destructive">Выйти</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted'}`}>
          <input {...getInputProps()} ref={fileInputRef} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg">
            {isDragActive ? 'Отпустите файлы сюда...' : 'Перетащите изображения сюда или нажмите для выбора'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">JPG, PNG, GIF, WebP — до 20 МБ</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Изображений нет. Загрузите первое!</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
              {images.map(image => (
                <Card key={image.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-square">
                      <img
                        src={getImageUrl(image.thumbnailUrl || image.fileName)}
                        alt={image.originalName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedImage(image)}>
                          <ImageIcon className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setToDeleteId(image.id); setShowDeleteConfirm(true); }} className="text-destructive">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {total > 20 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Назад
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">Страница {page} из {Math.ceil(total / 20)}</span>
                <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>
                  Вперёд
                </Button>
              </div>
            )}
          </>
        )}

        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={open => !open && setSelectedImage(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>{selectedImage.originalName}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <img src={getImageUrl(selectedImage.fileName)} alt={selectedImage.originalName} className="w-full rounded-lg" />
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Размер:</span> {formatBytes(selectedImage.fileSize)}</div>
                    <div><span className="text-muted-foreground">Формат:</span> {selectedImage.mimeType}</div>
                    <div><span className="text-muted-foreground">Разрешение:</span> {selectedImage.width}x{selectedImage.height}</div>
                    <div><span className="text-muted-foreground">Дата:</span> {formatDate(selectedImage.createdAt)}</div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Ссылки для вставки:</h4>
                    <Tabs defaultValue="url">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="url">URL</TabsTrigger>
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="bbcode">BBCode</TabsTrigger>
                        <TabsTrigger value="markdown">Markdown</TabsTrigger>
                      </TabsList>
                      <TabsContent value="url" className="mt-2 p-2 bg-muted rounded text-sm break-all">{selectedImage.directUrl || getImageUrl(selectedImage.fileName)}</TabsContent>
                      <TabsContent value="html" className="mt-2 p-2 bg-muted rounded text-sm break-all">{selectedImage.html || `<img src="${getImageUrl(selectedImage.fileName)}" alt="${selectedImage.originalName}" />`}</TabsContent>
                      <TabsContent value="bbcode" className="mt-2 p-2 bg-muted rounded text-sm break-all">{selectedImage.bbcode || `[img]${getImageUrl(selectedImage.fileName)}[/img]`}</TabsContent>
                      <TabsContent value="markdown" className="mt-2 p-2 bg-muted rounded text-sm break-all">{selectedImage.markdown || `![${selectedImage.originalName}](${getImageUrl(selectedImage.fileName)})`}</TabsContent>
                    </Tabs>
                    <div className="flex gap-2">
                      {(['url', 'html', 'bbcode', 'markdown'] as const).map(fmt => (
                        <Button key={fmt} variant="outline" size="sm" className="flex-1" onClick={() => copyFormat(fmt, selectedImage)}>
                          <Copy className="mr-2 h-4 w-4" /> {fmt.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить изображение?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">Это действие нельзя отменить.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setToDeleteId(null); }}>Отмена</Button>
              <Button variant="destructive" onClick={() => { if (toDeleteId) handleDelete(toDeleteId); setShowDeleteConfirm(false); setToDeleteId(null); }}>Удалить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}