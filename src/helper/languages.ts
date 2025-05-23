export const langList = ['zh', 'en', 'ru', 'ta'] as const;
export type Languages = (typeof langList)[number];

/** 判断传入的字符串是否是支持的语言类型代码 */
export const isLanguages = (
  lang: string | undefined | null,
): lang is Languages => Boolean(lang) && langList.includes(lang as Languages);

/** 返回浏览器偏好语言 */
const getBrowserLang = () => {
  for (const language of navigator.languages) {
    const matchLang = langList.find((l) => l === language.split('-')[0]);
    if (matchLang) return matchLang;
  }
};

const getSaveLang = async () =>
  typeof GM === 'undefined'
    ? localStorage.getItem('Languages')
    : GM.getValue<string>('Languages');

export const setSaveLang = async (val: string) =>
  typeof GM === 'undefined'
    ? localStorage.setItem('Languages', val)
    : GM.setValue('Languages', val);

export const getInitLang = async () => {
  const saveLang = await getSaveLang();
  if (isLanguages(saveLang)) return saveLang;

  const lang = getBrowserLang() ?? 'zh';
  setSaveLang(lang);
  return lang;
};
