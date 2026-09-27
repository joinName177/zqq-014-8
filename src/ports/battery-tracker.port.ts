import {
  SocialScenario,
  ScheduleEvent,
  BatteryAnalysisResult
} from '../core/models';

export interface BatteryTrackerPort {
  getScenarios(): SocialScenario[];
  updateScenarioDrain(scenarioId: string, newDrainPerHour: number): void;
  getSchedule(): ScheduleEvent[];
  addEvent(event: ScheduleEvent): void;
  removeEvent(eventId: string): void;
  resetToDefaults(): void;
  evaluate(warningThreshold: number): BatteryAnalysisResult;
}
