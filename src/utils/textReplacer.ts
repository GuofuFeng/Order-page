import { TextReplacement } from '../types';

/**
 * 应用文字替换规则到文本
 * @param text 原始文本
 * @param replacements 替换规则列表
 * @returns 替换后的文本
 */
export function applyTextReplacements(text: string, replacements: TextReplacement[]): string {
  if (!text || !replacements || replacements.length === 0) {
    return text;
  }

  let result = text;

  // 只应用已启用的规则，按创建时间顺序执行
  const enabledReplacements = replacements
    .filter(r => r.enabled)
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

  // 依次应用每个替换规则
  for (const replacement of enabledReplacements) {
    // 使用全局替换，将所有匹配的文字都替换掉
    // 使用正则表达式的 g 标志进行全局替换
    // 需要转义特殊字符以防止正则表达式错误
    const escapedFrom = replacement.fromText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFrom, 'g');
    result = result.replace(regex, replacement.toText);
  }

  return result;
}

/**
 * 检查文本是否会被替换规则影响
 * @param text 原始文本
 * @param replacements 替换规则列表
 * @returns 是否会被替换
 */
export function willTextBeReplaced(text: string, replacements: TextReplacement[]): boolean {
  if (!text || !replacements || replacements.length === 0) {
    return false;
  }

  const enabledReplacements = replacements.filter(r => r.enabled);

  for (const replacement of enabledReplacements) {
    if (text.includes(replacement.fromText)) {
      return true;
    }
  }

  return false;
}
