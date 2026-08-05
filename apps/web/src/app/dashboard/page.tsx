'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { profileApi, chartApi, ApiError } from '@/lib/api';
import type { ProfileView } from '@/lib/types';

/**
 * 账户中心：命盘档案列表、多档案管理、数据导出与删除。
 */
export default function DashboardPage() {
  const { ready, authed } = useRequireAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<ProfileView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    profileApi
      .list()
      .then((list) => {
        setProfiles(list);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authed) reload();
  }, [authed]);

  async function openChart(profileId: string) {
    setBusyId(profileId);
    try {
      const result = await chartApi.calculate(profileId);
      router.push(`/chart/${result.chartId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '排盘失败');
      setBusyId(null);
    }
  }

  async function remove(profileId: string) {
    if (!confirm('确定删除该档案及其全部排盘与报告数据？此操作不可恢复。')) return;
    setBusyId(profileId);
    try {
      await profileApi.remove(profileId);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setBusyId(null);
    }
  }

  async function exportAll() {
    try {
      const data = await profileApi.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `destiny-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '导出失败');
    }
  }

  if (!ready || !authed) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <p className="mx-auto max-w-lg px-4 py-20 text-center text-ink-400">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">
            我的命盘
          </h1>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={exportAll}>
              导出全部数据
            </button>
            <Link href="/new" className="btn-primary">
              新建命盘
            </Link>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-fire">{error}</p>}

        {loading ? (
          <p className="py-16 text-center text-ink-400">加载中…</p>
        ) : profiles.length === 0 ? (
          <div className="card mt-6 text-center">
            <p className="text-ink-500 dark:text-ink-400">还没有命盘档案。</p>
            <Link href="/new" className="btn-primary mt-4">
              立即创建
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {profiles.map((p, i) => {
              const cardColors = [
                'hover:border-wood/50 hover:shadow-wood/10',
                'hover:border-fire/50 hover:shadow-fire/10',
                'hover:border-earth/50 hover:shadow-earth/10',
                'hover:border-metal/50 hover:shadow-metal/10',
                'hover:border-water/50 hover:shadow-water/10',
              ];
              const accent = cardColors[i % cardColors.length];
              return (
                <div
                  key={p.id}
                  className={`card flex items-center justify-between gap-4 border border-ink-100 bg-white/50 p-4 transition-all duration-300 hover:shadow-md dark:border-ink-800 dark:bg-ink-900/50 ${accent}`}
                >
                  {/* 左侧：档案信息 */}
                  <div className="flex items-center gap-4">
                    {/* 性别图标：男蓝女红 */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                        p.gender === 'male'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                          : 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400'
                      }`}
                    >
                      {p.gender === 'male' ? '♂' : '♀'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-ink-900 dark:text-ink-100">{p.name}</span>
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                          {p.gender === 'male' ? '男命' : '女命'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                        <span className="mr-1">{p.calendar === 'solar' ? '公历' : '农历'}</span>
                        {p.year}-{String(p.month).padStart(2, '0')}-{String(p.day).padStart(2, '0')}
                        {p.hourKnown ? ` ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` : ' 时辰未知'}
                      </p>
                    </div>
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className="btn-primary !py-2 !px-4"
                      onClick={() => openChart(p.id)}
                      disabled={busyId === p.id}
                    >
                      {busyId === p.id ? '处理中…' : '查看命盘'}
                    </button>
                    <button
                      className="btn-ghost !py-2 !px-3 text-fire hover:bg-fire/10 dark:hover:bg-fire/20"
                      onClick={() => remove(p.id)}
                      disabled={busyId === p.id}
                      title="删除档案"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
