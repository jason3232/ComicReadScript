import { clamp } from 'helper';
import { createRootMemo } from 'helper/solidJs';

import { _setState, refs, store } from '../store';

import {
  abreastScrollWidth,
  abreastContentWidth,
  abreastArea,
} from './abreastScroll';
import { isScrollMode, isAbreastMode, abreastColumnWidth } from './memo/common';
import { contentHeight, imgTopList } from './imageSize';
import { scrollTop } from './memo/observer';
import { setOption } from './helper';

/** 滚动内容的长度 */
export const scrollLength = createRootMemo(() => {
  if (isScrollMode()) return contentHeight();
  if (isAbreastMode()) return abreastContentWidth();
  return store.pageList.length;
});

/** 滚动内容的滚动进度 */
export const scrollProgress = createRootMemo(() => {
  if (isScrollMode()) return scrollTop();
  if (isAbreastMode()) return store.page.offset.x.px;
  return store.activePageIndex;
});

/** 滚动内容的滚动进度百分比 */
export const scrollPercentage = createRootMemo(
  () => scrollProgress() / scrollLength(),
);

/** 滚动条滑块长度 */
export const sliderHeight = createRootMemo(() => {
  let itemLength = 1;
  if (isScrollMode()) itemLength = store.rootSize.height;
  if (isAbreastMode()) itemLength = store.rootSize.width;
  return itemLength / scrollLength();
});

/** 当前是否已经滚动到底部 */
export const isBottom = createRootMemo(
  () => scrollPercentage() + sliderHeight() >= 1,
);

/** 当前是否已经滚动到顶部 */
export const isTop = createRootMemo(() => scrollPercentage() === 0);

/** 在卷轴模式下滚动到指定进度 */
export const scrollTo = (x: number, smooth = false) => {
  if (!store.option.scrollMode.enabled) return;
  if (store.option.scrollMode.abreastMode) {
    const val = clamp(0, x, abreastScrollWidth());
    return _setState('page', 'offset', 'x', 'px', val);
  }
  refs.mangaBox.scrollTo({ top: x, behavior: smooth ? 'smooth' : 'instant' });
};

/** 保存当前滚动进度，并在之后恢复 */
export const saveScrollProgress = () => {
  const oldScrollPercentage = scrollPercentage();
  return () => scrollTo(oldScrollPercentage * scrollLength());
};

/** 在卷轴模式下，滚动到能显示指定图片的位置 */
export const scrollViewImg = (i: number) => {
  if (!store.option.scrollMode.enabled) return;
  if (store.option.scrollMode.abreastMode) {
    const columnNum = abreastArea().columns.findIndex((column) =>
      column.includes(i),
    );
    scrollTo(columnNum * abreastColumnWidth());
  } else scrollTo(imgTopList()[i]);
};

/** 在卷轴模式下进行缩放，并且保持滚动进度不变 */
export const zoomScrollModeImg = (zoomLevel: number, set = false) => {
  const jump = saveScrollProgress();
  setOption((draftOption) => {
    const newVal = set
      ? zoomLevel
      : store.option.scrollMode.imgScale + zoomLevel;
    draftOption.scrollMode.imgScale = clamp(0.1, Number(newVal.toFixed(2)), 3);
  });
  jump();

  // 并排卷轴模式下并没有一个明确直观的滚动进度，
  // 也想不出有什么实现效果能和普通卷轴模式的效果一致,
  // 所以就摆烂不管了，反正现在这样也已经能避免乱跳了
};