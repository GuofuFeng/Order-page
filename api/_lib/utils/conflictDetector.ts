/**
 * 文字替换规则冲突检测工具
 */

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Conflict[];
}

export interface Conflict {
  type: 'chain' | 'circular' | 'overlap';
  severity: 'warning' | 'error';
  message: string;
  relatedRules: {
    id: string;
    fromText: string;
    toText: string;
  }[];
}

export interface ReplacementRule {
  id: string;
  fromText: string;
  toText: string;
  enabled: boolean;
}

/**
 * 检测规则冲突
 * @param rules 所有替换规则
 * @param newRule 新增或修改的规则（可选）
 * @returns 冲突检测结果
 */
export function detectConflicts(
  rules: ReplacementRule[],
  newRule?: { fromText: string; toText: string; id?: string }
): ConflictResult {
  const conflicts: Conflict[] = [];

  // 只检查启用的规则
  const enabledRules = rules.filter(r => r.enabled);

  // 如果有新规则，将其加入检测
  let allRules = enabledRules;
  if (newRule) {
    allRules = [
      ...enabledRules.filter(r => r.id !== newRule.id),
      {
        id: newRule.id || 'new',
        fromText: newRule.fromText,
        toText: newRule.toText,
        enabled: true
      }
    ];
  }

  // 1. 检测链式替换（A→B，B→C 会导致 A→B→C）
  const chainConflicts = detectChainConflicts(allRules);
  conflicts.push(...chainConflicts);

  // 2. 检测循环替换（A→B，B→A）
  const circularConflicts = detectCircularConflicts(allRules);
  conflicts.push(...circularConflicts);

  // 3. 检测重叠替换（A→B，AB→C）
  const overlapConflicts = detectOverlapConflicts(allRules);
  conflicts.push(...overlapConflicts);

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * 检测链式替换
 */
function detectChainConflicts(rules: ReplacementRule[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const ruleMap = new Map(rules.map(r => [r.fromText, r]));

  for (const rule of rules) {
    const chain: ReplacementRule[] = [rule];
    let current = rule.toText;
    let depth = 0;
    const visited = new Set<string>([rule.fromText]);

    // 追踪替换链
    while (ruleMap.has(current) && depth < 10) {
      if (visited.has(current)) break; // 避免无限循环
      visited.add(current);

      const nextRule = ruleMap.get(current)!;
      chain.push(nextRule);
      current = nextRule.toText;
      depth++;
    }

    // 如果链长度 >= 2，说明存在链式替换
    if (chain.length >= 2) {
      const chainDesc = chain.map(r => `"${r.fromText}"→"${r.toText}"`).join(' → ');

      conflicts.push({
        type: 'chain',
        severity: 'warning',
        message: `检测到链式替换：${chainDesc}。这意味着 "${chain[0].fromText}" 最终会被替换为 "${chain[chain.length - 1].toText}"。`,
        relatedRules: chain.map(r => ({
          id: r.id,
          fromText: r.fromText,
          toText: r.toText
        }))
      });
    }
  }

  // 去重（同一条链可能被多次检测到）
  return deduplicateConflicts(conflicts);
}

/**
 * 检测循环替换
 */
function detectCircularConflicts(rules: ReplacementRule[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const ruleMap = new Map(rules.map(r => [r.fromText, r]));

  for (const rule of rules) {
    const visited = new Set<string>();
    let current = rule.fromText;
    const path: ReplacementRule[] = [];

    // 追踪替换路径
    while (ruleMap.has(current)) {
      if (visited.has(current)) {
        // 找到循环的起点
        const cycleStartIndex = path.findIndex(r => r.fromText === current);
        if (cycleStartIndex >= 0) {
          const cycle = path.slice(cycleStartIndex);
          const cycleDesc = cycle.map(r => `"${r.fromText}"`).join(' → ') + ` → "${current}"`;

          conflicts.push({
            type: 'circular',
            severity: 'error',
            message: `检测到循环替换：${cycleDesc}。这会导致不可预测的结果。`,
            relatedRules: cycle.map(r => ({
              id: r.id,
              fromText: r.fromText,
              toText: r.toText
            }))
          });
        }
        break;
      }

      visited.add(current);
      const nextRule = ruleMap.get(current)!;
      path.push(nextRule);
      current = nextRule.toText;
    }
  }

  return deduplicateConflicts(conflicts);
}

/**
 * 检测重叠替换
 */
function detectOverlapConflicts(rules: ReplacementRule[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];

      // 检测是否存在包含关系
      if (rule1.fromText.includes(rule2.fromText)) {
        conflicts.push({
          type: 'overlap',
          severity: 'warning',
          message: `"${rule1.fromText}" 包含 "${rule2.fromText}"。根据规则执行顺序，可能导致意外的替换结果。`,
          relatedRules: [
            { id: rule1.id, fromText: rule1.fromText, toText: rule1.toText },
            { id: rule2.id, fromText: rule2.fromText, toText: rule2.toText }
          ]
        });
      } else if (rule2.fromText.includes(rule1.fromText)) {
        conflicts.push({
          type: 'overlap',
          severity: 'warning',
          message: `"${rule2.fromText}" 包含 "${rule1.fromText}"。根据规则执行顺序，可能导致意外的替换结果。`,
          relatedRules: [
            { id: rule2.id, fromText: rule2.fromText, toText: rule2.toText },
            { id: rule1.id, fromText: rule1.fromText, toText: rule1.toText }
          ]
        });
      }
    }
  }

  return deduplicateConflicts(conflicts);
}

/**
 * 去重冲突（基于相关规则的ID组合）
 */
function deduplicateConflicts(conflicts: Conflict[]): Conflict[] {
  const seen = new Set<string>();
  const result: Conflict[] = [];

  for (const conflict of conflicts) {
    const key = conflict.relatedRules
      .map(r => r.id)
      .sort()
      .join('-');

    if (!seen.has(key)) {
      seen.add(key);
      result.push(conflict);
    }
  }

  return result;
}

/**
 * 预览替换效果
 * @param text 原始文本
 * @param rules 替换规则
 * @returns 替换后的文本和应用的规则列表
 */
export function previewReplacement(
  text: string,
  rules: ReplacementRule[]
): {
  result: string;
  appliedRules: { id: string; fromText: string; toText: string }[];
} {
  let result = text;
  const appliedRules: { id: string; fromText: string; toText: string }[] = [];

  const enabledRules = rules
    .filter(r => r.enabled)
    .sort((a, b) => {
      // 按ID排序（模拟创建时间顺序）
      return a.id.localeCompare(b.id);
    });

  for (const rule of enabledRules) {
    if (result.includes(rule.fromText)) {
      const escapedFrom = rule.fromText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedFrom, 'g');
      result = result.replace(regex, rule.toText);
      appliedRules.push({
        id: rule.id,
        fromText: rule.fromText,
        toText: rule.toText
      });
    }
  }

  return { result, appliedRules };
}
