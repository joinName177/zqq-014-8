import {
  SocialScenario,
  ScheduleEvent,
  TimelinePoint,
  BatteryAnalysisResult,
  ScenarioDrainStat
} from './models';

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function calculateBatteryDay(
  scenarios: SocialScenario[],
  events: ScheduleEvent[],
  initialBattery = 100,
  warningThreshold = 25
): BatteryAnalysisResult {
  const scenarioMap = new Map(scenarios.map(s => [s.id, s]));

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Compute minute intervals from 07:00 (420 mins) to 23:30 (1410 mins)
  const startMin = 420;
  const endMin = 1410;
  const stepMins = 15;

  let currentLevel = initialBattery;
  let lowestLevel = initialBattery;
  let thresholdBreachedAt: string | undefined = undefined;
  let totalDepleted = 0;
  let totalRecharged = 0;

  const timeline: TimelinePoint[] = [];

  // Track scenario consumption totals
  const scenarioUsageMap = new Map<string, { mins: number; percentDelta: number }>();

  // Helper to find active event at minute
  const getActiveEvent = (min: number): ScheduleEvent | undefined => {
    return sortedEvents.find(e => {
      const eStart = timeToMinutes(e.startTime);
      const eEnd = eStart + e.durationMinutes;
      return min >= eStart && min <= eEnd;
    });
  };

  for (let min = startMin; min <= endMin; min += stepMins) {
    const activeEv = getActiveEvent(min);
    let delta = 0;
    let eventName: string | undefined = undefined;

    if (activeEv) {
      eventName = activeEv.title;
      const sc = scenarioMap.get(activeEv.scenarioId);
      if (sc) {
        // drainPerHour is per 60 mins -> per 15 min is sc.drainPerHour / 4
        delta = (sc.drainPerHour / 60) * stepMins;
        
        const usage = scenarioUsageMap.get(sc.id) || { mins: 0, percentDelta: 0 };
        usage.mins += stepMins;
        usage.percentDelta += delta;
        scenarioUsageMap.set(sc.id, usage);
      }
    } else {
      // Natural low baseline passive drain (-1% per hour when awake)
      delta = (-1 / 60) * stepMins;
    }

    if (delta < 0) {
      totalDepleted += Math.abs(delta);
    } else {
      totalRecharged += delta;
    }

    currentLevel = Math.max(0, Math.min(100, currentLevel + delta));
    if (currentLevel < lowestLevel) {
      lowestLevel = currentLevel;
    }

    const timeStr = minutesToTime(min);
    if (currentLevel < warningThreshold && !thresholdBreachedAt) {
      thresholdBreachedAt = timeStr;
    }

    const status: TimelinePoint['status'] =
      currentLevel <= 15 ? 'critical' : currentLevel <= warningThreshold ? 'warning' : 'optimal';

    timeline.push({
      minuteOfDay: min,
      timeStr,
      batteryPercent: Math.round(currentLevel),
      activeEventName: eventName,
      status
    });
  }

  // Format scenario drain stats
  const drainByScenario: ScenarioDrainStat[] = [];
  scenarios.forEach(sc => {
    const usage = scenarioUsageMap.get(sc.id);
    if (usage && usage.mins > 0) {
      drainByScenario.push({
        scenarioName: sc.name,
        icon: sc.icon,
        totalPercent: Math.round(Math.abs(usage.percentDelta)),
        totalHours: parseFloat((usage.mins / 60).toFixed(1)),
        isRecharge: sc.isRecharge
      });
    }
  });

  const isUnderThreshold = lowestLevel < warningThreshold;
  const neededRechargePercent = Math.max(0, 70 - lowestLevel);
  const neededRechargeMinutes = Math.round((neededRechargePercent / 25) * 60);

  let alertTitle = '电量健康 · 社交能量充沛';
  let advice = '今日日程安排均衡，社交电量保持在平稳区间，无需强制启动紧急独处。';
  let recommendedSolitudeMode = '晚间温水沐浴 15 分钟即可维持满格。';

  if (lowestLevel <= 10) {
    alertTitle = '🚨 警报：社交电量危急枯竭！';
    advice = `预计在 ${thresholdBreachedAt || '今日下半场'} 电量跌破 ${Math.round(lowestLevel)}% 极限红线！大脑感知过载，极易诱发烦躁、冷漠与无意识情绪脱水。`;
    recommendedSolitudeMode = '建议立即取消非核心社交，戴上降噪耳机，进入暗光房间独处发呆至少 45 分钟以紧急回血！';
  } else if (isUnderThreshold) {
    alertTitle = '⚠️ 提示：低电量告警，请注意独处回血';
    advice = `在 ${thresholdBreachedAt} 附近剩余电量仅有 ${Math.round(lowestLevel)}%，低于设定的 ${warningThreshold}% 心理安全阈值。`;
    recommendedSolitudeMode = `建议在两场高耗能日程之间插入 ${neededRechargeMinutes} 分钟的独处慢走或翻阅非工作书籍。`;
  }

  return {
    initialBattery,
    finalBattery: Math.round(currentLevel),
    lowestBattery: Math.round(lowestLevel),
    warningThreshold,
    isUnderThreshold,
    thresholdBreachedAt,
    totalDepletedPercent: Math.round(totalDepleted),
    totalRechargedPercent: Math.round(totalRecharged),
    timeline,
    drainByScenario,
    solitudePrescription: {
      alertTitle,
      advice,
      neededRechargeMinutes,
      recommendedSolitudeMode
    }
  };
}
