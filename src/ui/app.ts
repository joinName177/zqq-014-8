import {
  BatteryAnalysisResult,
  SocialScenario,
  ScheduleEvent
} from '../core/models';

export interface TrackerUIHandlers {
  onUpdateScenarioDrain: (scId: string, val: number) => void;
  onAddEvent: (ev: ScheduleEvent) => void;
  onRemoveEvent: (evId: string) => void;
  onResetDefaults: () => void;
  onThresholdChange: (threshold: number) => void;
}

export function renderTrackerApp(
  container: HTMLElement,
  analysis: BatteryAnalysisResult,
  scenarios: SocialScenario[],
  schedule: ScheduleEvent[],
  warningThreshold: number,
  isAddModalOpen: boolean,
  handlers: TrackerUIHandlers,
  onOpenAddModal: () => void,
  onCloseAddModal: () => void
) {
  const esc = (s: string) =>
    s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

  // Determine battery color
  let battColor = 'var(--batt-green)';
  if (analysis.finalBattery <= 15) battColor = 'var(--batt-red)';
  else if (analysis.finalBattery <= warningThreshold) battColor = 'var(--batt-yellow)';

  // Build SVG Points for the 24h curve
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const points = analysis.timeline;
  const pointCount = points.length;

  const getX = (idx: number) => paddingX + (idx / (pointCount - 1)) * chartW;
  const getY = (percent: number) => paddingY + chartH - (percent / 100) * chartH;

  // Threshold Y
  const thresholdY = getY(warningThreshold);

  // Path string
  let pathD = '';
  points.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.batteryPercent);
    if (i === 0) pathD += `M ${x.toFixed(1)},${y.toFixed(1)}`;
    else pathD += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Area under curve
  const areaD = `${pathD} L ${getX(pointCount - 1)},${paddingY + chartH} L ${getX(0)},${paddingY + chartH} Z`;

  // Hour labels: 08:00, 11:00, 14:00, 17:00, 20:00, 23:00
  const hourTicks = [
    { label: '07:00', idx: 0 },
    { label: '10:00', idx: 12 },
    { label: '13:00', idx: 24 },
    { label: '16:00', idx: 36 },
    { label: '19:00', idx: 48 },
    { label: '22:00', idx: 60 }
  ];

  // Event markers on curve
  const eventMarkers = points
    .map((p, i) => ({ p, i }))
    .filter(item => item.p.activeEventName && item.i % 4 === 0);

  const curveSvg = `
    <svg class="curve-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="curveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${battColor}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="${battColor}" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- Grid lines -->
      <line x1="${paddingX}" y1="${getY(25)}" x2="${svgWidth - paddingX}" y2="${getY(25)}" stroke="#1e293b" stroke-dasharray="2,4" />
      <line x1="${paddingX}" y1="${getY(50)}" x2="${svgWidth - paddingX}" y2="${getY(50)}" stroke="#1e293b" stroke-dasharray="2,4" />
      <line x1="${paddingX}" y1="${getY(75)}" x2="${svgWidth - paddingX}" y2="${getY(75)}" stroke="#1e293b" stroke-dasharray="2,4" />

      <!-- Danger Threshold Line -->
      <line x1="${paddingX}" y1="${thresholdY}" x2="${svgWidth - paddingX}" y2="${thresholdY}" stroke="var(--batt-red)" stroke-width="1.5" stroke-dasharray="4,4" />
      <text x="${svgWidth - paddingX + 5}" y="${thresholdY + 4}" fill="var(--batt-red)" font-size="10" font-family="monospace">${warningThreshold}% 预警线</text>

      <!-- Shaded Area -->
      <path d="${areaD}" fill="url(#curveGrad)" />

      <!-- Main Path -->
      <path d="${pathD}" fill="none" stroke="${battColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Ticks & Labels -->
      ${hourTicks
        .map(
          t => `
        <line x1="${getX(t.idx)}" y1="${paddingY + chartH}" x2="${getX(t.idx)}" y2="${paddingY + chartH + 5}" stroke="#475569" />
        <text x="${getX(t.idx)}" y="${paddingY + chartH + 16}" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="monospace">${t.label}</text>
      `
        )
        .join('')}

      <!-- Event dots -->
      ${eventMarkers
        .map(
          m => `
        <circle cx="${getX(m.i)}" cy="${getY(m.p.batteryPercent)}" r="4" fill="#fff" stroke="${battColor}" stroke-width="2" />
      `
        )
        .join('')}
    </svg>
  `;

  container.innerHTML = `
    <div class="app-container">
      <header class="app-header">
        <div class="brand">
          <div class="battery-chip">
            <div class="battery-chip-inner" style="width:${analysis.finalBattery}%;background:${battColor};"></div>
          </div>
          <div>
            <h1>社交电量计 · 独处充电管理系统</h1>
            <p>SOCIAL BATTERY &amp; SOLITUDE RECHARGE ADVISOR · v1.0.0</p>
          </div>
        </div>
        <div class="header-controls">
          <button class="btn-secondary" id="btnResetDefaults">🔄 恢复默认预设</button>
          <button class="btn-primary" id="btnOpenAddModal">➕ 添加日程事件</button>
        </div>
      </header>

      <!-- Warning Alert Banner -->
      ${
        analysis.isUnderThreshold
          ? `
        <div class="warning-banner">
          <div class="warning-banner-left">
            <span class="warning-badge">电量预警</span>
            <div>
              <strong>${esc(analysis.solitudePrescription.alertTitle)}</strong>
              <div style="font-size:13px;color:var(--batt-text);margin-top:2px;">
                ${esc(analysis.solitudePrescription.advice)}
              </div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;color:var(--batt-muted);">急救处方建议：</div>
            <strong style="color:var(--batt-cyan);font-size:13px;">${esc(analysis.solitudePrescription.recommendedSolitudeMode)}</strong>
          </div>
        </div>
      `
          : ''
      }

      <div class="dashboard-grid">
        <!-- Giant Battery HUD -->
        <div class="battery-hud-card">
          <div class="huge-battery">
            <div class="huge-battery-fill" style="height:${analysis.finalBattery}%;background:${battColor};color:${battColor};"></div>
          </div>
          <div class="hud-percent" style="color:${battColor};">${analysis.finalBattery}%</div>
          <div class="hud-status">
            ${analysis.finalBattery <= 15 ? '⚠️ 极限红色警戒 · 严重脱电' : analysis.finalBattery <= warningThreshold ? '⚡ 进入低功耗模式 · 需充电' : '🔋 能量充裕 · 社交状态良性'}
          </div>
          <div class="hud-sub-stats">
            <div class="hud-stat-item">
              <span>日内最低值</span>
              <strong style="color:${analysis.lowestBattery < warningThreshold ? 'var(--batt-red)' : 'var(--batt-cyan)'}">${analysis.lowestBattery}%</strong>
            </div>
            <div class="hud-stat-item">
              <span>总耗电 / 回血</span>
              <strong>-${analysis.totalDepletedPercent}% / +${analysis.totalRechargedPercent}%</strong>
            </div>
          </div>
        </div>

        <!-- 24h Consumption Curve Chart -->
        <div class="curve-card">
          <div class="curve-header">
            <h2>📈 日内社交电量消耗曲线图</h2>
            <div class="threshold-slider-wrap">
              <label>独处预警阈值: <strong style="color:var(--batt-red);">${warningThreshold}%</strong></label>
              <input type="range" id="thresholdSlider" min="10" max="40" value="${warningThreshold}" style="width:90px;" />
            </div>
          </div>

          <div class="curve-svg-wrap">
            ${curveSvg}
          </div>

          <!-- Scenario Drain Breakdown -->
          <div style="display:flex;gap:12px;overflow-x:auto;margin-top:16px;padding-top:12px;border-top:1px solid var(--batt-border);">
            ${analysis.drainByScenario
              .map(
                d => `
              <div style="background:var(--batt-card);padding:8px 12px;border-radius:6px;font-size:12px;flex:0 0 auto;">
                <span>${d.icon} ${esc(d.scenarioName)}</span>
                <span style="margin-left:6px;font-weight:bold;color:${d.isRecharge ? 'var(--batt-green)' : 'var(--batt-red)'};">
                  ${d.isRecharge ? '+' : '-'}${d.totalPercent}% (${d.totalHours}h)
                </span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>

      <!-- Bottom: Scenarios and Daily Schedule -->
      <div class="bottom-grid">
        <!-- Scenario Coefficients Editor -->
        <section class="section-panel">
          <h3>
            <span>⚙️ 社交场景耗电系数设置 (%/小时)</span>
            <span style="font-size:12px;color:var(--batt-muted);font-weight:normal;">拖动实时重算</span>
          </h3>
          <div class="scenarios-list">
            ${scenarios
              .map(
                sc => `
              <div class="scenario-row">
                <div class="sc-header">
                  <span class="sc-name">${sc.icon} ${esc(sc.name)}</span>
                  <span class="sc-val" style="color:${sc.drainPerHour < 0 ? 'var(--batt-red)' : 'var(--batt-green)'}">
                    ${sc.drainPerHour > 0 ? '+' : ''}${sc.drainPerHour}% / h
                  </span>
                </div>
                <input type="range" class="sc-slider" data-scid="${sc.id}" 
                       min="${sc.isRecharge ? 5 : -80}" 
                       max="${sc.isRecharge ? 60 : -5}" 
                       value="${sc.drainPerHour}" />
                <div class="sc-desc">${esc(sc.description)}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </section>

        <!-- Daily Schedule Planner -->
        <section class="section-panel">
          <h3>
            <span>📅 今日社交日程排期 (${schedule.length} 项)</span>
            <button class="btn-secondary" id="btnQuickAdd" style="font-size:12px;padding:4px 10px;">+ 添加日程</button>
          </h3>
          <div class="schedule-list">
            ${
              schedule.length > 0
                ? schedule
                    .map(ev => {
                      const sc = scenarios.find(s => s.id === ev.scenarioId);
                      return `
                  <div class="event-card">
                    <div class="event-info">
                      <div class="event-time">🕒 ${ev.startTime} (${ev.durationMinutes} 分钟) · ${sc ? sc.icon : '📌'} ${sc ? esc(sc.name) : '事件'}</div>
                      <div class="event-title">${esc(ev.title)}</div>
                      <div class="event-notes">${esc(ev.notes || '无附加备注')}</div>
                    </div>
                    <button class="btn-del-ev" data-evid="${ev.id}" title="删除此日程">✕</button>
                  </div>
                `;
                    })
                    .join('')
                : `<div style="font-size:13px;color:var(--batt-muted);">今日暂无社交日程安排，电量基本保持满格。</div>`
            }
          </div>
        </section>
      </div>

      <!-- Add Event Modal -->
      ${
        isAddModalOpen
          ? `
        <div class="modal-overlay" id="addEventModal">
          <div class="modal-content">
            <h3 style="font-size:18px;margin-bottom:16px;">➕ 添加今日社交日程</h3>
            
            <div class="form-group">
              <label>日程名称：</label>
              <input type="text" class="form-input" id="evTitleInput" placeholder="例如：跨部门对接周会" />
            </div>

            <div class="form-group">
              <label>所属社交场景类型：</label>
              <select class="form-select" id="evScenarioSelect">
                ${scenarios.map(s => `<option value="${s.id}">${s.icon} ${esc(s.name)} (${s.drainPerHour > 0 ? '+' : ''}${s.drainPerHour}%/h)</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>开始时间 (HH:MM)：</label>
              <input type="time" class="form-input" id="evStartTimeInput" value="15:00" />
            </div>

            <div class="form-group">
              <label>持续时长 (分钟)：</label>
              <input type="number" class="form-input" id="evDurationInput" value="60" min="15" max="360" step="15" />
            </div>

            <div class="form-group">
              <label>备注说明：</label>
              <input type="text" class="form-input" id="evNotesInput" placeholder="例如：人数较多需多说话" />
            </div>

            <div class="modal-actions">
              <button class="btn-secondary" id="btnCancelAdd">取消</button>
              <button class="btn-primary" id="btnConfirmAdd">确认加入日程</button>
            </div>
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  // Attach handlers
  container.querySelector('#btnResetDefaults')?.addEventListener('click', handlers.onResetDefaults);
  container.querySelector('#btnOpenAddModal')?.addEventListener('click', onOpenAddModal);
  container.querySelector('#btnQuickAdd')?.addEventListener('click', onOpenAddModal);

  const thresholdSlider = container.querySelector('#thresholdSlider') as HTMLInputElement;
  if (thresholdSlider) {
    thresholdSlider.addEventListener('input', () => {
      handlers.onThresholdChange(parseInt(thresholdSlider.value, 10));
    });
  }

  // Sliders for scenarios
  container.querySelectorAll('.sc-slider').forEach(slider => {
    slider.addEventListener('input', e => {
      const target = e.target as HTMLInputElement;
      const scId = target.getAttribute('data-scid');
      if (scId) {
        handlers.onUpdateScenarioDrain(scId, parseInt(target.value, 10));
      }
    });
  });

  // Delete event
  container.querySelectorAll('.btn-del-ev').forEach(btn => {
    btn.addEventListener('click', () => {
      const evId = btn.getAttribute('data-evid');
      if (evId) handlers.onRemoveEvent(evId);
    });
  });

  // Modal events
  if (isAddModalOpen) {
    container.querySelector('#btnCancelAdd')?.addEventListener('click', onCloseAddModal);
    container.querySelector('#addEventModal')?.addEventListener('click', e => {
      if (e.target === container.querySelector('#addEventModal')) onCloseAddModal();
    });

    container.querySelector('#btnConfirmAdd')?.addEventListener('click', () => {
      const title = (container.querySelector('#evTitleInput') as HTMLInputElement).value.trim();
      const scId = (container.querySelector('#evScenarioSelect') as HTMLSelectElement).value;
      const startTime = (container.querySelector('#evStartTimeInput') as HTMLInputElement).value;
      const duration = parseInt((container.querySelector('#evDurationInput') as HTMLInputElement).value, 10);
      const notes = (container.querySelector('#evNotesInput') as HTMLInputElement).value.trim();

      if (!title) {
        alert('请输入日程名称');
        return;
      }

      handlers.onAddEvent({
        id: `ev-${Date.now()}`,
        title,
        scenarioId: scId,
        startTime: startTime || '12:00',
        durationMinutes: isNaN(duration) ? 60 : Math.max(0, duration),
        notes
      });
      onCloseAddModal();
    });
  }
}
