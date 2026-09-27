import './ui/styles.css';
import { LocalBatteryAdapter } from './adapters/local-battery.adapter';
import { renderTrackerApp } from './ui/app';
import { ScheduleEvent } from './core/models';

const adapter = new LocalBatteryAdapter();

let warningThreshold = 25;
let isAddModalOpen = false;

const rootEl = document.getElementById('app')!;

function refreshView() {
  const scenarios = adapter.getScenarios();
  const schedule = adapter.getSchedule();
  const analysis = adapter.evaluate(warningThreshold);

  renderTrackerApp(
    rootEl,
    analysis,
    scenarios,
    schedule,
    warningThreshold,
    isAddModalOpen,
    {
      onUpdateScenarioDrain: (scId: string, val: number) => {
        adapter.updateScenarioDrain(scId, val);
        refreshView();
      },
      onAddEvent: (ev: ScheduleEvent) => {
        adapter.addEvent(ev);
        refreshView();
      },
      onRemoveEvent: (evId: string) => {
        adapter.removeEvent(evId);
        refreshView();
      },
      onResetDefaults: () => {
        adapter.resetToDefaults();
        warningThreshold = 25;
        refreshView();
      },
      onThresholdChange: (threshold: number) => {
        warningThreshold = threshold;
        refreshView();
      }
    },
    () => {
      isAddModalOpen = true;
      refreshView();
    },
    () => {
      isAddModalOpen = false;
      refreshView();
    }
  );
}

// Initial render
refreshView();
