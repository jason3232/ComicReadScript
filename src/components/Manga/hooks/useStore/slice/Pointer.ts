import { isEqual, requestIdleCallback } from 'helper';
import { store, setState } from '..';
import { useDoubleClick } from '../../useDoubleClick';
import type { UseDrag } from '../../useDrag';
import { turnPage, turnPageAnimation } from './Operate';

const pageClick = {
  prev: () => {
    if (store.option.clickPageTurn.enabled) turnPage('prev');
  },
  next: () => {
    if (store.option.clickPageTurn.enabled) turnPage('next');
  },
  menu: () => {
    // 处于放大模式时跳过不处理
    if (store.isZoomed) return;
    setState((state) => {
      state.show.scrollbar = !state.show.scrollbar;
      state.show.toolbar = !state.show.toolbar;
    });
  },
};

/** 根据点击坐标触发指定的操作 */
export const handlePageClick = ({ x, y }: MouseEvent) => {
  if (store.isZoomed) return;

  // 找到当前
  const targetArea = [
    store.ref.nextArea,
    store.ref.menuArea,
    store.ref.prevArea,
  ].find((e) => {
    if (!e) return false;
    const rect = e.getBoundingClientRect();
    return (
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    );
  });
  if (!targetArea) return;
  pageClick[targetArea.getAttribute('data-area') as keyof typeof pageClick]();
};

/** 网格模式下点击图片跳到对应页 */
export const handleGridClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'IMG') return;
  const pageNumText = target.parentElement?.getAttribute('data-index');
  if (!pageNumText) return;
  const pageNum = +pageNumText;
  if (!Reflect.has(store.pageList, pageNum)) return;
  setState((state) => {
    state.activePageIndex = pageNum;
    state.gridMode = false;
  });
};

/** 双击放大 */
const doubleClickZoom = (e: MouseEvent) => {
  if (!store.panzoom || store.option.scrollMode || store.gridMode) return;
  requestIdleCallback(() => {
    const { scale } = store.panzoom!.getTransform();

    // 当缩放到一定程度时再双击会缩放回原尺寸，否则正常触发缩放
    if (scale >= 2) store.panzoom!.smoothZoomAbs(0, 0, 0.99);
    else store.panzoom!.smoothZoomAbs(e.clientX, e.clientY, scale + 1);
  });
};
const handleClick = useDoubleClick(
  (e) => (store.gridMode ? handleGridClick(e) : handlePageClick(e)),
  doubleClickZoom,
);

type SlideState = {
  /** 滑动方向 */
  slideDir: 'up' | 'down' | 'left' | 'right' | undefined;
  /** 是否是点击操作 */
  isClick: boolean;
};

const initState = (): SlideState => ({
  slideDir: undefined,
  isClick: true,
});

let slideState = initState();

const PI2 = Math.PI / 2;

/** 根据传入的角度判断滑动方向 */
const getSlideDir = (angle: number): SlideState['slideDir'] => {
  if (isEqual(angle, -PI2, 1.3)) return 'up';
  if (isEqual(angle, 0, 1)) return 'right';
  if (isEqual(angle, PI2, 1.3)) return 'down';
  if (isEqual(angle, Math.PI, 1)) return 'left';
  if (isEqual(angle, -Math.PI, 1)) return 'left';
  return undefined;
};

/** 判断翻页方向 */
const getTurnPageDir = (
  startTime: number,
  distance: number,
): undefined | 'prev' | 'next' => {
  // 根据距离判断
  if (Math.abs(distance) > store.ref.root!.scrollWidth / 3)
    return distance > 0 ? 'next' : 'prev';

  const speed = distance / (Date.now() - startTime);
  if (speed > 0.4) return 'next';
  if (speed < -0.4) return 'prev';

  return undefined;
};

// 实现滑动手势
export const handleMangaFlowDrag: UseDrag = (
  { type, xy: [x, y], initial: [ix, iy], startTime },
  e,
) => {
  if (store.option.scrollMode || store.isZoomed) return;

  // 移动一段距离或按住一段时间后，将操作视为拖拽
  if (
    slideState.isClick &&
    (Math.abs(x - ix) + Math.abs(y - iy) > 10 || Date.now() - startTime > 500)
  ) {
    slideState.isClick = false;
  }

  // 网格模式下只允许点击
  if (store.gridMode && !slideState.isClick) return;

  switch (type) {
    case 'dragging': {
      if (slideState.isClick) return;

      if (store.dragMode)
        setState((state) => {
          state.pageOffsetPx = state.option.dir === 'rtl' ? x - ix : ix - x;
        });

      slideState.slideDir = getSlideDir(Math.atan2(y - iy, x - ix));
      switch (slideState.slideDir) {
        case 'left':
        case 'right':
          if (!store.dragMode)
            setState((state) => {
              state.dragMode = true;
              state.pageAnimation = false;
            });
          break;
      }
      return;
    }
    case 'end': {
      if (slideState.isClick) handleClick(e);
      // 将拖动的页面移回正常位置
      else if (store.pageOffsetPx !== 0) {
        const dir = getTurnPageDir(startTime, store.pageOffsetPx);
        switch (dir) {
          case 'next':
          case 'prev': {
            turnPageAnimation(dir);
            break;
          }
          default:
            setState((state) => {
              state.pageOffsetPx = 0;
              state.pageAnimation = true;
              state.dragMode = false;
            });
        }
      }
      // 上下滑动速度达标后触发翻页
      else if (slideState.slideDir) {
        switch (slideState.slideDir) {
          case 'up':
          case 'down':
            if (getTurnPageDir(startTime, y - iy))
              turnPage(slideState.slideDir === 'up' ? 'next' : 'prev');
            break;
        }
      }
      slideState = initState();
    }
  }
};