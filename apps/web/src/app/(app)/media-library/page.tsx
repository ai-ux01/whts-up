'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Image, Video, Music, FolderOpen, Upload, Trash, Search, Folder, MoreVertical, Eye, Download } from 'lucide-react';

interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  folder: string | null;
  createdAt: string;
}

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('All');
  
  // Fetch Media Assets Query
  const { data: assets = [], isLoading } = useQuery<MediaAsset[]>({
    queryKey: ['media-assets', activeFolder],
    queryFn: () => api<MediaAsset[]>(`/content/media?folder=${activeFolder !== 'All' ? activeFolder : ''}`),
  });

  // Mock initial items if database is empty
  const defaultAssets = [
    {
      id: 'm1',
      name: 'Modern Penthouse Exterior.jpg',
      url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop',
      type: 'IMAGE',
      size: 1540200,
      folder: 'Campaigns',
      createdAt: new Date().toISOString()
    },
    {
      id: 'm2',
      name: 'Classroom Smartboard setup.jpg',
      url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&auto=format&fit=crop',
      type: 'IMAGE',
      size: 2100850,
      folder: 'Stock',
      createdAt: new Date().toISOString()
    },
    {
      id: 'm3',
      name: 'Solar Panel installation drone view.mp4',
      url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500&auto=format&fit=crop',
      type: 'VIDEO',
      size: 18450900,
      folder: 'Reels',
      createdAt: new Date().toISOString()
    },
    {
      id: 'm4',
      name: 'Flu Vaccine Drive Banner.png',
      url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop',
      type: 'IMAGE',
      size: 945030,
      folder: 'Campaigns',
      createdAt: new Date().toISOString()
    }
  ];

  // Upload Asset Mutation
  const uploadMutation = useMutation({
    mutationFn: (body: any) =>
      api<MediaAsset>('/content/media', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      toast.success('Media asset successfully stored in Cloud OS Library!');
    },
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
  });

  // Delete Asset Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<any>(`/content/media/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      toast.success('Asset removed successfully.');
    },
    onError: (e: any) => toast.error(e.message || 'Deletion failed'),
  });

  const handleSimulatedUpload = () => {
    // Generate a random mock file upload
    const mockImages = [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&auto=format&fit=crop'
    ];
    const names = ['Luxury-BHK-Layout.jpg', 'JEE-Prep-Desk.jpg', 'Solar-Audit-Diagram.jpg'];
    const rIdx = Math.floor(Math.random() * mockImages.length);

    uploadMutation.mutate({
      name: names[rIdx],
      url: mockImages[rIdx],
      type: 'IMAGE',
      size: Math.floor(800000 + Math.random() * 2000000),
      folder: activeFolder !== 'All' ? activeFolder : 'General',
    });
  };

  const getAssetIcon = (type: string) => {
    if (type === 'VIDEO') return <Video className="h-5 w-5 text-indigo-500" />;
    if (type === 'AUDIO') return <Music className="h-5 w-5 text-amber-500" />;
    return <Image className="h-5 w-5 text-emerald-500" />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const items = assets.length > 0 ? assets : defaultAssets;
  const filteredItems = items.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) &&
      (activeFolder === 'All' || a.folder === activeFolder)
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            Media Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Store and manage stock files, campaign graphics, reels videos, and reusable assets in a single workspace.
          </p>
        </div>
        <Button onClick={handleSimulatedUpload} className="gap-2 self-start md:self-auto">
          <Upload className="h-4 w-4" />
          Upload Assets
        </Button>
      </div>

      {/* Directory Folders Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['All', 'Reels', 'Campaigns', 'Stock', 'General'].map((folder) => (
          <button
            key={folder}
            onClick={() => setActiveFolder(folder)}
            className={`flex items-center gap-3 p-4 rounded-xl border text-xs font-semibold transition-all hover:shadow-sm ${
              activeFolder === folder
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="h-5 w-5 text-primary/80" />
            <div className="text-left truncate">
              <p className="text-foreground leading-none mb-1 font-bold">{folder} folder</p>
              <p className="text-[10px] text-muted-foreground">Asset assets</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search Filter Header */}
      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets by file name..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {filteredItems.map((asset) => (
              <div
                key={asset.id}
                className="group relative border border-border rounded-xl bg-card overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-square w-full bg-muted/30 overflow-hidden border-b flex items-center justify-center">
                  {asset.type === 'IMAGE' ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Video className="h-12 w-12 text-indigo-500/40 animate-pulse" />
                  )}
                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => window.open(asset.url)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => deleteMutation.mutate(asset.id)}>
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Card Text Content */}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-1.5 justify-between">
                    <p className="font-semibold text-xs truncate max-w-[120px]">{asset.name}</p>
                    {getAssetIcon(asset.type)}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                    <span>{formatSize(asset.size)}</span>
                    <span className="px-1.5 py-0.5 bg-muted rounded uppercase">{asset.folder || 'general'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center space-y-3">
              <Folder className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-bold">No assets found</p>
                <p className="text-xs">Drag and drop assets or click Upload above to populate this directory.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
