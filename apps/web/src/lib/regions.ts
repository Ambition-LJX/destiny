/**
 * 省 / 市 / 县区三级行政区划 + 中心经纬度。
 * 数据来源：民政部行政区划 + 高德地图中心坐标（GCJ-02），
 * 打包为 public/regions.json，首次进入录入页时按需加载，避免增大主包体积。
 */
export interface RegionDistrict {
  /** 名称 */
  n: string;
  /** 中心坐标 [经度, 纬度] */
  c: [number, number];
}

export interface RegionCity extends RegionDistrict {
  /** 下辖县/区 */
  d: RegionDistrict[];
}

export interface RegionProvince extends RegionDistrict {
  /** 下辖市（直辖市为自身） */
  cities: RegionCity[];
}

let cache: RegionProvince[] | null = null;
let inflight: Promise<RegionProvince[]> | null = null;

/**
 * 加载行政区划数据（带内存缓存，仅请求一次）。
 */
export async function loadRegions(): Promise<RegionProvince[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch('/regions.json')
    .then((res) => {
      if (!res.ok) throw new Error(`加载行政区划失败：${res.status}`);
      return res.json() as Promise<RegionProvince[]>;
    })
    .then((data) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}
