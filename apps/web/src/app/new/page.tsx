'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/NavBar';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { CITIES, findCity } from '@/lib/cities';
import { loadRegions, type RegionProvince } from '@/lib/regions';
import { profileApi, chartApi, ApiError } from '@/lib/api';
import type { CalendarType, Gender } from '@/lib/types';
import {
  estimateSolarCorrectionMinutes,
  applyClockCorrection,
  getHourBranch,
  formatHM,
} from '@/lib/solarTime';

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
        <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-ink-100">开始排盘</h1>
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
                  <Choice active={gender === 'male'} onClick={() => setGender('male')} accent="water">
                    男
                  </Choice>
                  <Choice active={gender === 'female'} onClick={() => setGender('female')} accent="fire">
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
                  <Choice active={calendar === 'solar'} onClick={() => setCalendar('solar')} accent="metal">
                    公历
                  </Choice>
                  <Choice active={calendar === 'lunar'} onClick={() => setCalendar('lunar')} accent="earth">
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
                <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
                  <input
                    type="checkbox"
                    checked={isLeapMonth}
                    onChange={(e) => setIsLeapMonth(e.target.checked)}
                  />
                  该农历月为闰月
                </label>
              )}

              <div>
                <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
                  <input
                    type="checkbox"
                    checked={!hourKnown}
                    onChange={(e) => setHourKnown(!e.target.checked)}
                  />
                  时辰未知（将省略时柱相关解读）
                </label>
              </div>

              {hourKnown && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="时" value={hour} min={0} max={23} onChange={setHour} />
                    <NumField label="分" value={minute} min={0} max={59} onChange={setMinute} />
                  </div>
                  <div className="rounded-lg border border-earth/30 bg-earth/5 px-3 py-2 text-xs text-ink-600 dark:border-earth/40 dark:bg-earth/10 dark:text-ink-300">
                    <span>
                      当前钟表时间对应时辰：
                      <b className="ml-1 text-ink-900 dark:text-ink-100">{getHourBranch(hour, minute)}时</b>
                    </span>
                    {(hour === 23 || hour === 0 || hour === 1) && (
                      <p className="mt-1 text-fire">
                        ⚠ 时辰边界：23:00–01:00 属于"子时"，部分流派认为跨越当日，23:00 仍属当日、00:00 后属次日；启用真太阳时后会有进一步调整。
                      </p>
                    )}
                  </div>
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
                <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">
                  经纬度用于真太阳时校正，作为"空间/磁场"的可计算代理变量。
                </p>
              </div>

              {customPlace && (
                <div className="space-y-3 rounded-lg border border-water/20 bg-water/5 p-3 dark:border-water/30 dark:bg-water/10">
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
                    <p className="text-xs text-ink-400 dark:text-ink-500">
                      选择省/市/县后自动带出该地区中心经纬度，用于真太阳时校正；也可手动微调为出生地实际经纬度。
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
                <input
                  type="checkbox"
                  checked={useTrueSolarTime}
                  onChange={(e) => setUseTrueSolarTime(e.target.checked)}
                />
                启用真太阳时校正（推荐，按经度与均时差修正）
              </label>

              {useTrueSolarTime && hourKnown && (
                <TrueSolarPreview
                  longitude={coords.longitude}
                  month={month}
                  day={day}
                  hour={hour}
                  minute={minute}
                />
              )}

              {useTrueSolarTime && Math.abs(coords.longitude - 120) > 10 && (
                <p className="rounded-lg border border-fire/40 bg-fire/10 px-3 py-2 text-xs text-fire">
                  ⚠ 出生地经度远离东经 120°（北京时间基准），校正量较大，将对时柱/日柱产生显著影响。
                  建议先与原始出生证明 / 出生医院记录核对。
                </p>
              )}

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

const STEP_ACTIVE_BG = ['bg-wood', 'bg-fire', 'bg-earth'];

function Stepper({ step }: { step: number }) {
  const labels = ['基本信息', '出生时间', '出生地'];
  return (
    <div className="mt-6 flex items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              step >= i + 1
                ? `${STEP_ACTIVE_BG[i]} text-white`
                : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500'
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`text-sm ${
              step >= i + 1 ? 'text-ink-900 dark:text-ink-100' : 'text-ink-400 dark:text-ink-500'
            }`}
          >
            {l}
          </span>
          {i < labels.length - 1 && (
            <span className="ml-1 h-px flex-1 bg-ink-100 dark:bg-ink-800" />
          )}
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

const CHOICE_ACTIVE_STYLES = {
  wood: 'border-wood bg-wood text-white',
  fire: 'border-fire bg-fire text-white',
  earth: 'border-earth bg-earth text-white',
  metal: 'border-metal bg-metal text-white',
  water: 'border-water bg-water text-white',
} as const;

function Choice({
  active,
  onClick,
  children,
  accent = 'wood',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: keyof typeof CHOICE_ACTIVE_STYLES;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
        active
          ? CHOICE_ACTIVE_STYLES[accent]
          : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-ink-600'
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

/**
 * 真太阳时校正预览：展示钟表时间校正后的真太阳钟表时间，以及新时辰/新日柱影响。
 */
function TrueSolarPreview({
  longitude,
  month,
  day,
  hour,
  minute,
}: {
  longitude: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) {
  const correction = estimateSolarCorrectionMinutes(longitude, month, day);
  const corrected = applyClockCorrection(hour, minute, correction);
  const origBranch = getHourBranch(hour, minute);
  const newBranch = getHourBranch(corrected.hour, corrected.minute);
  const branchChanged = origBranch !== newBranch;

  return (
    <div className="rounded-lg border border-wood/40 bg-wood/5 px-3 py-2 text-xs text-ink-700 dark:border-wood/30 dark:bg-wood/10 dark:text-ink-300 space-y-1">
      <p>
        真太阳时校正量：
        <b className="ml-1 text-ink-900 dark:text-ink-100">
          {correction >= 0 ? '+' : ''}
          {correction} 分钟
        </b>
        <span className="ml-2 text-ink-400 dark:text-ink-500">
          （经度差 {(longitude - 120).toFixed(2)}° × 4 + 均时差）
        </span>
      </p>
      <p>
        钟表时间 {formatHM(hour, minute)} → 真太阳钟表时间
        <b className="ml-1 text-ink-900 dark:text-ink-100">{formatHM(corrected.hour, corrected.minute)}</b>
        {corrected.crossesDay && <span className="ml-1 text-fire">（跨越日期）</span>}
      </p>
      {branchChanged && (
        <p className="text-fire">
          ⚠ 时辰将由
          <b className="mx-1">{origBranch}时</b>
          变为
          <b className="ml-1">{newBranch}时</b>
          ，日柱/时柱将发生变化。
        </p>
      )}
    </div>
  );
}
