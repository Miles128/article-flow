'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppStore } from '@/lib/store';
import { projectsApi } from '@/lib/api/client';
import type { Project } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const { currentProject, setCurrentProject } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
    
    return () => {
      setCurrentProject(null);
    };
  }, [projectId]);

  async function loadProject(id: string) {
    try {
      setLoading(true);
      const response = await projectsApi.getById(id);
      setCurrentProject(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('项目加载失败');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">加载项目...</p>
        </div>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || '项目不存在'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <ArrowLeft size={18} />
            返回项目列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64 min-h-screen">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
                >
                  <ArrowLeft size={14} />
                  返回
                </Link>
                <h1 className="text-xl font-bold text-gray-900">{currentProject.title}</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
