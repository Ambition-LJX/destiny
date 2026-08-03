import { Lunar } from 'lunar-javascript';
import type { BirthInput } from '../types/chart.js';

/**
 * 排盘输入校验错误。
 */
export class BaziInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaziInputError';
  }
}

/**
 * 校验出生信息输入的合法性。抛出 BaziInputError 表示非法。
 *
 * 农历输入时，通过 Lunar.fromYmdHms 做一次合法性探测，
 * 避免将"农历 2000 年四月三十"这种不存在的日期透传到引擎。
 */
export function validateBirthInput(input: BirthInput): void {
  if (input.calendar !== 'solar' && input.calendar !== 'lunar') {
    throw new BaziInputError('calendar 必须为 solar 或 lunar');
  }
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    throw new BaziInputError('year 需为 1900-2100 的整数');
  }
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new BaziInputError('month 需为 1-12 的整数');
  }
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) {
    throw new BaziInputError('day 需为 1-31 的整数');
  }
  if (input.hour !== null) {
    if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
      throw new BaziInputError('hour 需为 0-23 的整数或 null');
    }
  }
  if (input.minute !== null) {
    if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
      throw new BaziInputError('minute 需为 0-59 的整数或 null');
    }
  }
  if (input.gender !== 'male' && input.gender !== 'female') {
    throw new BaziInputError('gender 必须为 male 或 female');
  }
  if (typeof input.longitude !== 'number' || input.longitude < -180 || input.longitude > 180) {
    throw new BaziInputError('longitude 需为 -180 到 180 之间的数字');
  }
  if (typeof input.latitude !== 'number' || input.latitude < -90 || input.latitude > 90) {
    throw new BaziInputError('latitude 需为 -90 到 90 之间的数字');
  }

  // 农历输入合法性探测
  if (input.calendar === 'lunar') {
    const leapMonth = input.isLeapMonth ? -input.month : input.month;
    try {
      const hour = input.hour ?? 12;
      const minute = input.minute ?? 0;
      const lunar = Lunar.fromYmdHms(
        input.year,
        leapMonth,
        input.day,
        hour,
        minute,
        0,
      );
      // 检查闰月：闰月标记需真实存在
      if (input.isLeapMonth && lunar.getMonth() !== input.month) {
        // 月份本身对，但闰月不存在
        const solarInfo = lunar.getSolar?.();
        if (solarInfo) {
          throw new BaziInputError(
            `农历 ${input.year} 年没有闰 ${input.month} 月（leapMonth=${leapMonth}）`,
          );
        }
      }
    } catch (e) {
      if (e instanceof BaziInputError) throw e;
      throw new BaziInputError(
        `农历日期不合法：${input.year}-${input.month}-${input.day} ${input.hour ?? '??'}:${input.minute ?? '??'} (${(e as Error).message})`,
      );
    }
  }
}
