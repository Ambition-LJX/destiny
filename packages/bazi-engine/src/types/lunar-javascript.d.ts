/**
 * lunar-javascript 的最小类型声明（仅覆盖本项目用到的接口）。
 * 完整 API 见 https://github.com/6tail/lunar-javascript
 */
declare module 'lunar-javascript' {
  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;
    static fromDate(date: Date): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    /** UTC 毫秒数（getTime 为 JS 标准方法） */
    getTime(): number;
    getLunar(): Lunar;
  }

  export class Lunar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Lunar;
    getSolar(): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearShengXiao(): string;
    getYearShengXiaoExact(): string;
    getYearGanByLiChun(): string;
    getYearZhiByLiChun(): string;
    getJieQiTable(): Record<string, Solar>;
    getEightChar(): EightChar;

    // 节气查询（lunar-javascript 1.7+）
    getNextJie(wholeDay?: boolean): JieQi;
    getPrevJie(wholeDay?: boolean): JieQi;
    getNextQi(wholeDay?: boolean): JieQi;
    getPrevQi(wholeDay?: boolean): JieQi;
    getNextJieQi(wholeDay?: boolean): JieQi;
    getPrevJieQi(wholeDay?: boolean): JieQi;
    getCurrentJie(): JieQi | null;
    getCurrentQi(): JieQi | null;
    getCurrentJieQi(): JieQi | null;

    // 旬空
    getDayXunKong(): string;
    getYearXunKong(): string;
    getMonthXunKong(): string;
    getTimeXunKong(): string;
  }

  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getMingGong(): string;
    getTaiYuan(): string;
    getTaiXi(): string;
  }

  /** 节气对象：name + 对应的 Solar */
  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }
}
