export interface SocialScenario {
  id: string;
  name: string;
  icon: string;
  drainPerHour: number; // 负值表示耗电，正值表示回血 (例如 -25 代表每小时消耗 25%)
  isRecharge: boolean;
  description: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  scenarioId: string;
  startTime: string; // "HH:MM" 24小时制
  durationMinutes: number;
  notes: string;
}

export interface TimelinePoint {
  minuteOfDay: number;
  timeStr: string;
  batteryPercent: number;
  activeEventName?: string;
  status: 'optimal' | 'warning' | 'critical';
}

export interface ScenarioDrainStat {
  scenarioName: string;
  icon: string;
  totalPercent: number;
  totalHours: number;
  isRecharge: boolean;
}

export interface BatteryAnalysisResult {
  initialBattery: number;
  finalBattery: number;
  lowestBattery: number;
  warningThreshold: number;
  isUnderThreshold: boolean;
  thresholdBreachedAt?: string;
  totalDepletedPercent: number;
  totalRechargedPercent: number;
  timeline: TimelinePoint[];
  drainByScenario: ScenarioDrainStat[];
  solitudePrescription: {
    alertTitle: string;
    advice: string;
    neededRechargeMinutes: number;
    recommendedSolitudeMode: string;
  };
}
