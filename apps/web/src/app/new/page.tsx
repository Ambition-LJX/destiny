'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { CITIES, findCity } from '@/lib/cities';
import { loadRegions, type RegionProvince } from '@/lib/regions';
import { profileApi, chartApi, ApiError } from '@/lib/api';
import type { CalendarType, Gender } from '@/lib/types';

/**
 * 录入向导：分步表单，城市选择带经纬度，真太阳时开关，时辰未知选项。
 */
export default function NewChartPage() {
  const { ready, authed } = useRequireAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 表单状态
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [calendar, setCalendar] = useState<CalendarType>('solar');
  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hourKnown, setHourKnown] = useState(true);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [cityName, setCityName] = useState('北京');
  const [useTrueSolarTime, setUseTrueSolarTime] = useState(true);

  // 自定义出生地（下拉框没有时手动录入，可具体到省市县）
  const [customPlace, setCustomPlace] = useState(false);
  const [customLongitude, setCustomLongitude] = useState(116.41);
  const [customLatitude, setCustomLatitude] = useState(39.9);

  // 省/市/县三级级联，选定后自动带出中心经纬度
  const [regions, setRegions] = useState<RegionProvince[]>([]);
  const [regionsError, setRegionsError] = useState('');
  const [provinceIdx, setProvinceIdx] = useState(-1);
  const [cityIdx, setCityIdx] = useState(-1);
  const [districtIdx, setDistrictIdx] = useState(-1);

  useEffect(() => {
    if (!customPlace || regions.length > 0) return;
    let alive = true;
    loadRegions()
      .then((data) => {
        if (alive) setRegions(data);
      })
      .catch(() => {
        if (alive) setRegionsError('行政区划数据加载失败，请手动填写经纬度');
      });
    return () => {
      alive = false;
    };
  }, [customPlace, regions.length]);

  const selectedProvince = provinceIdx >= 0 ? regions[provinceIdx] : undefined;
  const selectedCity =
    selectedProvince && cityIdx >= 0 ? selectedProvince.cities[cityIdx] : undefined;
  const selectedDistrict =
    selectedCity && districtIdx >= 0 ? selectedCity.d[districtIdx] : undefined;

  // 选中的最细一级决定经纬度：县/区 > 市 > 省
  const regionCoords = selectedDistrict?.c ?? selectedCity?.c ?? selectedProvince?.c ?? null;

  useEffect(() => {
    if (regionCoords) {
      setCustomLongitude(regionCoords[0]);
      setCustomLatitude(regionCoords[1]);
    }
  }, [regionCoords]);

  const CUSTOM_VALUE = '__custom__';
  const city = useMemo(() => findCity(cityName) ?? CITIES[0], [cityName]);
  const coords = customPlace
    ? { longitude: customLongitude, latitude: customLatitude }
    : { longitude: city.longitude, latitude: city.latitude };

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const profile = await profileApi.create({
        name: name.trim() || '未命名',
        gender,
        calendar,
        year,
        month,
        day,
        hour: hourKnown ? hour : null,
        minute: hourKnown ? minute : null,
        longitude: coords.longitude,
        latitude: coords.latitude,
        useTrueSolarTime,
        isLeapMonth: calendar === 'lunar' ? isLeapMonth : false,
      });
      const result = await chartApi.calculate(profile.id);
      router.push(`/chart/${result.chartId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '排盘失败，请稍后再试');
      setSubmitting(false);
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
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-serif text-2xl font-bold text-ink-900">开始排盘</h1>
        <Stepper step={step} />

        <div className="card mt-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">档案名称</label>
                <input
                  className="input"
                  placeholder="如：本人、父亲…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">性别</label>
                <div className="flex gap-2">
                  <Choice active={gender === 'male'} onClick={() => setGender('male')}>
                    男
                  </Choice>
                  <Choice active={gender === 'female'} onClick={() => setGender('female')}>
                    女
                  </Choice>
                </div>
              </div>
              <StepNav onNext={() => setStep(2)} nextLabel="下一步：出生时间" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="label">历法</label>
                <div className="flex gap-2">
                  <Choice active={calendar === 'solar'} onClick={() => setCalendar('solar')}>
                    公历
                  </Choice>
                  <Choice active={calendar === 'lunar'} onClick={() => setCalendar('lunar')}>
                    农历
                  </Choice>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <NumField label="年" value={year} min={1900} max={2100} onChange={setYear} />
                <NumField label="月" value={month} min={1} max={12} onChange={setMonth} />
                <NumField label="日" value={day} min={1} max={31} onChange={setDay} />
              </div>

              {calendar === 'lunar' && (
                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={isLeapMonth}
                    onChange={(e) => setIsLeapMonth(e.target.checked)}
                  />
                  该农历月为闰月
                </label>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={!hourKnown}
                    onChange={(e) => setHourKnown(!e.target.checked)}
                  />
                  时辰未知（将省略时柱相关解读）
                </label>
              </div>

              {hourKnown && (
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="时" value={hour} min={0} max={23} onChange={setHour} />
                  <NumField label="分" value={minute} min={0} max={59} onChange={setMinute} />
                </div>
              )}

              <StepNav
                onPrev={() => setStep(1)}
                onNext={() => setStep(3)}
                nextLabel="下一步：出生地"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="label">出生城市</label>
                <select
                  className="input"
                  value={customPlace ? CUSTOM_VALUE : cityName}
                  onChange={(e) => {
                    if (e.target.value === CUSTOM_VALUE) {
                      setCustomPlace(true);
                    } else {
                      setCustomPlace(false);
                      setCityName(e.target.value);
                    }
                  }}
                >
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}（东经 {c.longitude.toFixed(1)}°）
                    </option>
                  ))}
                  <option value={CUSTOM_VALUE}>其它（手动输入省市县）</option>
                </select>
                <p className="mt-1 text-xs text-ink-400">
                  经纬度用于真太阳时校正，作为"空间/磁场"的可计算代理变量。
                </p>
              </div>

              {customPlace && (
                <div className="space-y-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">省</label>
                      <select
                        className="input"
                        value={provinceIdx}
                        disabled={regions.length === 0}
                        onChange={(e) => {
                          setProvinceIdx(Number(e.target.value));
                          setCityIdx(-1);
                          setDistrictIdx(-1);
                        }}
                      >
                        <option value={-1} disabled>
                          请选择
                        </option>
                        {regions.map((p, i) => (
                          <option key={p.n} value={i}>
                            {p.n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">市</label>
                      <select
                        className="input"
                        value={cityIdx}
                        disabled={!selectedProvince}
                        onChange={(e) => {
                          setCityIdx(Number(e.target.value));
                          setDistrictIdx(-1);
                        }}
                      >
                        <option value={-1} disabled>
                          请选择
                        </option>
                        {selectedProvince?.cities.map((c, i) => (
                          <option key={c.n} value={i}>
                            {c.n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">县/区</label>
                      <select
                        className="input"
                        value={districtIdx}
                        disabled={!selectedCity}
                        onChange={(e) => setDistrictIdx(Number(e.target.value))}
                      >
                        <option value={-1} disabled>
                          请选择
                        </option>
                        {selectedCity?.d.map((d, i) => (
                          <option key={d.n} value={i}>
                            {d.n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">经度（东经，°）</label>
                      <input
                        type="number"
                        className="input"
                        step="0.01"
                        min={-180}
                        max={180}
                        value={customLongitude}
                        onChange={(e) => setCustomLongitude(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="label">纬度（北纬，°）</label>
                      <input
                        type="number"
                        className="input"
                        step="0.01"
                        min={-90}
                        max={90}
                        value={customLatitude}
                        onChange={(e) => setCustomLatitude(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  {regionsError ? (
                    <p className="text-xs text-fire">{regionsError}</p>
                  ) : (
                    <p className="text-xs text-ink-400">
                      选择省/市/县后自动带出该地区中心经纬度，用于真太阳时校正；也可手动微调为出生地实际经纬度。
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={useTrueSolarTime}
                  onChange={(e) => setUseTrueSolarTime(e.target.checked)}
                />
                启用真太阳时校正（推荐，按经度与均时差修正）
              </label>

              {error && <p className="text-sm text-fire">{error}</p>}

              <StepNav
                onPrev={() => setStep(2)}
                onNext={handleSubmit}
                nextLabel={submitting ? '排盘中…' : '完成并排盘'}
                nextDisabled={submitting}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ['基本信息', '出生时间', '出生地'];
  return (
    <div className="mt-6 flex items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
              step >= i + 1 ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-400'
            }`}
          >
            {i + 1}
          </span>
          <span className={`text-sm ${step >= i + 1 ? 'text-ink-900' : 'text-ink-400'}`}>
            {l}
          </span>
        </div>
      ))}
    </div>
  );
}

function StepNav({
  onPrev,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onPrev?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-between pt-2">
      {onPrev ? (
        <button className="btn-ghost" onClick={onPrev}>
          上一步
        </button>
      ) : (
        <span />
      )}
      <button className="btn-primary" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </button>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-4 py-2 text-sm transition ${
        active
          ? 'border-ink-900 bg-ink-900 text-white'
          : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
      }`}
    >
      {children}
    </button>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
