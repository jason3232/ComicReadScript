import type { log } from 'helper';

import type { updatePageData } from '../../components/Manga/actions/image';
import type { showCanvas, showColorArea, showGrayList } from '../helper';

import type { getBlankMargin } from './blankMargin';

export type TBLR = 'top' | 'bottom' | 'left' | 'right';

export type ImgContextBase = {
  data: Uint8ClampedArray;
  grayList: Uint8ClampedArray;
  width: number;
  height: number;
};

export type ImgContextMargin = ImgContextBase & {
  blankMargin: NonNullable<ReturnType<typeof getBlankMargin>>;
};

export type ImgContext = ImgContextBase | ImgContextMargin;

export const getEdgeScope = (width: number, height: number) =>
  Math.min(Math.ceil((width + height) * 0.01), 10);

/** 对指定数值取整 */
export const round = (n: number, int: number) => {
  if (int <= 0) return n;
  const remainder = n % int;
  return remainder < int / 2 ? n - remainder : n + (int - remainder);
};

/** 计算 rgb 的灰度 */
export const toGray = (r: number, g: number, b: number) =>
  Math.round(0.299 * r + 0.587 * g + 0.114 * b);

/** 获取图片的灰度表 */
export const toGrayList = (imgData: Uint8ClampedArray, roundNum: number) => {
  const grayList = new Uint8ClampedArray(new ArrayBuffer(imgData.length / 4));
  for (let i = 0, gi = 0; i < imgData.length; i += 4, gi++) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    grayList[gi] = round(toGray(r, g, b), roundNum);
  }
  return grayList;
};

/** 遍历图片的指定行 */
export const forEachRows = (
  width: number,
  y: number,
  fn: (x: number) => unknown,
  start = 0,
  end = width,
) => {
  for (let i = start; i < end; i++) fn(width * y + i);
};

/** 遍历图片的指定列 */
export const forEachCols = (
  width: number,
  height: number,
  x: number,
  fn: (y: number) => unknown,
  start = 0,
  end = height,
) => {
  for (let i = start; i < end; i++) fn(i * width + x);
};

/** 遍历图片的边缘 */
export const forEachEdge = (
  width: number,
  height: number,
  scope: number,
  fn: (i: number) => unknown,
) => {
  for (let i = 0; i < scope; i++) {
    forEachRows(width, i, fn);
    forEachRows(width, height - i - 1, fn);
    forEachCols(width, height, i, fn, scope, height - scope);
    forEachCols(width, height, width - i - 1, fn, scope, height - scope);
  }
};

export type MainFn = {
  showCanvas: typeof showCanvas;
  showColorArea: typeof showColorArea;
  showGrayList: typeof showGrayList;
  log: typeof log;
  setImg: <K extends keyof ComicImg>(
    url: string,
    key: K,
    val: ComicImg[K],
  ) => void;
  updatePageData: typeof updatePageData.throttle;
};
export const mainFn = {} as MainFn;
export const setMainFn = (helper: MainFn, keys: string[]) => {
  for (const name of keys)
    Reflect.set(mainFn, name, (...args: any[]) =>
      Reflect.apply(helper[name], helper, args),
    );
};

/** 缩小图像 */
export const resizeImg = (
  rawImgData: Uint8ClampedArray,
  width: number,
  height: number,
) => {
  // const scale = 1;
  const scale = Math.min(200 / width, 200 / height);
  const w = Math.floor(width * scale);
  const h = Math.floor(height * scale);

  const data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 使用最简单的采样方式，避免出现原图所没有的颜色
      const i = (y * w + x) * 4;
      const tx = Math.floor(x / scale);
      const ty = Math.floor(y / scale);
      const target = (width * ty + tx) * 4;

      data[i] = rawImgData[target];
      data[i + 1] = rawImgData[target + 1];
      data[i + 2] = rawImgData[target + 2];
      data[i + 3] = 255;
    }
  }

  return { scale, w, h, data };
};

/** 通过互相比较数组项求出最终项 */
export const boil = <T>(
  array: readonly T[],
  compareFunc: (a: T, b: T) => T,
) => {
  if (!array || (array.length ?? 0) === 0) return null;
  return array.reduce(compareFunc); // eslint-disable-line unicorn/no-array-reduce
};
