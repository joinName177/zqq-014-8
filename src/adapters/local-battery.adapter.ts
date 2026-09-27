import { SocialScenario, ScheduleEvent, BatteryAnalysisResult } from '../core/models';
import { calculateBatteryDay } from '../core/battery-engine';
import { BatteryTrackerPort } from '../ports/battery-tracker.port';

const SCENARIOS_STORAGE_KEY = 'social_battery_scenarios_v1';
const SCHEDULE_STORAGE_KEY = 'social_battery_schedule_v1';

const DEFAULT_SCENARIOS: SocialScenario[] = [
  {
    id: 'sc-meeting',
    name: '多方工作会议',
    icon: '💼',
    drainPerHour: -28,
    isRecharge: false,
    description: '注意力高度集中，需频繁进行意见对齐与人际权衡'
  },
  {
    id: 'sc-party',
    name: '大型社交聚会 / 轰趴',
    icon: '🎉',
    drainPerHour: -42,
    isRecharge: false,
    description: '高频多线程寒暄、嘈杂环境与非结构化互动'
  },
  {
    id: 'sc-1on1',
    name: '一对一深度谈话',
    icon: '☕',
    drainPerHour: -18,
    isRecharge: false,
    description: '双向倾听与情感共鸣，中等能量消耗'
  },
  {
    id: 'sc-speech',
    name: '公开演讲 / 方案汇报',
    icon: '🎤',
    drainPerHour: -60,
    isRecharge: false,
    description: '舞台镁光灯效应与高压评价风险，急速耗电'
  },
  {
    id: 'sc-lunch',
    name: '商务聚餐 / 同事拼饭',
    icon: '🍜',
    drainPerHour: -20,
    isRecharge: false,
    description: '一边进食一边维持基本职场客套与话题接抛'
  },
  {
    id: 'sc-walk',
    name: '独自戴耳机慢步',
    icon: '🎧',
    drainPerHour: 22,
    isRecharge: true,
    description: '绿道散步、听器乐播客，感官复位'
  },
  {
    id: 'sc-read',
    name: '沉浸式独处阅读',
    icon: '📖',
    drainPerHour: 28,
    isRecharge: true,
    description: '安静的书桌与翻书声，重构内心秩序'
  },
  {
    id: 'sc-nap',
    name: '闭目冥想 / 发呆放空',
    icon: '🧘',
    drainPerHour: 35,
    isRecharge: true,
    description: '完全切断语言系统，深层神经元减压'
  }
];

const DEFAULT_SCHEDULE: ScheduleEvent[] = [
  {
    id: 'ev-1',
    title: '周一产品战略评审会',
    scenarioId: 'sc-meeting',
    startTime: '09:30',
    durationMinutes: 90,
    notes: '跨部门多位负责人参加，需据理力争'
  },
  {
    id: 'ev-2',
    title: '与新入职导师一对一沟通',
    scenarioId: 'sc-1on1',
    startTime: '11:30',
    durationMinutes: 45,
    notes: '近况复盘与答疑'
  },
  {
    id: 'ev-3',
    title: '项目攻坚启动会',
    scenarioId: 'sc-meeting',
    startTime: '14:00',
    durationMinutes: 90,
    notes: '任务拆解与排期讨论'
  },
  {
    id: 'ev-4',
    title: '面向全员的架构汇报演讲',
    scenarioId: 'sc-speech',
    startTime: '16:30',
    durationMinutes: 60,
    notes: '核心技术讲演，面对上百人现场'
  },
  {
    id: 'ev-5',
    title: '团队季度聚餐派对',
    scenarioId: 'sc-party',
    startTime: '19:00',
    durationMinutes: 120,
    notes: '大包厢聚会庆祝'
  }
];

export class LocalBatteryAdapter implements BatteryTrackerPort {
  getScenarios(): SocialScenario[] {
    const raw = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (!raw) return DEFAULT_SCENARIOS;
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SCENARIOS;
    }
  }

  updateScenarioDrain(scenarioId: string, newDrainPerHour: number): void {
    const list = this.getScenarios();
    const target = list.find(s => s.id === scenarioId);
    if (target) {
      target.drainPerHour = newDrainPerHour;
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(list));
    }
  }

  getSchedule(): ScheduleEvent[] {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULE;
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SCHEDULE;
    }
  }

  addEvent(event: ScheduleEvent): void {
    const list = this.getSchedule();
    list.push({ ...event, startTime: event.startTime.trim() });
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(list));
  }

  removeEvent(eventId: string): void {
    const list = this.getSchedule().filter(e => e.id !== eventId);
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(list));
  }

  resetToDefaults(): void {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(DEFAULT_SCENARIOS));
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(DEFAULT_SCHEDULE));
  }

  evaluate(warningThreshold = 25): BatteryAnalysisResult {
    const scenarios = this.getScenarios();
    const schedule = this.getSchedule();
    return calculateBatteryDay(scenarios, schedule, 100, warningThreshold);
  }
}
