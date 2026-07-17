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
}
