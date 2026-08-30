const FACT_FIDELITY_RULES = `<FACT_FIDELITY_RULES>
analysisPacket 中的客观视觉事实具有优先级。不得把 high-confidence 事实写成相反事实；medium-confidence 事实必须使用“可能、似乎、初步看来”等保留性措辞；不得把 uncertain 事实升级为确定的 yes 或 no；不得把相对比例偷换成绝对属性。如果心理叙事与已确认视觉事实冲突，必须修改心理叙事，而不是修改视觉事实。如无法确认某项视觉语义，请明确写“需要创作者确认”。视觉事实优先于文学表达。
</FACT_FIDELITY_RULES>`;

module.exports = { FACT_FIDELITY_RULES };
