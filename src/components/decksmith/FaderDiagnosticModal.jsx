import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  X, 
  Cpu, 
  HelpCircle 
} from 'lucide-react';
import VerticalSlider from './VerticalSlider';
import { 
  evaluatePhysicalPoint, 
  evaluateMidiPoint, 
  TEST_CASES, 
  analyzeSequenceMonotonicity,
  physicalToUiPos
} from '@/lib/decksmith/faderSimulationModel';

export default function FaderDiagnosticModal({ open, onClose, defaultChannel = 'A' }) {
  const [channel, setChannel] = useState(defaultChannel);
  const [mode, setMode] = useState('interactive'); // 'interactive' | 'hardware' | 'testsuite'
  
  // Current simulated state (0..10 physical scale)
  const [physicalPos, setPhysicalPos] = useState(8.57); // default 0 dB unity
  const [sweepActive, setSweepActive] = useState(false);
  const sweepIntervalRef = useRef(null);

  // Hardware MIDI sequence testing state
  const [hardwareLog, setHardwareLog] = useState([
    { cc: 0, time: '0.00s' },
    { cc: 15, time: '0.20s' },
    { cc: 32, time: '0.40s' },
    { cc: 64, time: '0.80s' },
    { cc: 96, time: '1.20s' },
    { cc: 127, time: '1.60s' }
  ]);
  const [customCcInput, setCustomCcInput] = useState('');

  // Test suite results
  const [testResults, setTestResults] = useState(null);

  // Motion history for jitter detection
  const [motionHistory, setMotionHistory] = useState([]);

  useEffect(() => {
    setChannel(defaultChannel);
  }, [defaultChannel]);

  useEffect(() => {
    return () => {
      if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
    };
  }, []);

  if (!open) return null;

  const currentEval = evaluatePhysicalPoint(physicalPos);

  const handleSliderMove = newUiPos => {
    // newUiPos: 0 (top) to 1 (bottom)
    const newPhysical = (1 - newUiPos) * 10;
    setPhysicalPos(newPhysical);

    setMotionHistory(prev => {
      const item = { physical: Number(newPhysical.toFixed(2)), timestamp: Date.now() };
      const next = [...prev.slice(-20), item];
      return next;
    });
  };

  // Run auto sweep simulation
  const startSweep = (direction = 'up') => {
    if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
    setSweepActive(true);
    let curr = direction === 'up' ? 0 : 10;
    setPhysicalPos(curr);

    sweepIntervalRef.current = setInterval(() => {
      curr = direction === 'up' ? curr + 0.2 : curr - 0.2;
      if (curr > 10 || curr < 0) {
        clearInterval(sweepIntervalRef.current);
        sweepIntervalRef.current = null;
        setSweepActive(false);
        return;
      }
      setPhysicalPos(Number(curr.toFixed(2)));
    }, 40);
  };

  const stopSweep = () => {
    if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
    sweepIntervalRef.current = null;
    setSweepActive(false);
  };

  // Execute standard test cases
  const runTestSuite = () => {
    const results = TEST_CASES.map(tc => {
      const evaluation = evaluatePhysicalPoint(tc.inputPhysical);
      const midiPass = Math.abs(evaluation.midiCc - tc.expectedMidi) <= tc.tolerance;
      const volPass = Math.abs(evaluation.volume - tc.expectedVol) <= 0.05;
      const passed = midiPass && volPass;

      return {
        ...tc,
        actualMidi: evaluation.midiCc,
        actualVol: evaluation.volume,
        actualGain: evaluation.gain,
        actualDb: evaluation.db,
        passed,
        diffMidi: evaluation.midiCc - tc.expectedMidi
      };
    });

    setTestResults(results);
    setMode('testsuite');
  };

  const handleAddHardwareMidi = () => {
    const num = parseInt(customCcInput, 10);
    if (isNaN(num) || num < 0 || num > 127) return;

    const entry = { cc: num, time: new Date().toLocaleTimeString() };
    setHardwareLog(prev => [...prev.slice(-15), entry]);
    setPhysicalPos((num / 127) * 10);
    setCustomCcInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg border border-[#515a63] bg-[#171b1f] text-[#eee1c6] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#30373e] px-4 py-3">
          <div className="flex items-center gap-2">
            <Cpu className="text-amber-400" size={18} />
            <h2 className="text-sm font-bold tracking-wider text-amber-400 uppercase">
              СИМУЛАЦИЯ И ДИАГНОСТИКА: CH {channel} FADER
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-[#515a63] bg-[#0d1013] p-0.5">
              <button
                onClick={() => setChannel('A')}
                className={`px-2 py-0.5 text-xs font-bold rounded ${channel === 'A' ? 'bg-[#ff2800] text-white' : 'text-stone-400'}`}
              >
                CH A
              </button>
              <button
                onClick={() => setChannel('B')}
                className={`px-2 py-0.5 text-xs font-bold rounded ${channel === 'B' ? 'bg-[#ff2800] text-white' : 'text-stone-400'}`}
              >
                CH B
              </button>
            </div>
            <button onClick={onClose} className="rounded p-1 text-stone-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#30373e] bg-[#121518] px-4 text-xs font-bold">
          <button
            onClick={() => setMode('interactive')}
            className={`border-b-2 px-3 py-2 ${mode === 'interactive' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
          >
            1. ИНТЕРАКТИВНО СРАВНЕНИЕ (0–10)
          </button>
          <button
            onClick={() => setMode('hardware')}
            className={`border-b-2 px-3 py-2 ${mode === 'hardware' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
          >
            2. ХАРДУЕРНА MIDI СЛЕДА
          </button>
          <button
            onClick={() => { runTestSuite(); setMode('testsuite'); }}
            className={`border-b-2 px-3 py-2 ${mode === 'testsuite' ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
          >
            3. ТЕСТОВ ПЛАН (TEST CASES)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: INTERACTIVE SIMULATION */}
          {mode === 'interactive' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Virtual Fader & Scale */}
              <div className="md:col-span-5 rounded border border-[#30373e] bg-[#0f1215] p-4 flex flex-col items-center justify-between">
                <span className="text-xs font-bold text-stone-400 mb-2">ФИЗИЧЕСКИ ХОД НА ФЕЙДЪРА</span>

                <div className="flex items-center gap-4 py-2">
                  {/* Slider Control */}
                  <div className="flex flex-col items-center">
                    <VerticalSlider
                      value={physicalToUiPos(physicalPos)}
                      onChange={handleSliderMove}
                      height={180}
                      className="border border-[#444] rounded bg-black/60"
                    />
                  </div>

                  {/* Visual Scale Marks 0..10 */}
                  <div className="flex flex-col justify-between h-[180px] font-mono text-xs font-bold">
                    <span className="text-[#ff2800]">10 — MAX (+10 dB)</span>
                    <span className="text-stone-300">9</span>
                    <span className="text-amber-400 font-extrabold">8.57 — UNITY (0 dB)</span>
                    <span className="text-stone-300">8</span>
                    <span className="text-stone-300">7</span>
                    <span className="text-stone-300">6</span>
                    <span className="text-cyan-400 font-bold">5 — MID (-25 dB)</span>
                    <span className="text-stone-300">4</span>
                    <span className="text-stone-300">3</span>
                    <span className="text-stone-300">2</span>
                    <span className="text-stone-300">1</span>
                    <span className="text-[#d5ad58]">0 — MUTE (-60 dB)</span>
                  </div>
                </div>

                {/* Sweep Controls */}
                <div className="w-full pt-3 border-t border-[#30373e] mt-2 flex justify-center gap-2">
                  <button
                    disabled={sweepActive}
                    onClick={() => startSweep('up')}
                    className="mini-button text-[11px] gap-1"
                  >
                    <ArrowUpRight size={12} /> ДВИЖЕНИЕ НАГОРЕ
                  </button>
                  <button
                    disabled={sweepActive}
                    onClick={() => startSweep('down')}
                    className="mini-button text-[11px] gap-1"
                  >
                    <ArrowDownRight size={12} /> ДВИЖЕНИЕ НАДОЛУ
                  </button>
                  {sweepActive && (
                    <button onClick={stopSweep} className="mini-button text-red-400 border-red-500">
                      СТОП
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Values & Real-time Diagnostic Matrix */}
              <div className="md:col-span-7 space-y-3">
                <div className="rounded border border-[#30373e] bg-[#0f1215] p-3 text-xs">
                  <b className="text-amber-400 block mb-2 uppercase">Текущи работни стойности:</b>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-[#171b1f] p-2 rounded border border-[#2d3339]">
                      <span className="text-stone-400 block text-[10px]">Физическа скала:</span>
                      <span className="text-base font-bold text-white font-mono">{currentEval.physical.toFixed(1)} / 10</span>
                    </div>
                    <div className="bg-[#171b1f] p-2 rounded border border-[#2d3339]">
                      <span className="text-stone-400 block text-[10px]">MIDI CC (0-127):</span>
                      <span className="text-base font-bold text-amber-400 font-mono">#{currentEval.midiCc}</span>
                    </div>
                    <div className="bg-[#171b1f] p-2 rounded border border-[#2d3339]">
                      <span className="text-stone-400 block text-[10px]">Нормализиран вход:</span>
                      <span className="text-base font-bold text-stone-200 font-mono">{currentEval.norm}</span>
                    </div>
                    <div className="bg-[#171b1f] p-2 rounded border border-[#2d3339]">
                      <span className="text-stone-400 block text-[10px]">Аудио Сила (dB):</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">{currentEval.db >= 0 ? `+${currentEval.db}` : currentEval.db} dB</span>
                    </div>
                    <div className="bg-[#171b1f] p-2 rounded border border-[#2d3339]">
                      <span className="text-stone-400 block text-[10px]">WebAudio Gain Multiplier:</span>
                      <span className="text-base font-bold text-cyan-300 font-mono">×{currentEval.gain}</span>
                    </div>
                    <div className="bg-[#171b1f] p-2 rounded border border-[#2d3339]">
                      <span className="text-stone-400 block text-[10px]">DOM Позиция:</span>
                      <span className="text-base font-bold text-stone-300 font-mono">{currentEval.uiPos}</span>
                    </div>
                  </div>
                </div>

                {/* Root Cause & Diagnostic Insight */}
                <div className="rounded border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-300">
                    <Activity size={14} /> ДИАГНОСТИЧЕН АНАЛИЗ НА НЕСТАБИЛНОСТТА:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-stone-300 text-[11px]">
                    <li>
                      <b>Линейност на скалата:</b> Скалата 0–10 е чисто пространствена (позиция на пръста). Аудио децибелите обаче са логаритмични. В кода <code>volumeDb = -60 + norm * 70</code> усилването скача рязко в горната четвърт и е почти безшумно в долната половина.
                    </li>
                    <li>
                      <b>Подскачане / нестабилност:</b> Когато хардуерът изпраща стойности през Bluetooth/USB, малки трептения от ±1 MIDI стъпка (напр. от 64 на 63) в логаритмичната зона предизвикват видимо подскачане на пикселите, ако няма хистерезис или deadband филтър.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HARDWARE SEQUENCE TEST */}
          {mode === 'hardware' && (
            <div className="space-y-3 text-xs">
              <div className="rounded border border-[#30373e] bg-[#0f1215] p-3">
                <b className="text-amber-400 block mb-1">СИМУЛАЦИЯ НА СУРОВ ХАРДУЕРЕН ВХОД (MIDI CC)</b>
                <p className="text-stone-400 mb-3 text-[11px]">
                  Въведете или тествайте последователности от MIDI сигнали от Pioneer DDJ-200, за да видите как се държи виртуалният плъзгач.
                </p>

                <div className="flex gap-2 mb-3">
                  <input
                    type="number"
                    min="0"
                    max="127"
                    placeholder="MIDI CC стойност (0-127)"
                    value={customCcInput}
                    onChange={e => setCustomCcInput(e.target.value)}
                    className="source-input w-48 text-xs text-white"
                  />
                  <button onClick={handleAddHardwareMidi} className="mini-button text-amber-300">
                    ДОБАВИ В ПОСЛЕДОВАТЕЛНОСТТА
                  </button>
                  <button onClick={() => setHardwareLog([])} className="mini-button text-stone-400">
                    ИЗЧИСТИ ИСТОРИЯТА
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#30373e] text-stone-400 font-mono">
                        <th className="py-1">ВРЕМЕ</th>
                        <th className="py-1">RAW CC</th>
                        <th className="py-1">НОРМАЛИЗИРАНА (0..1)</th>
                        <th className="py-1">ФИЗИЧЕСКА (0..10)</th>
                        <th className="py-1">СИЛА (dB)</th>
                        <th className="py-1">СТАТУС МОНОТОННОСТ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardwareLog.map((entry, idx) => {
                        const ev = evaluateMidiPoint(entry.cc);
                        const prev = idx > 0 ? evaluateMidiPoint(hardwareLog[idx - 1].cc) : null;
                        const diff = prev ? ev.midiCc - prev.midiCc : 0;
                        const isReversal = prev && Math.abs(diff) > 0 && Math.sign(diff) !== Math.sign(ev.midiCc - 64);

                        return (
                          <tr key={idx} className="border-b border-[#20252b] font-mono hover:bg-[#1c2126]">
                            <td className="py-1 text-stone-400">{entry.time}</td>
                            <td className="py-1 font-bold text-amber-300">CC #{entry.cc}</td>
                            <td className="py-1">{ev.norm}</td>
                            <td className="py-1 text-white font-bold">{ev.physical} / 10</td>
                            <td className="py-1 text-emerald-400">{ev.db} dB</td>
                            <td className="py-1">
                              {prev ? (
                                diff >= 0 ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <ArrowUpRight size={10} /> +{diff} (Гладко нагоре)
                                  </span>
                                ) : (
                                  <span className="text-cyan-400 flex items-center gap-1">
                                    <ArrowDownRight size={10} /> {diff} (Гладко надолу)
                                  </span>
                                )
                              ) : (
                                <span className="text-stone-500">Начална точка</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEST CASES & SPECIFICATION */}
          {mode === 'testsuite' && (
            <div className="space-y-3 text-xs">
              <div className="rounded border border-[#30373e] bg-[#0f1215] p-3">
                <div className="flex items-center justify-between mb-2">
                  <b className="text-amber-400 text-sm">РЕЗУЛТАТИ ОТ ТЕСТОВИЯ ПЛАН (TEST CASES)</b>
                  <button onClick={runTestSuite} className="mini-button text-amber-300">
                    <RotateCcw size={12} /> ИЗПЪЛНИ ТЕСТОВЕТЕ ОТНОВО
                  </button>
                </div>
                <p className="text-stone-400 mb-4 text-[11px]">
                  Сравнение на ключовите опорни точки между физическата скала 0–10, очаквания MIDI сигнал и звуковия децибелен диапазон:
                </p>

                <div className="space-y-2">
                  {(testResults || TEST_CASES).map(tc => {
                    const isPassed = tc.passed ?? true;
                    return (
                      <div
                        key={tc.id}
                        className={`rounded border p-3 ${isPassed ? 'border-emerald-600/40 bg-emerald-950/10' : 'border-red-600/40 bg-red-950/10'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPassed ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                              <AlertTriangle size={16} className="text-red-400" />
                            )}
                            <span className="font-bold text-white text-xs">{tc.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPassed ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                            {isPassed ? 'УСПЕШЕН ТЕСТ' : 'ОТКЛОНЕНИЕ'}
                          </span>
                        </div>
                        <p className="text-stone-300 text-[11px] mt-1">{tc.description}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-stone-800 font-mono text-[11px]">
                          <div>
                            <span className="text-stone-500 block text-[10px]">Входна позиция:</span>
                            <span className="text-white font-bold">{tc.inputPhysical} / 10</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Очакван MIDI CC:</span>
                            <span className="text-amber-400">#{tc.expectedMidi}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Очаквано dB:</span>
                            <span className="text-emerald-400">{tc.expectedDb} dB</span>
                          </div>
                          <div>
                            <span className="text-stone-500 block text-[10px]">Очакван Gain:</span>
                            <span className="text-cyan-400">×{tc.expectedGain}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#30373e] bg-[#121518] px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="text-stone-400 text-[11px]">
            Статус на модела: <b className="text-emerald-400">Изолиран симулатор активен</b>
          </span>
          <button onClick={onClose} className="mini-button px-4 py-1">
            ЗАТВОРИ
          </button>
        </div>
      </div>
    </div>
  );
}