// Translations for the MIDI Mapping Guide across all 12 supported languages
export const midiGuideTranslations = {
  bg: {
    backToStudio: 'КЪМ СТУДИОТО',
    brandSubtitle: 'Ръководство за MIDI Обучение',
    printBtn: 'ПЕЧАТ',
    downloadBtn: 'ИЗТЕГЛИ PDF',
    generating: 'ГЕНЕРИРАНЕ...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Инструкция за MIDI Обучение и Съпоставяне',
    subtitle: 'Подробно практическо ръководство за работа в екрана CREATE / EDIT',
    versionBadge: 'Версия 2.0',
    controllerNotice: 'Поддръжка на DDJ-200 и стандартни MIDI контролери',
    beforeStartTitle: 'Преди да започнете:',
    beforeStartDesc: 'Уверете се, че контролерът е включен с USB кабел или Bluetooth, преди да заредите студиото. В горната лента статусът на бутона MIDI трябва да свети в златисто със статус READY или ACTIVE.',
    step1Title: 'Как да стигнете до екрана CREATE / EDIT',
    step1Items: [
      'В главното студио на CROSSCUE натиснете бутона MIDI в горната лента с инструменти.',
      'В отворилия се панел вдясно натиснете бутона MAPPING MANAGER (горе до CLOSE).',
      'В горната лента с табове изберете CREATE / EDIT.',
      'Ако желаете да редактирате съществуващ профил (например Pioneer DDJ-200): първо отидете на таб LIBRARY, намерете профила и натиснете EDIT или CLONE. Така профилът автоматично ще се зареди в редактора CREATE / EDIT.'
    ],
    step2Title: 'Основен алгоритъм за съпоставяне на нов контрол',
    step2Desc: 'Всеки ред в таблицата представлява една MIDI връзка. Процедурата винаги следва 3 стъпки:',
    step2A: 'Стъпка А: ADD ENTRY',
    step2ADesc: 'Натиснете бутона + ADD ENTRY. Добавя се нов ред със стойности по подразбиране (напр. CH 1, CC 0).',
    step2B: 'Стъпка Б: LEARN',
    step2BDesc: 'Натиснете бутона LEARN на реда. Той светва с пулсиращ надпис WAITING FOR MIDI INPUT... Задействайте физическия контролер.',
    step2C: 'Стъпка В: ASSIGN',
    step2CDesc: 'Натиснете бутона ASSIGN на същия ред и изберете коя виртуална функция в CROSSCUE да управлява този контрол.',
    step3Title: 'Специфика при обучение на отделните видове контроли',
    buttonsTitle: 'А. БУТОНИ (Play/Pause, Cue, Sync, Loop, HotCue 1-8)',
    buttonsHow: 'Как се натиска: Натиснете LEARN на реда, след което натиснете и освободете физическия бутон на контролера еднократно и спокойно.',
    buttonsWhat: 'Какво записва системата: CROSSCUE автоматично записва събитието NOTEON (канал и номер на нота, напр. CH 1, NOTEON 11 за Play на Deck A).',
    buttonsModes: 'Режими (Mode):',
    buttonsModesList: [
      'PLAY / SYNC / LOOP / REPLAY работят в режим toggle (при всяко натискане сменят състоянието пуснато/спряно).',
      'CUE работи в специален режим momentary: задържането връща към Cue точката, а отпускането спира песента, точно като при хардуерен Pioneer плейър.',
      'HOT CUE работи като моментален скок към записана времева позиция.'
    ],
    fadersTitle: 'Б. ПЛЪЗГАЧИ И ПОТЕНЦИОМЕТРИ (Tempo/Pitch, Channel Faders, Crossfader, EQ, Filter)',
    fadersHow: 'Как се движи: Натиснете LEARN и плъзнете или завъртете съответния физически елемент на поне половината от неговия ход (например от 0 до максимум или обратно).',
    fadersWhat: 'Какво записва системата: Записва се съобщение CC (Continuous Controller) със съответния номер и режим continuous.',
    fadersAssignments: 'Важни съпоставяния (Assignments):',
    faderPitchDesc: 'TEMPO / PITCH: Изберете PITCH A или PITCH B. Посоката е автоматично калибрирана (нагоре = забързване +%, среда = 0%).',
    faderVolumeDesc: 'СИЛА НА ЗВУК: Изберете CHANNEL FADER A или CHANNEL FADER B.',
    faderCrossDesc: 'КРОСФЕЙДЪР: Изберете CROSSFADER (плавен преход от Deck A до Deck B).',
    faderEqDesc: 'ЧЕСТОТИ (EQ): Изберете съответно HIGH A/B, MID A/B или LOW A/B.',
    faderFilterDesc: 'ФИЛТЪР (CFX): Изберете FILTER A или FILTER B.',
    jogTitle: 'В. ДЖОГ КОЛЕЛА (Jog Dial / Scratch / Pitch Bend)',
    jogDesc1: 'Джог колелата на DJ контролери като Pioneer DDJ-200 не изпращат абсолютна позиция от 0 до 127, а изпращат относителни импулси (relative ticks) за посока и скорост на въртене (CC 33 / CC 34).',
    jogDesc2: 'Не съпоставяйте Jog колелото ръчно към обикновен плъзгач (напр. Pitch или Volume). Вграденият официален профил Pioneer DDJ-200 вече съдържа заводската поддръжка за енкодерите на джога.',
    step4Title: 'Ръчно въвеждане на параметри (без натискане на хардуера)',
    step4Desc: 'Ако даден контролер е трудно достъпен или искате прецизно да коригирате грешка, на всеки ред в редактора имате 3 преки полета:',
    chLabel: 'CH: MIDI Канал (от 1 до 16)',
    typeLabel: 'TYPE: CC, NOTEON или NOTEOFF',
    numLabel: 'NUM: Номер на контрола (0 до 127)',
    step5Title: 'Как да проверите дали съпоставянето работи',
    step5Items: [
      'Включете MONITOR: В горния десен ъгъл на Mapping Manager натиснете бутона MONITOR.',
      'Задействайте контрола на контролера. В монитора трябва да се изпише в зелено точното събитие и към кое виртуално действие сочи (например: CH 1 CC 32 → PITCH A).',
      'Ако мониторът показва (no match), това означава, че съобщението се получава от браузъра, но няма ред в редактора с такъв Channel и Number.',
      'Запазете профила: В дъното на редактора натиснете SAVE PROFILE. Профилът ще се съхрани локално в паметта на браузъра и ще остане активен и след рестартиране.'
    ],
    troubleTitle: 'Често срещани проблеми и решения',
    trouble1Q: 'Бутонът PLAY спира музиката веднага щом си вдигна пръста от него.',
    trouble1A: 'Уверете се, че редът е съпоставен с тип NOTEON. В CROSSCUE събитията NoteOff се игнорират за Play, така че песента да продължава да свири при пускане на бутона.',
    trouble2Q: 'Плъзгачът за TEMPO се движи наобратно.',
    trouble2A: 'Не обръщайте стойностите на ръка. Софтуерът автоматично прилага правилната ориентация при съпоставяне към PITCH A или PITCH B.',
    trouble3Q: 'Контролерът не се разпознава от браузъра.',
    trouble3A: 'Използвайте Google Chrome, Microsoft Edge, Opera или Brave с активирана поддръжка на Web MIDI API. При първо включване потвърдете разрешението "Allow MIDI devices" в адресната лента на браузъра.',
    unknownConsolesTitle: 'Настройка на непознати и ретро DJ миксери и конзоли',
    unknownConsolesSubtitle: 'Как да картографирате всяко MIDI устройство (Hercules, Numark, Reloop, Denon, Akai, Behringer, Korg и др.) стъпка по стъпка',
    unknownPointers: [
      {
        title: '1. Идентификация и свързване без предварителни драйвери',
        desc: 'Повечето съвременни и класически USB DJ миксери са "class-compliant" (работят директно без специален драйвер в браузъра). Свържете конзолата с USB кабел или MIDI-към-USB интерфейс. Влезте в Mapping Manager и вижте точното име на устройството в лентата DEVICES горе.'
      },
      {
        title: '2. Откриване на сигналите чрез MIDI MONITOR',
        desc: 'Преди да създавате привързвания, натиснете бутона MONITOR горе вдясно. Задвижете всеки фейдер, бутон или потенциометър на непознатия миксер. Мониторът ще изпише на живо входящия канал (CH 1–16), типа (CC или NOTEON) и номера на сигнала (0–127). Това ви дава пълна карта на физическите сигнали на пулта.'
      },
      {
        title: '3. Автоматично разпознаване (AUTO-DETECT) или нов профил',
        desc: 'В Mapping Manager изберете таб "⚡ AUTO-DETECT (НЕПОЗНАТА КОНЗОЛА)". Раздвижете последователно контролите на конзолата: CrossCue анализира физическия тип сигнал, предлага автоматично най-подходящите DJ функции (Play, Cue, Channel Faders, Crossfader, EQ, Jog) и ви позволява с един клик да потвърдите и запазите профила или да го експортирате като JSON.'
      },
      {
        title: '4. Нестандартни 14-bit и Relative сигнали',
        desc: 'Някои конзоли изпращат pitch фейдърите като разделени сигнали (MSB/LSB на два различни CC номера) или въртящите се енкодери като relative стъпки. Ако видите два бързи сигнала при преместване на фейдър, запишете основния CC номер (по-ниския номер обикновено управлява грубия ход).'
      },
      {
        title: '5. Експорт и архивиране на профила (EXPORT JSON)',
        desc: 'След като завършите картографирането и тествате контролите, натиснете SAVE PROFILE. След това можете да натиснете EXPORT PROFILE, за да свалите вашия готов JSON файл с настройките като резервно копие или за споделяне с други DJ-и.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Ръководство за потребителя · Всички права запазени'
  },

  en: {
    backToStudio: 'BACK TO STUDIO',
    brandSubtitle: 'MIDI Mapping Guide',
    printBtn: 'PRINT',
    downloadBtn: 'DOWNLOAD PDF',
    generating: 'GENERATING...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'MIDI Mapping & Learning Guide',
    subtitle: 'Comprehensive step-by-step instructions for the CREATE / EDIT workspace',
    versionBadge: 'Version 2.0',
    controllerNotice: 'Supports Pioneer DDJ-200 and standard MIDI controllers',
    beforeStartTitle: 'Before you begin:',
    beforeStartDesc: 'Ensure your controller is connected via USB cable or Bluetooth before opening the studio. The MIDI button in the top toolbar should glow gold with status READY or ACTIVE.',
    step1Title: 'How to access the CREATE / EDIT workspace',
    step1Items: [
      'In the main CROSSCUE studio, click the MIDI button in the top toolbar.',
      'In the panel that opens on the right, click MAPPING MANAGER (top, next to CLOSE).',
      'In the top tab bar, click CREATE / EDIT.',
      'To edit an existing profile (such as Pioneer DDJ-200): open the LIBRARY tab first, locate the profile, and click EDIT or CLONE. It will immediately load into the CREATE / EDIT editor.'
    ],
    step2Title: 'Core procedure to map a new control',
    step2Desc: 'Each row in the table represents a single MIDI binding. The procedure always follows 3 steps:',
    step2A: 'Step A: ADD ENTRY',
    step2ADesc: 'Click + ADD ENTRY. A new row will appear with default values (e.g. CH 1, CC 0).',
    step2B: 'Step B: LEARN',
    step2BDesc: 'Click LEARN on the row. It pulses with WAITING FOR MIDI INPUT... Move or press the physical control on your hardware.',
    step2C: 'Step C: ASSIGN',
    step2CDesc: 'Click ASSIGN on the same row and select which virtual function in CROSSCUE will be controlled.',
    step3Title: 'Specifics per hardware control type',
    buttonsTitle: 'A. BUTTONS (Play/Pause, Cue, Sync, Loop, HotCue 1-8)',
    buttonsHow: 'How to press: Click LEARN, then press and release the physical button once firmly and smoothly.',
    buttonsWhat: 'What the system captures: CROSSCUE captures NOTEON (channel and note number, e.g. CH 1, NOTEON 11 for Deck A Play).',
    buttonsModes: 'Modes:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP / REPLAY work in toggle mode (toggling play/stop state on each press).',
      'CUE functions in momentary mode: holding jumps to cue point, releasing pauses, exactly like Pioneer hardware players.',
      'HOT CUE triggers an instant jump to the saved cue marker.'
    ],
    fadersTitle: 'B. FADERS AND POTENTIOMETERS (Tempo/Pitch, Channel Faders, Crossfader, EQ, Filter)',
    fadersHow: 'How to move: Click LEARN and move the physical slider or knob across at least half of its travel.',
    fadersWhat: 'What the system captures: A CC (Continuous Controller) message is recorded in continuous mode.',
    fadersAssignments: 'Essential target assignments:',
    faderPitchDesc: 'TEMPO / PITCH: Select PITCH A or PITCH B. Pitch orientation is auto-calibrated (up = +% faster, center = 0%).',
    faderVolumeDesc: 'VOLUME FADER: Select CHANNEL FADER A or CHANNEL FADER B.',
    faderCrossDesc: 'CROSSFADER: Select CROSSFADER (smooth crossfade between Deck A and Deck B).',
    faderEqDesc: 'EQUALIZER (EQ): Select HIGH A/B, MID A/B, or LOW A/B.',
    faderFilterDesc: 'FILTER (CFX): Select FILTER A or FILTER B.',
    jogTitle: 'C. JOG WHEELS (Jog Dial / Scratch / Pitch Bend)',
    jogDesc1: 'Jog wheels on controllers like Pioneer DDJ-200 do not send an absolute 0-127 position, but relative tick pulses for rotation direction and velocity (CC 33 / CC 34).',
    jogDesc2: 'Do not assign the jog wheel manually to standard faders (like Pitch or Volume). The built-in official Pioneer DDJ-200 profile already includes native jog encoder support.',
    step4Title: 'Manual parameter input (without moving hardware)',
    step4Desc: 'If a control is hard to trigger or you want to fix an entry manually, use the three input fields on each row:',
    chLabel: 'CH: MIDI Channel (1 to 16)',
    typeLabel: 'TYPE: CC, NOTEON, or NOTEOFF',
    numLabel: 'NUM: Control / Note number (0 to 127)',
    step5Title: 'How to verify that your mapping works',
    step5Items: [
      'Open MONITOR: Click MONITOR in the top-right corner of the Mapping Manager.',
      'Move or press the control. The monitor displays the incoming message and the target action in green (e.g. CH 1 CC 32 → PITCH A).',
      'If the monitor says (no match), a message arrived from the browser, but no entry with that Channel and Number exists yet.',
      'Save your profile: Click SAVE PROFILE at the bottom. The profile is saved in browser storage and stays active across sessions.'
    ],
    troubleTitle: 'Troubleshooting & Common Questions',
    trouble1Q: 'PLAY button stops playback as soon as I release my finger.',
    trouble1A: 'Ensure the entry is set to NOTEON. In CROSSCUE, NoteOff events are ignored for Play so playback keeps running after releasing the button.',
    trouble2Q: 'The TEMPO fader moves in reverse direction.',
    trouble2A: 'Do not invert values manually. CROSSCUE applies the standard DJ fader orientation automatically when assigned to PITCH A or PITCH B.',
    trouble3Q: 'Controller is not detected by browser.',
    trouble3A: 'Use Google Chrome, Microsoft Edge, Opera, or Brave with Web MIDI enabled. Allow the "Allow MIDI devices" prompt in the URL bar when prompted.',
    unknownConsolesTitle: 'Configuring Unfamiliar and Vintage DJ Mixers & Consoles',
    unknownConsolesSubtitle: 'How to map any arbitrary MIDI hardware (Hercules, Numark, Reloop, Denon, Akai, Behringer, Korg, etc.) step-by-step',
    unknownPointers: [
      {
        title: '1. Device Identification & Plug-and-Play Connection',
        desc: 'Most modern and classic USB DJ mixers are class-compliant (they communicate via standard MIDI without manufacturer drivers in Web MIDI browsers). Connect the hardware with a USB cable or USB-MIDI adapter. Open Mapping Manager and verify that the device name appears in the top DEVICES bar.'
      },
      {
        title: '2. Signal Discovery via the MIDI MONITOR',
        desc: 'Before creating entries, click MONITOR in the top right. Move or press each hardware control on your unknown mixer. The monitor displays real-time input: channel (CH 1–16), type (CC or NOTEON), and control number (0–127). This reveals the full hardware signal layout of your console.'
      },
      {
        title: '3. Intelligent Auto-Detection (AUTO-DETECT) or Manual Profile',
        desc: 'In Mapping Manager, select the "⚡ AUTO-DETECT" tab. Move controls on your unknown mixer: CrossCue automatically analyzes signal signatures (faders, EQ knobs, buttons, jog rotation), suggests matching DJ functions with confidence ratings, and lets you confirm and save directly into My Mappings or export to JSON.'
      },
      {
        title: '4. Handling Dual 14-bit or Relative Encoders',
        desc: 'Certain hardware consoles transmit pitch faders across two linked CC numbers (MSB/LSB for 14-bit resolution) or endless knobs as relative increments. When two messages trigger simultaneously on a fader movement, bind the primary CC number (usually the lower value).'
      },
      {
        title: '5. Saving, Testing & Profile Export (EXPORT JSON)',
        desc: 'Once your essential controls are mapped and tested with audio, click SAVE PROFILE. You can then click EXPORT PROFILE to download the complete mapping configuration as a portable JSON file for backup or community sharing.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · User Documentation · All rights reserved'
  },

  de: {
    backToStudio: 'ZUM STUDIO',
    brandSubtitle: 'MIDI Mapping Anleitung',
    printBtn: 'DRUCKEN',
    downloadBtn: 'PDF HERUNTERLADEN',
    generating: 'WIRD ERSTELLT...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Anleitung für MIDI-Mapping & Einlernen',
    subtitle: 'Detaillierte Schritt-für-Schritt-Anleitung für den Bereich CREATE / EDIT',
    versionBadge: 'Version 2.0',
    controllerNotice: 'Unterstützt DDJ-200 und Standard-MIDI-Controller',
    beforeStartTitle: 'Bevor du beginnst:',
    beforeStartDesc: 'Stelle sicher, dass dein Controller über USB oder Bluetooth verbunden ist, bevor du das Studio startest. Die MIDI-Schaltfläche in der oberen Leiste sollte goldfarben mit READY oder ACTIVE leuchten.',
    step1Title: 'So gelangst du zum Bereich CREATE / EDIT',
    step1Items: [
      'Klicke im CROSSCUE-Hauptstudio auf die Schaltfläche MIDI in der oberen Leiste.',
      'Klicke im rechten Bedienfeld auf MAPPING MANAGER (oben neben CLOSE).',
      'Wähle in der oberen Registerkartenleiste CREATE / EDIT.',
      'Um ein bestehendes Profil zu bearbeiten (z. B. Pioneer DDJ-200): Öffne zuerst LIBRARY, suche das Profil und klicke auf EDIT oder CLONE.'
    ],
    step2Title: 'Grundlegendes Verfahren zum Zuweisen eines neuen Reglers',
    step2Desc: 'Jede Zeile in der Tabelle stellt eine MIDI-Verbindung dar. Der Ablauf folgt immer 3 Schritten:',
    step2A: 'Schritt A: ADD ENTRY',
    step2ADesc: 'Klicke auf + ADD ENTRY. Eine neue Zeile mit Standardwerten (z. B. CH 1, CC 0) wird hinzugefügt.',
    step2B: 'Schritt B: LEARN',
    step2BDesc: 'Klicke auf LEARN. Die Anzeige blinkt mit WAITING FOR MIDI INPUT... Betätige das physische Steuerelement.',
    step2C: 'Schritt C: ASSIGN',
    step2CDesc: 'Klicke auf ASSIGN in derselben Zeile und wähle die gewünschte CROSSCUE-Funktion aus.',
    step3Title: 'Besonderheiten der verschiedenen Reglertypen',
    buttonsTitle: 'A. TASTEN (Play/Pause, Cue, Sync, Loop, HotCue 1-8)',
    buttonsHow: 'Bedienung: Klicke auf LEARN und drücke die Taste am Controller einmal ruhig und vollständig.',
    buttonsWhat: 'Was erfasst wird: CROSSCUE speichert NOTEON (Kanal und Notennummer, z. B. CH 1, NOTEON 11 für Deck A Play).',
    buttonsModes: 'Modi:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP / REPLAY arbeiten im Toggle-Modus (Umschalten bei jedem Druck).',
      'CUE arbeitet im Momentary-Modus: Halten springt zum Cue-Punkt, Loslassen pausiert.',
      'HOT CUE springt sofort zum gespeicherten Marker.'
    ],
    fadersTitle: 'B. FADER & DREHREGLER (Tempo/Pitch, Kanal-Fader, Crossfader, EQ, Filter)',
    fadersHow: 'Bedienung: Klicke auf LEARN und bewege den Fader oder Regler über mindestens die Hälfte des Regelwegs.',
    fadersWhat: 'Was erfasst wird: Eine CC-Nachricht im Modus continuous.',
    fadersAssignments: 'Wichtige Zuweisungen:',
    faderPitchDesc: 'TEMPO / PITCH: Wähle PITCH A oder PITCH B. Die Fader-Richtung ist automatisch kalibriert.',
    faderVolumeDesc: 'LAUTSTÄRKE: Wähle CHANNEL FADER A oder CHANNEL FADER B.',
    faderCrossDesc: 'CROSSFADER: Wähle CROSSFADER für weiche Übergänge.',
    faderEqDesc: 'EQ: Wähle HIGH A/B, MID A/B oder LOW A/B.',
    faderFilterDesc: 'FILTER (CFX): Wähle FILTER A oder FILTER B.',
    jogTitle: 'C. JOG-WHEELS (Jog Dial / Scratch / Pitch Bend)',
    jogDesc1: 'Jogwheels senden keine absoluten Werte von 0 bis 127, sondern relative Ticks für Drehrichtung und Geschwindigkeit (CC 33 / CC 34).',
    jogDesc2: 'Weise das Jogwheel nicht manuell Standardfadern zu. Das offizielle Pioneer DDJ-200 Profil enthält bereits die native Unterstützung.',
    step4Title: 'Manuelle Parametereingabe',
    step4Desc: 'Falls ein Regler manuell angepasst werden soll, nutze die drei Eingabefelder:',
    chLabel: 'CH: MIDI-Kanal (1 bis 16)',
    typeLabel: 'TYPE: CC, NOTEON oder NOTEOFF',
    numLabel: 'NUM: Steuernummer (0 bis 127)',
    step5Title: 'Funktionsprüfung',
    step5Items: [
      'MONITOR aktivieren: Klicke oben rechts auf MONITOR.',
      'Regler betätigen: Der Monitor zeigt das Ereignis grün an (z. B. CH 1 CC 32 → PITCH A).',
      'Erscheint (no match), ist noch kein passender Eintrag für diesen Kanal und Nummer vorhanden.',
      'Profil speichern: Klicke unten auf SAVE PROFILE.'
    ],
    troubleTitle: 'Häufige Fragen & Lösungen',
    trouble1Q: 'PLAY stoppt sofort beim Loslassen.',
    trouble1A: 'Achte darauf, dass NOTEON zugewiesen ist. CROSSCUE ignoriert NoteOff für Play.',
    trouble2Q: 'Tempo-Fader läuft verkehrt herum.',
    trouble2A: 'Keine manuelle Umkehrung nötig; CROSSCUE kalibriert PITCH A und B automatisch.',
    trouble3Q: 'Controller wird nicht erkannt.',
    trouble3A: 'Nutze Chrome, Edge, Opera oder Brave und bestätige die Berechtigung für MIDI-Geräte.',
    unknownConsolesTitle: 'Einrichtung unbekannter und Vintage DJ-Mixer & Konsolen',
    unknownConsolesSubtitle: 'Schritt-für-Schritt-Anleitung für jedes beliebige MIDI-Gerät (Hercules, Numark, Reloop, Denon, Akai, Behringer usw.)',
    unknownPointers: [
      {
        title: '1. Geräteerkennung und Plug-and-Play Verbindung',
        desc: 'Die meisten USB-DJ-Mixer sind class-compliant und funktionieren ohne Herstellertreiber direkt im Web-MIDI-Browser. Schließe die Konsole an und prüfe, ob der Gerätename oben im Mapping Manager unter DEVICES erscheint.'
      },
      {
        title: '2. Signal-Erkennung über den MIDI MONITOR',
        desc: 'Aktiviere oben rechts MONITOR. Bewege Regler und Tasten am unbekannten Mischpult: Der Monitor zeigt live Kanal (CH), Typ (CC/NOTEON) und Nummer (0–127) an.'
      },
      {
        title: '3. Neues Profil anlegen (CREATE / EDIT)',
        desc: 'Gib unter CREATE / EDIT einen Profilnamen ein und weise die wichtigsten Kernfunktionen zu: Fader, Crossfader, Play, Cue, EQ und Pitch über + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. Besonderheiten bei 14-Bit und Relative-Encodern',
        desc: 'Einige Konsolen senden Pitch-Fader über zwei CC-Befehle (MSB/LSB). Weise in diesem Fall die primäre Haupt-CC-Nummer zu.'
      },
      {
        title: '5. Profil speichern und als JSON exportieren',
        desc: 'Nach dem erfolgreichen Test klicke auf SAVE PROFILE und bei Bedarf auf EXPORT PROFILE für ein portables Backup.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Benutzerhandbuch · Alle Rechte vorbehalten'
  },

  es: {
    backToStudio: 'VOLVER AL ESTUDIO',
    brandSubtitle: 'Guía de Mapeo MIDI',
    printBtn: 'IMPRIMIR',
    downloadBtn: 'DESCARGAR PDF',
    generating: 'GENERANDO...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Guía de Mapeo y Aprendizaje MIDI',
    subtitle: 'Instrucciones paso a paso para el espacio de trabajo CREATE / EDIT',
    versionBadge: 'Versión 2.0',
    controllerNotice: 'Compatible con DDJ-200 y controladores MIDI estándar',
    beforeStartTitle: 'Antes de comenzar:',
    beforeStartDesc: 'Asegúrate de que tu controlador esté conectado por USB o Bluetooth antes de abrir el estudio. El botón MIDI en la barra superior debe brillar en dorado con estado READY o ACTIVE.',
    step1Title: 'Cómo acceder a CREATE / EDIT',
    step1Items: [
      'En el estudio de CROSSCUE, haz clic en el botón MIDI en la barra superior.',
      'En el panel lateral derecho, haz clic en MAPPING MANAGER.',
      'En las pestañas superiores, selecciona CREATE / EDIT.',
      'Para editar un perfil existente (como Pioneer DDJ-200), ve primero a LIBRARY y pulsa EDIT o CLONE.'
    ],
    step2Title: 'Procedimiento básico para mapear un control',
    step2Desc: 'Cada fila representa una conexión MIDI. El proceso sigue 3 pasos:',
    step2A: 'Paso A: ADD ENTRY',
    step2ADesc: 'Pulsa + ADD ENTRY para añadir una fila con valores por defecto.',
    step2B: 'Paso B: LEARN',
    step2BDesc: 'Pulsa LEARN. El indicador parpadeará con WAITING FOR MIDI INPUT... Acciona el control físico.',
    step2C: 'Paso C: ASSIGN',
    step2CDesc: 'Pulsa ASSIGN en la misma fila y selecciona la función virtual en CROSSCUE.',
    step3Title: 'Especificaciones por tipo de control',
    buttonsTitle: 'A. BOTONES (Play/Pause, Cue, Sync, Loop, HotCue 1-8)',
    buttonsHow: 'Cómo pulsar: Haz clic en LEARN y presiona el botón físico una vez con firmeza.',
    buttonsWhat: 'Qué captura el sistema: Mensajes NOTEON (canal y nota).',
    buttonsModes: 'Modos:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP / REPLAY funcionan en modo toggle.',
      'CUE funciona en modo momentary: mantener presionado va al punto Cue y soltar pausa.',
      'HOT CUE salta instantáneamente al marcador guardado.'
    ],
    fadersTitle: 'B. FADERS Y POTENCIÓMETROS (Tempo, Faders, Crossfader, EQ, Filtro)',
    fadersHow: 'Cómo mover: Pulsa LEARN y desliza o gira el control al menos la mitad de su recorrido.',
    fadersWhat: 'Qué captura el sistema: Mensajes CC continuos.',
    fadersAssignments: 'Asignaciones clave:',
    faderPitchDesc: 'TEMPO / PITCH: Selecciona PITCH A o B (dirección auto-calibrada).',
    faderVolumeDesc: 'VOLUMEN: Selecciona CHANNEL FADER A o B.',
    faderCrossDesc: 'CROSSFADER: Selecciona CROSSFADER.',
    faderEqDesc: 'EQ: Selecciona HIGH, MID o LOW A/B.',
    faderFilterDesc: 'FILTRO: Selecciona FILTER A o B.',
    jogTitle: 'C. JOG WHEELS',
    jogDesc1: 'Los Jog wheels envían pulsos relativos de rotación (CC 33 / 34), no valores absolutos 0-127.',
    jogDesc2: 'No asignes el Jog wheel a faders estándar. El perfil oficial DDJ-200 ya incluye soporte nativo.',
    step4Title: 'Entrada manual de parámetros',
    step4Desc: 'Puedes introducir valores directamente sin mover el hardware:',
    chLabel: 'CH: Canal MIDI (1 a 16)',
    typeLabel: 'TYPE: CC, NOTEON o NOTEOFF',
    numLabel: 'NUM: Número de control (0 a 127)',
    step5Title: 'Cómo verificar el mapeo',
    step5Items: [
      'Activa MONITOR en la esquina superior derecha.',
      'Mueve el control: se mostrará en verde la acción asignada.',
      'Si muestra (no match), aún no existe una fila para ese canal y número.',
      'Guarda con SAVE PROFILE abajo.'
    ],
    troubleTitle: 'Preguntas Frecuentes',
    trouble1Q: 'PLAY se detiene al soltar el botón.',
    trouble1A: 'Asegúrate de que el tipo sea NOTEON. CROSSCUE ignora NoteOff para Play.',
    trouble2Q: 'El control de TEMPO va al revés.',
    trouble2A: 'No inviertas valores; CROSSCUE ajusta automáticamente la orientación para PITCH.',
    trouble3Q: 'El controlador no es detectado.',
    trouble3A: 'Usa Chrome, Edge, Opera o Brave con Web MIDI habilitado.',
    unknownConsolesTitle: 'Configuración de Mezcladores y Consolas DJ Desconocidos o Vintage',
    unknownConsolesSubtitle: 'Cómo mapear cualquier dispositivo MIDI (Hercules, Numark, Reloop, Denon, Akai, Behringer, etc.) paso a paso',
    unknownPointers: [
      {
        title: '1. Reconocimiento de dispositivo y conexión directa',
        desc: 'La mayoría de mezcladores USB son "class-compliant" y funcionan sin controladores especiales. Conecta el dispositivo y comprueba que aparece en Mapping Manager bajo DEVICES.'
      },
      {
        title: '2. Detección de señales mediante MIDI MONITOR',
        desc: 'Abre MONITOR arriba a la derecha y mueve los faders y botones de tu consola desconocida para ver en vivo el canal (CH), tipo (CC/NOTEON) y número (NUM).'
      },
      {
        title: '3. Creación de un nuevo perfil personalizado (CREATE / EDIT)',
        desc: 'Introduce un nombre descriptivo en CREATE / EDIT y asigna primero los controles clave: Faders de canal, Crossfader, Play, Cue, EQ y Pitch con + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. Faders de 14 bits o codificadores relativos',
        desc: 'Si un fader envía dos códigos simultáneos (MSB/LSB), asigna el número de control principal (CC más bajo).'
      },
      {
        title: '5. Guardar y exportar perfil (EXPORT JSON)',
        desc: 'Pulsa SAVE PROFILE para conservar los cambios y usa EXPORT PROFILE para descargar tu mapeo en formato JSON portátil.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Documentación de Usuario · Todos los derechos reservados'
  },

  fr: {
    backToStudio: 'RETOUR AU STUDIO',
    brandSubtitle: 'Guide de Mappage MIDI',
    printBtn: 'IMPRIMER',
    downloadBtn: 'TÉLÉCHARGER LE PDF',
    generating: 'GÉNÉRATION...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Guide de Mappage et d’Apprentissage MIDI',
    subtitle: 'Instructions complètes pas à pas pour l’espace CREATE / EDIT',
    versionBadge: 'Version 2.0',
    controllerNotice: 'Compatible DDJ-200 et contrôleurs MIDI standard',
    beforeStartTitle: 'Avant de commencer :',
    beforeStartDesc: 'Vérifiez que votre contrôleur est branché en USB ou Bluetooth avant d’ouvrir le studio. Le bouton MIDI doit être allumé en doré avec READY ou ACTIVE.',
    step1Title: 'Accéder à CREATE / EDIT',
    step1Items: [
      'Dans CROSSCUE, cliquez sur le bouton MIDI dans la barre d’outils supérieure.',
      'Dans le panneau de droite, cliquez sur MAPPING MANAGER.',
      'Dans les onglets, sélectionnez CREATE / EDIT.',
      'Pour modifier un profil existant (ex. Pioneer DDJ-200), ouvrez LIBRARY puis cliquez sur EDIT ou CLONE.'
    ],
    step2Title: 'Procédure de mappage d’un contrôle',
    step2Desc: 'Chaque ligne correspond à une liaison MIDI en 3 étapes :',
    step2A: 'Étape A : ADD ENTRY',
    step2ADesc: 'Cliquez sur + ADD ENTRY pour créer une nouvelle ligne.',
    step2B: 'Étape B : LEARN',
    step2BDesc: 'Cliquez sur LEARN, puis actionnez la commande physique.',
    step2C: 'Étape C : ASSIGN',
    step2CDesc: 'Cliquez sur ASSIGN et choisissez la fonction virtuelle correspondante.',
    step3Title: 'Spécificités par type de commande',
    buttonsTitle: 'A. BOUTONS (Play, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Action : Cliquez sur LEARN et appuyez franchement une fois sur le bouton physique.',
    buttonsWhat: 'Capture : Message NOTEON (canal et note).',
    buttonsModes: 'Modes :',
    buttonsModesList: [
      'PLAY / SYNC / LOOP fonctionnent en mode toggle.',
      'CUE fonctionne en mode momentary (relâcher met en pause).',
      'HOT CUE saute immédiatement au point repère.'
    ],
    fadersTitle: 'B. FADERS ET POTENTIOMÈTRES (Tempo, Volume, Crossfader, EQ, Filtre)',
    fadersHow: 'Action : Cliquez sur LEARN et déplacez la commande sur au moins la moitié de sa course.',
    fadersWhat: 'Capture : Messages CC continus.',
    fadersAssignments: 'Assignations clés :',
    faderPitchDesc: 'TEMPO : Choisissez PITCH A ou B (orientation calibrée).',
    faderVolumeDesc: 'VOLUME : Choisissez CHANNEL FADER A ou B.',
    faderCrossDesc: 'CROSSFADER : Choisissez CROSSFADER.',
    faderEqDesc: 'EQ : Choisissez HIGH, MID ou LOW A/B.',
    faderFilterDesc: 'FILTRE : Choisissez FILTER A ou B.',
    jogTitle: 'C. MOLETTES JOG WHEEL',
    jogDesc1: 'Les jog wheels envoient des impulsions relatives (CC 33 / 34), et non des valeurs absolues 0-127.',
    jogDesc2: 'N’assignez pas le jog wheel à des faders classiques. Le profil officiel DDJ-200 intègre déjà la gestion native.',
    step4Title: 'Saisie manuelle des paramètres',
    step4Desc: 'Champs manuels disponibles par ligne :',
    chLabel: 'CH : Canal MIDI (1 à 16)',
    typeLabel: 'TYPE : CC, NOTEON ou NOTEOFF',
    numLabel: 'NUM : Numéro (0 à 127)',
    step5Title: 'Vérification du fonctionnement',
    step5Items: [
      'Activez MONITOR en haut à droite.',
      'Actionnez le contrôle : l’action apparaît en vert.',
      'Enregistrez avec SAVE PROFILE en bas.'
    ],
    troubleTitle: 'Dépannage',
    trouble1Q: 'PLAY s’arrête dès que je relâche le bouton.',
    trouble1A: 'Vérifiez que le type est NOTEON. NoteOff est ignoré pour Play.',
    trouble2Q: 'Le tempo bouge à l’envers.',
    trouble2A: 'Aucune inversion requise, CROSSCUE calibre automatiquement PITCH.',
    trouble3Q: 'Le contrôleur n’est pas détecté.',
    trouble3A: 'Utilisez Chrome, Edge, Opera ou Brave avec Web MIDI activé.',
    unknownConsolesTitle: 'Configuration des Mixeurs et Consoles DJ Inconnus ou Vintage',
    unknownConsolesSubtitle: 'Comment mapper n’importe quel contrôleur MIDI (Hercules, Numark, Reloop, Denon, Akai, etc.) étape par étape',
    unknownPointers: [
      {
        title: '1. Identification et branchement Plug-and-Play',
        desc: 'La plupart des contrôleurs USB sont class-compliant et reconnus sans pilote. Branchez le contrôleur et vérifiez sa détection dans DEVICES.'
      },
      {
        title: '2. Découverte des signaux via MIDI MONITOR',
        desc: 'Activez MONITOR en haut à droite. Actionnez chaque commande pour visualiser le canal (CH), le type (CC/NOTEON) et le numéro (NUM).'
      },
      {
        title: '3. Création d’un profil sur mesure (CREATE / EDIT)',
        desc: 'Donnez un nom au profil et configurez d’abord les éléments essentiels : faders de volume, crossfader, Play, Cue, EQ et pitch avec + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. Gestion des faders 14-bit et encodeurs relatifs',
        desc: 'Si un fader émet deux signaux simultanés, associez le numéro CC principal (généralement le plus petit).'
      },
      {
        title: '5. Enregistrement et exportation (EXPORT JSON)',
        desc: 'Cliquez sur SAVE PROFILE pour enregistrer, puis sur EXPORT PROFILE pour obtenir votre fichier JSON réutilisable.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Guide Utilisateur · Tous droits réservés'
  },

  it: {
    backToStudio: 'TORNA ALLO STUDIO',
    brandSubtitle: 'Guida Mappatura MIDI',
    printBtn: 'STAMPA',
    downloadBtn: 'SCARICA PDF',
    generating: 'GENERAZIONE...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Guida alla Mappatura e Apprendimento MIDI',
    subtitle: 'Istruzioni dettagliate per l’area CREATE / EDIT',
    versionBadge: 'Versione 2.0',
    controllerNotice: 'Supporta DDJ-200 e controller MIDI standard',
    beforeStartTitle: 'Prima di iniziare:',
    beforeStartDesc: 'Assicurati che il controller sia collegato prima di aprire lo studio. Il pulsante MIDI deve risultare dorato con READY o ACTIVE.',
    step1Title: 'Come accedere a CREATE / EDIT',
    step1Items: [
      'Nello studio di CROSSCUE clicca su MIDI in alto.',
      'Nel pannello laterale clicca su MAPPING MANAGER.',
      'Seleziona CREATE / EDIT.',
      'Per modificare un profilo esistente (come Pioneer DDJ-200), aprilo da LIBRARY con EDIT o CLONE.'
    ],
    step2Title: 'Procedura di base per mappare un controllo',
    step2Desc: 'Ogni riga corrisponde a un comando MIDI in 3 passaggi:',
    step2A: 'Passo A: ADD ENTRY',
    step2ADesc: 'Clicca su + ADD ENTRY per creare una nuova riga.',
    step2B: 'Passo B: LEARN',
    step2BDesc: 'Clicca su LEARN e muovi il controllo fisico.',
    step2C: 'Passo C: ASSIGN',
    step2CDesc: 'Clicca su ASSIGN e scegli la funzione virtuale in CROSSCUE.',
    step3Title: 'Specifiche per tipologia di controllo',
    buttonsTitle: 'A. PULSANTI (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Azione: Clicca su LEARN e premi il tasto fisico una sola volta con decisione.',
    buttonsWhat: 'Cattura: Messaggi NOTEON.',
    buttonsModes: 'Modalità:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP funzionano in modalità toggle.',
      'CUE funziona in modalità momentary.',
      'HOT CUE salta subito al marcatore salvato.'
    ],
    fadersTitle: 'B. FADER E MANOPOLE (Tempo, Fader canale, Crossfader, EQ, Filtro)',
    fadersHow: 'Azione: Clicca su LEARN e muovi il fader per almeno metà corsa.',
    fadersWhat: 'Cattura: Messaggi CC continui.',
    fadersAssignments: 'Assegnazioni principali:',
    faderPitchDesc: 'TEMPO: Assegna a PITCH A o B (orientamento calibrato).',
    faderVolumeDesc: 'VOLUME: Assegna a CHANNEL FADER A o B.',
    faderCrossDesc: 'CROSSFADER: Assegna a CROSSFADER.',
    faderEqDesc: 'EQ: Assegna a HIGH, MID o LOW A/B.',
    faderFilterDesc: 'FILTRO: Assegna a FILTER A o B.',
    jogTitle: 'C. JOG WHEELS',
    jogDesc1: 'Le jog wheel trasmettono impulsi relativi (CC 33 / 34), non posizioni assolute 0-127.',
    jogDesc2: 'Non assegnare il jog a fader normali. Il profilo ufficiale DDJ-200 include già il supporto nativo.',
    step4Title: 'Inserimento manuale dei parametri',
    step4Desc: 'Campi modificabili direttamente:',
    chLabel: 'CH: Canale MIDI (1 a 16)',
    typeLabel: 'TYPE: CC, NOTEON o NOTEOFF',
    numLabel: 'NUM: Numero controllo (0 a 127)',
    step5Title: 'Verifica del funzionamento',
    step5Items: [
      'Attiva MONITOR in alto a destra.',
      'Muovi il controllo per vedere la corrispondenza in verde.',
      'Salva con SAVE PROFILE in basso.'
    ],
    troubleTitle: 'Risoluzione problemi',
    trouble1Q: 'PLAY si ferma appena rilascio il tasto.',
    trouble1A: 'Verifica che il tipo sia NOTEON. NoteOff viene ignorato per Play.',
    trouble2Q: 'Il cursore TEMPO si muove al contrario.',
    trouble2A: 'CROSSCUE applica automaticamente l’orientamento corretto per PITCH.',
    trouble3Q: 'Il controller non viene rilevato.',
    trouble3A: 'Usa Chrome, Edge, Opera o Brave con Web MIDI abilitato.',
    unknownConsolesTitle: 'Configurazione di Mixer e Console DJ Sconosciuti o Vintage',
    unknownConsolesSubtitle: 'Come mappare qualsiasi controller MIDI (Hercules, Numark, Reloop, Denon, Akai, Behringer, ecc.) passo dopo passo',
    unknownPointers: [
      {
        title: '1. Riconoscimento del dispositivo e connessione Plug-and-Play',
        desc: 'La maggior parte dei mixer USB è "class-compliant" e funziona senza driver nel browser con Web MIDI. Collega la console e verifica il nome in alto su DEVICES.'
      },
      {
        title: '2. Rilevamento segnali tramite MIDI MONITOR',
        desc: 'Attiva MONITOR in alto a destra e muovi manopole, tasti e fader: vedrai apparire in tempo reale Canale (CH), Tipo (CC/NOTEON) e Numero (NUM).'
      },
      {
        title: '3. Creazione di un nuovo profilo personalizzato (CREATE / EDIT)',
        desc: 'Inserisci un nome per la tua console in CREATE / EDIT e assegna per primi i controlli fondamentali (Fader canale, Crossfader, Play, Cue, EQ e Pitch) con + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. Fader a 14-bit ed encoder rotativi relativi',
        desc: 'Se un fader genera due messaggi contemporanei (MSB/LSB), associa il numero CC principale (solitamente il valore più basso).'
      },
      {
        title: '5. Salvataggio ed esportazione del profilo (EXPORT JSON)',
        desc: 'Fai clic su SAVE PROFILE per rendere permanente la configurazione ed EXPORT PROFILE per salvare una copia di backup portatile in formato JSON.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Manuale Utente · Tutti i diritti riservati'
  },

  nl: {
    backToStudio: 'TERUG NAAR STUDIO',
    brandSubtitle: 'MIDI Mapping Handleiding',
    printBtn: 'AFDRUKKEN',
    downloadBtn: 'DOWNLOAD PDF',
    generating: 'GENEREREN...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Handleiding MIDI Mapping & Inleren',
    subtitle: 'Stapsgewijze instructies voor het CREATE / EDIT werkgebied',
    versionBadge: 'Versie 2.0',
    controllerNotice: 'Ondersteunt DDJ-200 en standaard MIDI-controllers',
    beforeStartTitle: 'Voordat je begint:',
    beforeStartDesc: 'Zorg dat je controller aangesloten is voordat je de studio opent. De MIDI-knop moet goud branden met READY of ACTIVE.',
    step1Title: 'Navigeren naar CREATE / EDIT',
    step1Items: [
      'Klik in de CROSSCUE-studio op MIDI in de bovenste werkbalk.',
      'Klik in het rechterpaneel op MAPPING MANAGER.',
      'Kies het tabblad CREATE / EDIT.',
      'Om een bestaand profiel te bewerken, open LIBRARY en klik op EDIT of CLONE.'
    ],
    step2Title: 'Basisprocedure om een knop of schuif in te leren',
    step2Desc: 'Elke rij vormt één MIDI-koppeling in 3 stappen:',
    step2A: 'Stap A: ADD ENTRY',
    step2ADesc: 'Klik op + ADD ENTRY om een nieuwe regel toe te voegen.',
    step2B: 'Stap B: LEARN',
    step2BDesc: 'Klik op LEARN en beweeg het fysieke onderdeel op je controller.',
    step2C: 'Stap C: ASSIGN',
    step2CDesc: 'Klik op ASSIGN en kies de gewenste functie in CROSSCUE.',
    step3Title: 'Specificaties per type bedieningselement',
    buttonsTitle: 'A. KNOPPEN (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Bediening: Klik op LEARN en druk de knop eenmaal rustig in.',
    buttonsWhat: 'Vastgelegd: NOTEON berichten.',
    buttonsModes: 'Modi:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP werken in toggle-modus.',
      'CUE werkt in momentary-modus.',
      'HOT CUE springt direct naar het markerpunt.'
    ],
    fadersTitle: 'B. SCHUIFREGELAARS & DRAAIKNOPPEN (Tempo, Faders, Crossfader, EQ, Filter)',
    fadersHow: 'Bediening: Klik op LEARN en beweeg de schuif over minstens de helft van het bereik.',
    fadersWhat: 'Vastgelegd: Continue CC-berichten.',
    fadersAssignments: 'Belangrijke toewijzingen:',
    faderPitchDesc: 'TEMPO: Wijs toe aan PITCH A of B (automatisch gekalibreerd).',
    faderVolumeDesc: 'VOLUME: Wijs toe aan CHANNEL FADER A of B.',
    faderCrossDesc: 'CROSSFADER: Wijs toe aan CROSSFADER.',
    faderEqDesc: 'EQ: Wijs toe aan HIGH, MID of LOW A/B.',
    faderFilterDesc: 'FILTER: Wijs toe aan FILTER A of B.',
    jogTitle: 'C. JOG WHEELS',
    jogDesc1: 'Jog wheels sturen relatieve pulsen (CC 33 / 34), geen absolute 0-127 standen.',
    jogDesc2: 'Koppel het jog wheel niet aan gewone faders. Het officiële DDJ-200 profiel bevat al standaard ondersteuning.',
    step4Title: 'Handmatige parameterinvoer',
    step4Desc: 'Gebruik de velden CH, TYPE en NUM voor directe aanpassing.',
    chLabel: 'CH: MIDI-kanaal (1 tot 16)',
    typeLabel: 'TYPE: CC, NOTEON of NOTEOFF',
    numLabel: 'NUM: Controllernummer (0 tot 127)',
    step5Title: 'Werking controleren',
    step5Items: [
      'Schakel MONITOR in rechtsboven.',
      'Beweeg de regelaar: de actie verschijnt groen.',
      'Sla op met SAVE PROFILE onderaan.'
    ],
    troubleTitle: 'Veelgestelde Vragen',
    trouble1Q: 'PLAY stopt zodra ik loslaat.',
    trouble1A: 'Controleer of het type NOTEON is.',
    trouble2Q: 'Tempo fader beweegt verkeerd om.',
    trouble2A: 'CROSSCUE kalibreert de richting automatisch.',
    trouble3Q: 'Controller wordt niet herkend.',
    trouble3A: 'Gebruik Chrome, Edge, Opera of Brave met Web MIDI actief.',
    unknownConsolesTitle: 'Configuratie van onbekende en vintage DJ-mixers & consoles',
    unknownConsolesSubtitle: 'Stapsgewijze instructies voor elk MIDI-apparaat (Hercules, Numark, Reloop, Denon, Akai, Behringer, etc.)',
    unknownPointers: [
      {
        title: '1. Apparaatherkenning en directe verbinding',
        desc: 'De meeste USB-mixers zijn class-compliant en functioneren zonder drivers in de browser. Sluit de console aan en controleer of de naam in de balk DEVICES verschijnt.'
      },
      {
        title: '2. Signalen ontdekken via de MIDI MONITOR',
        desc: 'Schakel rechtsboven MONITOR in. Beweeg de faders en knoppen van de onbekende mixer om direct kanaal (CH), type (CC/NOTEON) en nummer (NUM) af te lezen.'
      },
      {
        title: '3. Een nieuw aangepast profiel starten (CREATE / EDIT)',
        desc: 'Geef in CREATE / EDIT een herkenbare naam op en wijs eerst de basisbediening toe: kanaalfaders, crossfader, Play, Cue, EQ en Pitch via + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. 14-bits faders en relatieve encoders',
        desc: 'Als een fader twee gekoppelde CC-signalen stuurt, koppel dan het primaire (meestal lagere) CC-nummer.'
      },
      {
        title: '5. Opslaan en exporteren naar JSON (EXPORT JSON)',
        desc: 'Klik na het testen op SAVE PROFILE en gebruik EXPORT PROFILE om een draagbaar JSON-back-upbestand te downloaden.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Gebruikershandleiding · Alle rechten voorbehouden'
  },

  sr: {
    backToStudio: 'NAZAD U STUDIO',
    brandSubtitle: 'Vodič za MIDI mapiranje',
    printBtn: 'ŠTAMPAJ',
    downloadBtn: 'PREUZMI PDF',
    generating: 'GENERISANJE...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Vodič za MIDI mapiranje i učenje',
    subtitle: 'Detaljna uputstva za rad u CREATE / EDIT panelu',
    versionBadge: 'Verzija 2.0',
    controllerNotice: 'Podrška za DDJ-200 i standardne MIDI kontrolere',
    beforeStartTitle: 'Pre nego što počnete:',
    beforeStartDesc: 'Proverite da li je kontroler povezan pre pokretanja studija. Dugme MIDI treba da svetli zlatno sa statusom READY ili ACTIVE.',
    step1Title: 'Kako doći do CREATE / EDIT ekrana',
    step1Items: [
      'U CROSSCUE studiju kliknite na dugme MIDI na gornjoj traci.',
      'U panelu sa desne strane kliknite na MAPPING MANAGER.',
      'Izaberite tab CREATE / EDIT.',
      'Za izmenu postojećeg profila (npr. DDJ-200), otvorite LIBRARY i kliknite EDIT ili CLONE.'
    ],
    step2Title: 'Osnovni postupak mapiranja',
    step2Desc: 'Svaki red predstavlja jednu MIDI vezu u 3 koraka:',
    step2A: 'Korak A: ADD ENTRY',
    step2ADesc: 'Kliknite + ADD ENTRY za dodavanje novog reda.',
    step2B: 'Korak B: LEARN',
    step2BDesc: 'Kliknite LEARN i pomerite fizičku kontrolu na hardveru.',
    step2C: 'Korak C: ASSIGN',
    step2CDesc: 'Kliknite ASSIGN i izaberite virtuelnu funkciju u CROSSCUE.',
    step3Title: 'Specifičnosti prema vrsti kontrola',
    buttonsTitle: 'A. TASTERI (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Pritisnite LEARN, a zatim jednom pritisnite fizički taster.',
    buttonsWhat: 'Snima se NOTEON poruka.',
    buttonsModes: 'Režimi:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP rade u toggle režimu.',
      'CUE radi u momentary režimu.',
      'HOT CUE odmah skače na snimljenu poziciju.'
    ],
    fadersTitle: 'B. POTEZNICI I POTENCIOMETRI (Tempo, Faderi, Crossfader, EQ, Filter)',
    fadersHow: 'Pritisnite LEARN i pomerite kontrolu najmanje do polovine.',
    fadersWhat: 'Snima se kontinuirana CC poruka.',
    fadersAssignments: 'Glavna mapiranja:',
    faderPitchDesc: 'TEMPO: Izaberite PITCH A ili B (automatski kalibrisan smer).',
    faderVolumeDesc: 'JAČINA: Izaberite CHANNEL FADER A ili B.',
    faderCrossDesc: 'CROSSFADER: Izaberite CROSSFADER.',
    faderEqDesc: 'EQ: Izaberite HIGH, MID ili LOW A/B.',
    faderFilterDesc: 'FILTER: Izaberite FILTER A ili B.',
    jogTitle: 'C. JOG TOČKOVI',
    jogDesc1: 'Jog točkovi šalju relativne impulse (CC 33 / 34), a ne fiksne vrednosti 0-127.',
    jogDesc2: 'Nemojte dodeljivati jog običnim faderima. Zvanični DDJ-200 profil već sadrži fabričku podršku.',
    step4Title: 'Ručni unos parametara',
    step4Desc: 'Možete direktno uneti CH, TYPE i NUM na svakom redu.',
    chLabel: 'CH: MIDI kanal (1 do 16)',
    typeLabel: 'TYPE: CC, NOTEON ili NOTEOFF',
    numLabel: 'NUM: Broj kontrole (0 do 127)',
    step5Title: 'Provera rada',
    step5Items: [
      'Uključite MONITOR u gornjem desnom uglu.',
      'Pomerite kontrolu i proverite zeleni ispis.',
      'Sačuvajte profil sa SAVE PROFILE na dnu.'
    ],
    troubleTitle: 'Česta pitanja',
    trouble1Q: 'PLAY se zaustavlja čim pustim prst.',
    trouble1A: 'Proverite da li je tip postavljen na NOTEON.',
    trouble2Q: 'Tempo se kreće u suprotnom smeru.',
    trouble2A: 'CROSSCUE automatski primenjuje ispravan smer za PITCH.',
    trouble3Q: 'Kontroler se ne prepoznaje.',
    trouble3A: 'Koristite Chrome, Edge, Opera ili Brave sa omogućenim Web MIDI-jem.',
    unknownConsolesTitle: 'Podešavanje nepoznatih i retro DJ mikseta i konzola',
    unknownConsolesSubtitle: 'Korak-po-korak uputstvo za bilo koji MIDI uređaj (Hercules, Numark, Reloop, Denon, Akai, Behringer, itd.)',
    unknownPointers: [
      {
        title: '1. Prepoznavanje uređaja i Plug-and-Play povezivanje',
        desc: 'Većina USB mikseta je "class-compliant" i radi bez posebnih drajvera. Povežite konzolu i proverite da li se ime uređaja pojavljuje gore u traci DEVICES.'
      },
      {
        title: '2. Otkrivanje signala putem MIDI MONITOR-a',
        desc: 'Uključite MONITOR u gornjem desnom uglu. Pomerajte feydere i tastere na nepoznatoj mikseti kako biste odmah videli kanal (CH), tip (CC/NOTEON) i broj (NUM).'
      },
      {
        title: '3. Kreiranje novog korisničkog profila (CREATE / EDIT)',
        desc: 'Upišite ime konzole u CREATE / EDIT i prvo povežite osnovne kontrole: Channel Faders, Crossfader, Play, Cue, EQ i Pitch preko + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. 14-bitni faderi i relativni enkoderi',
        desc: 'Ako fader pošalje dva signala istovremeno, dodelite primarni (obično niži) CC broj.'
      },
      {
        title: '5. Čuvanje i izvoz u JSON (EXPORT JSON)',
        desc: 'Kliknite SAVE PROFILE za trajno čuvanje i EXPORT PROFILE da biste preuzeli rezervnu kopiju podešavanja.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Uputstvo za upotrebu · Sva prava zadržana'
  },

  ru: {
    backToStudio: 'В СТУДИЮ',
    brandSubtitle: 'Руководство по MIDI-маппингу',
    printBtn: 'ПЕЧАТЬ',
    downloadBtn: 'СКАЧАТЬ PDF',
    generating: 'ГЕНЕРАЦИЯ...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Инструкция по MIDI-маппингу и обучению',
    subtitle: 'Подробное пошаговое руководство для режима CREATE / EDIT',
    versionBadge: 'Версия 2.0',
    controllerNotice: 'Поддержка DDJ-200 и стандартных MIDI-контроллеров',
    beforeStartTitle: 'Перед началом работы:',
    beforeStartDesc: 'Убедитесь, что контроллер подключен по USB или Bluetooth перед открытием студии. Кнопка MIDI на панели должна светиться золотым со статусом READY или ACTIVE.',
    step1Title: 'Как открыть экран CREATE / EDIT',
    step1Items: [
      'В основном интерфейсе CROSSCUE нажмите кнопку MIDI в верхней панели.',
      'В открывшейся панели справа нажмите MAPPING MANAGER.',
      'В верхней строке вкладок выберите CREATE / EDIT.',
      'Чтобы отредактировать существующий профиль (например, Pioneer DDJ-200), перейдите во вкладку LIBRARY и нажмите EDIT или CLONE.'
    ],
    step2Title: 'Основной алгоритм назначения элементов',
    step2Desc: 'Каждая строка таблицы задает одну MIDI-привязку за 3 шага:',
    step2A: 'Шаг А: ADD ENTRY',
    step2ADesc: 'Нажмите + ADD ENTRY для добавления новой строки.',
    step2B: 'Шаг Б: LEARN',
    step2BDesc: 'Нажмите кнопку LEARN и задействуйте физический регулятор на контроллере.',
    step2C: 'Шаг В: ASSIGN',
    step2CDesc: 'Нажмите ASSIGN в этой же строке и выберите действие в CROSSCUE.',
    step3Title: 'Особенности для разных типов контролов',
    buttonsTitle: 'А. КНОПКИ (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Нажатие: Нажмите LEARN и один раз плавно нажмите нужную кнопку.',
    buttonsWhat: 'Запись: Сообщение NOTEON (канал и номер ноты).',
    buttonsModes: 'Режимы:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP работают в режиме toggle (переключение состояния).',
      'CUE работает в режиме momentary: удержание возвращает к точке Cue, отпускание останавливает.',
      'HOT CUE мгновенно переходит к сохраненной метке.'
    ],
    fadersTitle: 'Б. ФЕЙДЕРЫ И РЕГУЛЯТОРЫ (Tempo, Faders, Crossfader, EQ, Filter)',
    fadersHow: 'Движение: Нажмите LEARN и переместите фейдер минимум на половину хода.',
    fadersWhat: 'Запись: Непрерывные сообщения CC (Continuous Controller).',
    fadersAssignments: 'Основные назначения:',
    faderPitchDesc: 'TEMPO: Выберите PITCH A или B (направление откалибровано автоматически).',
    faderVolumeDesc: 'ГРОМКОСТЬ: Выберите CHANNEL FADER A или B.',
    faderCrossDesc: 'КРОССФЕЙДЕР: Выберите CROSSFADER.',
    faderEqDesc: 'ЭКВАЛАЙЗЕР: Выберите HIGH, MID или LOW A/B.',
    faderFilterDesc: 'ФИЛЬТР: Выберите FILTER A или B.',
    jogTitle: 'В. ДЖОГ-ДИСКИ (Jog Wheel)',
    jogDesc1: 'Джоги контроллеров передают относительные импульсы вращения (CC 33 / 34), а не абсолютную шкалу 0-127.',
    jogDesc2: 'Не назначайте джог на обычные фейдеры. Официальный профиль DDJ-200 уже содержит встроенную поддержку.',
    step4Title: 'Ручной ввод параметров',
    step4Desc: 'Вы можете вручную задать поля CH (канал 1-16), TYPE (тип) и NUM (номер 0-127).',
    chLabel: 'CH: MIDI-канал (1–16)',
    typeLabel: 'TYPE: CC, NOTEON или NOTEOFF',
    numLabel: 'NUM: Номер контрола (0–127)',
    step5Title: 'Проверка работы',
    step5Items: [
      'Включите MONITOR в правом верхнем углу.',
      'Пошевелите контрол: действие отобразится зеленым цветом.',
      'Сохраните профиль кнопкой SAVE PROFILE внизу.'
    ],
    troubleTitle: 'Частые вопросы и решения',
    trouble1Q: 'Музыка останавливается сразу при отпускании PLAY.',
    trouble1A: 'Убедитесь, что выбран тип NOTEON. В CROSSCUE события NoteOff игнорируются для воспроизведения.',
    trouble2Q: 'Фейдер TEMPO движется в обратную сторону.',
    trouble2A: 'CROSSCUE автоматически применяет правильное направление для PITCH.',
    trouble3Q: 'Контроллер не виден в браузере.',
    trouble3A: 'Используйте Chrome, Edge, Opera или Brave с включенным Web MIDI.',
    unknownConsolesTitle: 'Настройка неизвестных и винтажных DJ-микшеров и консолей',
    unknownConsolesSubtitle: 'Пошаговая инструкция для любых MIDI-устройств (Hercules, Numark, Reloop, Denon, Akai, Behringer и др.)',
    unknownPointers: [
      {
        title: '1. Распознавание устройства и Plug-and-Play подключение',
        desc: 'Большинство USB DJ-пультов соответствуют стандарту class-compliant и работают без драйверов. Подключите пульт и убедитесь, что имя устройства появилось в строке DEVICES.'
      },
      {
        title: '2. Определение сигналов через MIDI MONITOR',
        desc: 'Включите MONITOR вверху справа и пошевелите фейдеры и кнопки на неизвестном микшере: в окне отобразятся канал (CH), тип (CC/NOTEON) и номер (NUM).'
      },
      {
        title: '3. Создание чистого профиля (CREATE / EDIT)',
        desc: 'Задайте имя в CREATE / EDIT и назначьте основные функции (фейдеры громкости, кроссфейдер, Play, Cue, EQ, Pitch) с помощью + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. 14-битные фейдеры и относительные энкодеры',
        desc: 'Если регулятор посылает два CC-сообщения (MSB/LSB), привяжите основной (обычно меньший) номер CC.'
      },
      {
        title: '5. Сохранение и экспорт профиля в JSON (EXPORT JSON)',
        desc: 'Нажмите SAVE PROFILE для сохранения и EXPORT PROFILE для создания файла резервной копии.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Руководство пользователя · Все права защищены'
  },

  ro: {
    backToStudio: 'ÎNAPOI LA STUDIO',
    brandSubtitle: 'Ghid Mapare MIDI',
    printBtn: 'TIPĂRIRE',
    downloadBtn: 'DESCĂRCARE PDF',
    generating: 'GENERARE...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Ghid de Mapare și Învățare MIDI',
    subtitle: 'Instrucțiuni pas cu pas pentru secțiunea CREATE / EDIT',
    versionBadge: 'Versiunea 2.0',
    controllerNotice: 'Suport pentru DDJ-200 și controllere MIDI standard',
    beforeStartTitle: 'Înainte de a începe:',
    beforeStartDesc: 'Asigurați-vă că controllerul este conectat prin USB sau Bluetooth înainte de a deschide studioul. Butonul MIDI trebuie să fie auriu cu statusul READY sau ACTIVE.',
    step1Title: 'Cum accesați ecranul CREATE / EDIT',
    step1Items: [
      'În studioul CROSSCUE apăsați butonul MIDI din bara de sus.',
      'În panoul din dreapta apăsați MAPPING MANAGER.',
      'Selectați fila CREATE / EDIT.',
      'Pentru a edita un profil existent, deschideți LIBRARY și apăsați EDIT sau CLONE.'
    ],
    step2Title: 'Procedura de bază pentru mapare',
    step2Desc: 'Fiecare rând reprezintă o legătură MIDI parcursă în 3 pași:',
    step2A: 'Pasul A: ADD ENTRY',
    step2ADesc: 'Apăsați + ADD ENTRY pentru a adăuga un nou rând.',
    step2B: 'Pasul B: LEARN',
    step2BDesc: 'Apăsați LEARN și acționați comanda fizică de pe controller.',
    step2C: 'Pasul C: ASSIGN',
    step2CDesc: 'Apăsați ASSIGN și alegeți funcția virtuală din CROSSCUE.',
    step3Title: 'Instrucțiuni pentru fiecare tip de control',
    buttonsTitle: 'A. BUTOANE (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Apăsați LEARN, apoi apăsați o singură dată butonul fizic.',
    buttonsWhat: 'Se înregistrează mesajul NOTEON.',
    buttonsModes: 'Moduri:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP funcționează în mod toggle.',
      'CUE funcționează în mod momentary.',
      'HOT CUE sare instant la marcajul salvat.'
    ],
    fadersTitle: 'B. FADERE ȘI POTENȚIOMETRE (Tempo, Fader Canal, Crossfader, EQ, Filtru)',
    fadersHow: 'Apăsați LEARN și deplasați comanda pe cel puțin jumătate din cursă.',
    fadersWhat: 'Se înregistrează mesaje CC continue.',
    fadersAssignments: 'Mapări recomandate:',
    faderPitchDesc: 'TEMPO: Atribuiți la PITCH A sau B (direcție calibrată automat).',
    faderVolumeDesc: 'VOLUM: Atribuiți la CHANNEL FADER A sau B.',
    faderCrossDesc: 'CROSSFADER: Atribuiți la CROSSFADER.',
    faderEqDesc: 'EQ: Atribuiți la HIGH, MID sau LOW A/B.',
    faderFilterDesc: 'FILTRU: Atribuiți la FILTER A sau B.',
    jogTitle: 'C. JOG WHEELS',
    jogDesc1: 'Discurile Jog trimit impulsuri relative (CC 33 / 34), nu valori fixe 0-127.',
    jogDesc2: 'Nu atribuiți jog-ul faderelor simple. Profilul oficial DDJ-200 include deja suport nativ.',
    step4Title: 'Introducere manuală a parametrilor',
    step4Desc: 'Puteți introduce direct valorile CH (1-16), TYPE și NUM (0-127).',
    chLabel: 'CH: Canal MIDI (1 la 16)',
    typeLabel: 'TYPE: CC, NOTEON sau NOTEOFF',
    numLabel: 'NUM: Număr control (0 la 127)',
    step5Title: 'Verificarea funcționării',
    step5Items: [
      'Porniți MONITOR în colțul din dreapta sus.',
      'Mişcați controlul pentru a vedea confirmarea cu verde.',
      'Salvați cu SAVE PROFILE în partea de jos.'
    ],
    troubleTitle: 'Întrebări frecvente',
    trouble1Q: 'PLAY se oprește când ridic degetul.',
    trouble1A: 'Asigurați-vă că tipul este NOTEON. CROSSCUE ignoră NoteOff pentru Play.',
    trouble2Q: 'Glisorul de TEMPO merge invers.',
    trouble2A: 'CROSSCUE calibrează automat orientarea pentru PITCH.',
    trouble3Q: 'Controllerul nu este detectat.',
    trouble3A: 'Folosiți Chrome, Edge, Opera sau Brave cu suport Web MIDI activ.',
    unknownConsolesTitle: 'Configurarea mixerelor și consolelor DJ necunoscute sau vintage',
    unknownConsolesSubtitle: 'Ghid pas cu pas pentru orice echipament MIDI (Hercules, Numark, Reloop, Denon, Akai, Behringer etc.)',
    unknownPointers: [
      {
        title: '1. Recunoașterea dispozitivului și conectare Plug-and-Play',
        desc: 'Majoritatea mixerelor USB sunt class-compliant și funcționează fără drivere suplimentare. Conectați consola și verificați apariția numelui în bara DEVICES.'
      },
      {
        title: '2. Descoperirea semnalelor prin MIDI MONITOR',
        desc: 'Porniți MONITOR în colțul din dreapta sus și acționați controalele de pe consola necunoscută pentru a vedea canalul (CH), tipul (CC/NOTEON) și numărul (NUM).'
      },
      {
        title: '3. Crearea unui profil nou (CREATE / EDIT)',
        desc: 'Introduceți un nume de profil în CREATE / EDIT și începeți cu funcțiile de bază: fadere de canal, crossfader, Play, Cue, EQ și pitch cu + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. Fadere pe 14 biți și encodere relative',
        desc: 'Dacă un fader generează două mesaje simultane, asociați numărul CC principal (de regulă valoarea mai mică).'
      },
      {
        title: '5. Salvarea și exportul profilului (EXPORT JSON)',
        desc: 'Apăsați SAVE PROFILE pentru salvare locală și EXPORT PROFILE pentru a descărca fișierul JSON de configurare.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Manual de Utilizare · Toate drepturile rezervate'
  },

  tr: {
    backToStudio: 'STÜDYOYA DÖN',
    brandSubtitle: 'MIDI Eşleme Rehberi',
    printBtn: 'YAZDIR',
    downloadBtn: 'PDF İNDİR',
    generating: 'OLUŞTURULUYOR...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'MIDI Eşleme ve Öğrenme Rehberi',
    subtitle: 'CREATE / EDIT ekranı için adım adım kapsamlı kullanım talimatları',
    versionBadge: 'Sürüm 2.0',
    controllerNotice: 'Pioneer DDJ-200 ve standart MIDI denetleyicilerini destekler',
    beforeStartTitle: 'Başlamadan önce:',
    beforeStartDesc: 'Stüdyoyu açmadan önce denetleyicinizin USB veya Bluetooth ile bağlı olduğundan emin olun. Üst çubuktaki MIDI butonu READY veya ACTIVE olarak sarı yanmalıdır.',
    step1Title: 'CREATE / EDIT ekranına nasıl ulaşılır?',
    step1Items: [
      'CROSSCUE stüdyosunda üst araç çubuğundaki MIDI butonuna tıklayın.',
      'Açılan yan panelde MAPPING MANAGER butonuna tıklayın.',
      'Üst sekmelerden CREATE / EDIT seçeneğini seçin.',
      'Mevcut bir profili (ör. DDJ-200) düzenlemek için önce LIBRARY sekmesinden EDIT veya CLONE seçin.'
    ],
    step2Title: 'Yeni bir kontrolü eşleme adımları',
    step2Desc: 'Her satır 3 adımda tamamlanan bir MIDI bağlantısını temsil eder:',
    step2A: 'Adım A: ADD ENTRY',
    step2ADesc: '+ ADD ENTRY butonuna tıklayarak yeni bir satır ekleyin.',
    step2B: 'Adım B: LEARN',
    step2BDesc: 'Satırdaki LEARN butonuna tıklayın ve cihazınızdaki fiziksel kontrolü hareket ettirin.',
    step2C: 'Adım C: ASSIGN',
    step2CDesc: 'Aynı satırdaki ASSIGN butonuna tıklayarak CROSSCUE içindeki sanal işlevi seçin.',
    step3Title: 'Kontrol türlerine göre detaylar',
    buttonsTitle: 'A. BUTONLAR (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Basma: LEARN butonuna tıkladıktan sonra fiziksel düğmeye bir kez net şekilde basın.',
    buttonsWhat: 'Yakalanan: NOTEON mesajları (kanal ve nota).',
    buttonsModes: 'Modlar:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP butonları toggle (aç/kapa) modunda çalışır.',
      'CUE butonu momentary modunda çalışır: basılı tutunca Cue noktasına gider, bırakınca durur.',
      'HOT CUE kaydedilen noktaya anında atlar.'
    ],
    fadersTitle: 'B. SÜRGÜLER VE POTLAR (Tempo, Ses Faderları, Crossfader, EQ, Filtre)',
    fadersHow: 'Hareket: LEARN butonuna tıklayıp sürgüyü en az yarı yol hareket ettirin.',
    fadersWhat: 'Yakalanan: Sürekli CC mesajları.',
    fadersAssignments: 'Temel atamalar:',
    faderPitchDesc: 'TEMPO: PITCH A veya B seçin (yön otomatik kalibre edilmiştir).',
    faderVolumeDesc: 'SES: CHANNEL FADER A veya B seçin.',
    faderCrossDesc: 'CROSSFADER: CROSSFADER seçin.',
    faderEqDesc: 'EQ: HIGH, MID veya LOW A/B seçin.',
    faderFilterDesc: 'FİLTRE: FILTER A veya B seçin.',
    jogTitle: 'C. JOG WHEEL (Plak Tekerlekleri)',
    jogDesc1: 'Jog tekerlekleri 0-127 mutlak değer değil, bağıl dönüş darbeleri (CC 33 / 34) gönderir.',
    jogDesc2: 'Jog tekerleğini standart faderlara bağlamayın. Resmi DDJ-200 profili zaten yerel desteğe sahiptir.',
    step4Title: 'Manuel Parametre Girişi',
    step4Desc: 'CH (kanal 1-16), TYPE ve NUM (0-127) değerlerini doğrudan el ile girebilirsiniz.',
    chLabel: 'CH: MIDI Kanalı (1 - 16)',
    typeLabel: 'TYPE: CC, NOTEON veya NOTEOFF',
    numLabel: 'NUM: Kontrol Numarası (0 - 127)',
    step5Title: 'Çalışmanın Doğrulanması',
    step5Items: [
      'Sağ üst köşedeki MONITOR butonuna tıklayın.',
      'Kontrolü hareket ettirdiğinizde yeşil eşleşme yazısını kontrol edin.',
      'Alttaki SAVE PROFILE ile kaydedin.'
    ],
    troubleTitle: 'Sık Karşılaşılan Sorunlar',
    trouble1Q: 'PLAY butonunu bırakınca müzik duruyor.',
    trouble1A: 'Türün NOTEON olduğundan emin olun.',
    trouble2Q: 'TEMPO sürgüsü ters yönde çalışıyor.',
    trouble2A: 'CROSSCUE, PITCH için doğru yönü otomatik uygular.',
    trouble3Q: 'Denetleyici tarayıcı tarafından algılanmıyor.',
    trouble3A: 'Chrome, Edge, Opera veya Brave kullanarak Web MIDI iznini onaylayın.',
    unknownConsolesTitle: 'Bilinmeyen ve Klasik DJ Mikserleri ve Konsollarının Kurulumu',
    unknownConsolesSubtitle: 'Herhangi bir MIDI cihazını (Hercules, Numark, Reloop, Denon, Akai vb.) adım adım eşleme rehberi',
    unknownPointers: [
      {
        title: '1. Cihaz Tanıma ve Tak-Çalıştır Bağlantı',
        desc: 'Çoğu USB DJ mikseri standart sınıfa uygundur (class-compliant) ve sürücüsüz çalışır. Cihazı bağlayın ve Mapping Manager üst çubuğundaki DEVICES listesinde göründüğünü doğrulayın.'
      },
      {
        title: '2. MIDI MONITOR ile Sinyalleri Keşfetme',
        desc: 'Sağ üstteki MONITOR butonunu açın. Konsolunuzdaki düğme ve faderları hareket ettirerek gelen Kanalı (CH), Tipi (CC/NOTEON) ve Numarayı (NUM) anında görün.'
      },
      {
        title: '3. Yeni Özel Profil Oluşturma (CREATE / EDIT)',
        desc: 'CREATE / EDIT sekmesinde konsolunuza bir isim verin ve önce ana kontrolleri (kanal faderları, crossfader, Play, Cue, EQ, Pitch) + ADD ENTRY → LEARN → ASSIGN ile bağlayın.'
      },
      {
        title: '4. 14-bit Faderlar ve Göreli Kodlayıcılar',
        desc: 'Fader iki sinyal birden gönderiyorsa (MSB/LSB), birincil ana CC numarasını seçin.'
      },
      {
        title: '5. Profili Kaydetme ve JSON Olarak Dışa Aktarma',
        desc: 'SAVE PROFILE ile kaydedin ve yedeğini almak veya paylaşmak için EXPORT PROFILE seçeneğini kullanın.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Kullanıcı Kılavuzu · Tüm hakları saklıdır'
  },

  el: {
    backToStudio: 'ΠΙΣΩ ΣΤΟ STUDIO',
    brandSubtitle: 'Οδηγός Χαρτογράφησης MIDI',
    printBtn: 'ΕΚΤΥΠΩΣΗ',
    downloadBtn: 'ΛΗΨΗ PDF',
    generating: 'ΔΗΜΙΟΥΡΓΙΑ...',
    headerCategory: 'CROSSCUE DJ WORKSTATION',
    title: 'Οδηγός Χαρτογράφησης & Εκμάθησης MIDI',
    subtitle: 'Βήμα προς βήμα οδηγίες για το περιβάλλον CREATE / EDIT',
    versionBadge: 'Έκδοση 2.0',
    controllerNotice: 'Υποστήριξη Pioneer DDJ-200 και τυπικών MIDI controllers',
    beforeStartTitle: 'Πριν ξεκινήσετε:',
    beforeStartDesc: 'Βεβαιωθείτε ότι το controller είναι συνδεδεμένο πριν ανοίξετε το studio. Το κουμπί MIDI στην επάνω γραμμή πρέπει να ανάβει χρυσό με ένδειξη READY ή ACTIVE.',
    step1Title: 'Πώς να ανοίξετε την οθόνη CREATE / EDIT',
    step1Items: [
      'Στο studio του CROSSCUE πατήστε το κουμπί MIDI στην επάνω γραμμή.',
      'Στον δεξιό πίνακα επιλέξτε MAPPING MANAGER.',
      'Στις επάνω καρτέλες επιλέξτε CREATE / EDIT.',
      'Για να επεξεργαστείτε υπάρχον προφίλ (π.χ. DDJ-200), μεταβείτε πρώτα στο LIBRARY και πατήστε EDIT ή CLONE.'
    ],
    step2Title: 'Βασική διαδικασία αντιστοίχισης',
    step2Desc: 'Κάθε γραμμή αντιστοιχεί σε μία σύνδεση MIDI σε 3 βήματα:',
    step2A: 'Βήμα A: ADD ENTRY',
    step2ADesc: 'Πατήστε + ADD ENTRY για να προσθέσετε νέα γραμμή.',
    step2B: 'Βήμα B: LEARN',
    step2BDesc: 'Πατήστε LEARN και μετακινήστε το φυσικό χειριστήριο.',
    step2C: 'Βήμα C: ASSIGN',
    step2CDesc: 'Πατήστε ASSIGN και επιλέξτε τη λειτουργία στο CROSSCUE.',
    step3Title: 'Λεπτομέρειες ανά τύπο χειριστηρίου',
    buttonsTitle: 'Α. ΚΟΥΜΠΙΑ (Play/Pause, Cue, Sync, Loop, HotCue)',
    buttonsHow: 'Πάτημα: Πατήστε LEARN και πιέστε το φυσικό κουμπί μία φορά σταθερά.',
    buttonsWhat: 'Καταγραφή: Μηνύματα NOTEON.',
    buttonsModes: 'Λειτουργίες:',
    buttonsModesList: [
      'PLAY / SYNC / LOOP λειτουργούν σε κατάσταση toggle.',
      'CUE λειτουργεί σε κατάσταση momentary.',
      'HOT CUE μεταβαίνει άμεσα στο αποθηκευμένο σημείο.'
    ],
    fadersTitle: 'Β. FADERS ΚΑΙ ΡΟΟΣΤΑΤΕΣ (Tempo, Faders έντασης, Crossfader, EQ, Φίλτρο)',
    fadersHow: 'Κίνηση: Πατήστε LEARN και μετακινήστε το fader τουλάχιστον στη μισή διαδρομή.',
    fadersWhat: 'Καταγραφή: Συνεχή μηνύματα CC.',
    fadersAssignments: 'Βασικές αντιστοιχίσεις:',
    faderPitchDesc: 'TEMPO: Επιλέξτε PITCH A ή B (αυτόματη ρύθμιση κατεύθυνσης).',
    faderVolumeDesc: 'ΕΝΤΑΣΗ: Επιλέξτε CHANNEL FADER A ή B.',
    faderCrossDesc: 'CROSSFADER: Επιλέξτε CROSSFADER.',
    faderEqDesc: 'EQ: Επιλέξτε HIGH, MID ή LOW A/B.',
    faderFilterDesc: 'ΦΙΛΤΡΟ: Επιλέξτε FILTER A ή B.',
    jogTitle: 'Γ. JOG WHEELS',
    jogDesc1: 'Οι τροχοί Jog στέλνουν σχετικούς παλμούς περιστροφής (CC 33 / 34), όχι απόλυτες τιμές 0-127.',
    jogDesc2: 'Μην αντιστοιχίζετε το jog σε απλά faders. Το επίσημο προφίλ DDJ-200 περιέχει ήδη εγγενή υποστήριξη.',
    step4Title: 'Χειροκίνητη εισαγωγή παραμέτρων',
    step4Desc: 'Μπορείτε να ορίσετε απευθείας τα πεδία CH (1-16), TYPE και NUM (0-127).',
    chLabel: 'CH: Κανάλι MIDI (1 έως 16)',
    typeLabel: 'TYPE: CC, NOTEON ή NOTEOFF',
    numLabel: 'NUM: Αριθμός ελέγχου (0 έως 127)',
    step5Title: 'Επαλήθευση λειτουργίας',
    step5Items: [
      'Ενεργοποιήστε το MONITOR επάνω δεξιά.',
      'Κινήστε το χειριστήριο για να δείτε την πράσινη επιβεβαίωση.',
      'Αποθηκεύστε με το SAVE PROFILE κάτω.'
    ],
    troubleTitle: 'Συχνές ερωτήσεις',
    trouble1Q: 'Το PLAY σταματά μόλις αφήσω το δάχτυλο.',
    trouble1A: 'Βεβαιωθείτε ότι ο τύπος είναι NOTEON. Το CROSSCUE αγνοεί το NoteOff για το Play.',
    trouble2Q: 'Το fader TEMPO κινείται αντίστροφα.',
    trouble2A: 'Το CROSSCUE ρυθμίζει αυτόματα τη σωστή κατεύθυνση για το PITCH.',
    trouble3Q: 'Το controller δεν αναγνωρίζεται.',
    trouble3A: 'Χρησιμοποιήστε Chrome, Edge, Opera ή Brave με Web MIDI ενεργοποιημένο.',
    unknownConsolesTitle: 'Ρύθμιση άγνωστων και ρετρό DJ κονσολών & μίκτηδων',
    unknownConsolesSubtitle: 'Βήμα προς βήμα οδηγός για οποιαδήποτε συσκευή MIDI (Hercules, Numark, Reloop, Denon, Akai, Behringer κ.ά.)',
    unknownPointers: [
      {
        title: '1. Αναγνώριση συσκευής και σύνδεση Plug-and-Play',
        desc: 'Οι περισσότεροι USB DJ μίκτες είναι class-compliant και λειτουργούν χωρίς πρόσθετα προγράμματα οδήγησης. Συνδέστε τη συσκευή και βεβαιωθείτε ότι εμφανίζεται στη γραμμή DEVICES.'
      },
      {
        title: '2. Εντοπισμός σημάτων μέσω του MIDI MONITOR',
        desc: 'Ανοίξτε το MONITOR επάνω δεξιά και κινήστε τα πλήκτρα και τα fader για να δείτε ζωντανά το Κανάλι (CH), τον Τύπο (CC/NOTEON) και τον Αριθμό (NUM).'
      },
      {
        title: '3. Δημιουργία νέου προφίλ (CREATE / EDIT)',
        desc: 'Ορίστε όνομα προφίλ στο CREATE / EDIT και αντιστοιχίστε πρώτα τις βασικές λειτουργίες (Faders καναλιών, Crossfader, Play, Cue, EQ, Pitch) με + ADD ENTRY → LEARN → ASSIGN.'
      },
      {
        title: '4. Faders 14-bit και σχετικοί κωδικοποιητές',
        desc: 'Εάν ένα fader στέλνει δύο σήματα ταυτόχρονα, αντιστοιχίστε τον κύριο (συνήθως χαμηλότερο) αριθμό CC.'
      },
      {
        title: '5. Αποθήκευση και εξαγωγή σε JSON (EXPORT JSON)',
        desc: 'Πατήστε SAVE PROFILE για αποθήκευση και EXPORT PROFILE για λήψη του αρχείου ρυθμίσεων.'
      }
    ],
    footerText: 'CROSSCUE DJ Workstation · Οδηγός Χρήσης · Με επιφύλαξη παντός δικαιώματος'
  }
};