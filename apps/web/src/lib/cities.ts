/**
 * 常用城市经纬度（用于真太阳时校正）。
 * 覆盖省会与主要城市，可满足大多数录入需求；也支持手动输入经纬度。
 */
export interface City {
  name: string;
  province: string;
  longitude: number;
  latitude: number;
}

export const CITIES: City[] = [
  { name: '北京', province: '北京', longitude: 116.41, latitude: 39.9 },
  { name: '上海', province: '上海', longitude: 121.47, latitude: 31.23 },
  { name: '天津', province: '天津', longitude: 117.2, latitude: 39.13 },
  { name: '重庆', province: '重庆', longitude: 106.55, latitude: 29.56 },
  { name: '广州', province: '广东', longitude: 113.26, latitude: 23.13 },
  { name: '深圳', province: '广东', longitude: 114.06, latitude: 22.55 },
  { name: '杭州', province: '浙江', longitude: 120.15, latitude: 30.28 },
  { name: '南京', province: '江苏', longitude: 118.78, latitude: 32.06 },
  { name: '苏州', province: '江苏', longitude: 120.62, latitude: 31.32 },
  { name: '武汉', province: '湖北', longitude: 114.31, latitude: 30.59 },
  { name: '成都', province: '四川', longitude: 104.07, latitude: 30.67 },
  { name: '西安', province: '陕西', longitude: 108.95, latitude: 34.27 },
  { name: '郑州', province: '河南', longitude: 113.62, latitude: 34.75 },
  { name: '济南', province: '山东', longitude: 117.0, latitude: 36.65 },
  { name: '青岛', province: '山东', longitude: 120.38, latitude: 36.07 },
  { name: '沈阳', province: '辽宁', longitude: 123.43, latitude: 41.8 },
  { name: '大连', province: '辽宁', longitude: 121.62, latitude: 38.92 },
  { name: '长春', province: '吉林', longitude: 125.32, latitude: 43.9 },
  { name: '哈尔滨', province: '黑龙江', longitude: 126.63, latitude: 45.75 },
  { name: '石家庄', province: '河北', longitude: 114.48, latitude: 38.03 },
  { name: '太原', province: '山西', longitude: 112.53, latitude: 37.87 },
  { name: '长沙', province: '湖南', longitude: 112.94, latitude: 28.23 },
  { name: '南昌', province: '江西', longitude: 115.89, latitude: 28.68 },
  { name: '合肥', province: '安徽', longitude: 117.27, latitude: 31.86 },
  { name: '福州', province: '福建', longitude: 119.3, latitude: 26.08 },
  { name: '厦门', province: '福建', longitude: 118.1, latitude: 24.46 },
  { name: '昆明', province: '云南', longitude: 102.71, latitude: 25.05 },
  { name: '贵阳', province: '贵州', longitude: 106.71, latitude: 26.57 },
  { name: '南宁', province: '广西', longitude: 108.37, latitude: 22.82 },
  { name: '海口', province: '海南', longitude: 110.35, latitude: 20.02 },
  { name: '兰州', province: '甘肃', longitude: 103.82, latitude: 36.06 },
  { name: '西宁', province: '青海', longitude: 101.78, latitude: 36.62 },
  { name: '银川', province: '宁夏', longitude: 106.28, latitude: 38.47 },
  { name: '呼和浩特', province: '内蒙古', longitude: 111.75, latitude: 40.84 },
  { name: '乌鲁木齐', province: '新疆', longitude: 87.62, latitude: 43.82 },
  { name: '拉萨', province: '西藏', longitude: 91.11, latitude: 29.65 },
];

/**
 * 按城市名查找城市信息。
 */
export function findCity(name: string): City | undefined {
  return CITIES.find((c) => c.name === name);
}
