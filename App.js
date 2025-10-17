import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";

const BACKGROUND_COLOR = "#f5f7ff";
const CLOCK_FACE_COLOR = "#ffffff";
const CLOCK_LINE_COLOR = "#1b2240";
const ACCENT_COLOR = "#1b2240";
const SECOND_HAND_COLOR = "#ff6b6b";
const NAV_BACKGROUND = "rgba(255, 255, 255, 0.88)";
const PRIMARY_ACCENT = "#5c6cff";
const TEXT_MUTED = "#7883ad";
const TEXT_SUBTLE = "#a0a9c7";
const CARD_ACCENT = "rgba(92, 108, 255, 0.18)";
const CLOCK_GLOW_PRIMARY = "rgba(92, 108, 255, 0.18)";
const CLOCK_GLOW_SECONDARY = "rgba(156, 168, 255, 0.22)";
const SWITCH_TRACK_OFF = "rgba(120, 132, 173, 0.32)";

const NAV_ITEMS = [
  { key: "alarm", label: "Alarm", icon: "⏰" },
  { key: "clock", label: "Clock", icon: "🕒" },
  { key: "timer", label: "Timer", icon: "⏳" },
  { key: "stopwatch", label: "Stopwatch", icon: "⏱" }
];

const HOUR_LABELS = Array.from({ length: 12 }, (_, index) => {
  const label = index === 11 ? "12" : String(index + 1);
  const angle = index * 30 - 60; // 12 o'clock is -90deg, so start 1 at -60deg
  return { label, angle };
});

const TICK_MARKS = Array.from({ length: 60 }, (_, index) => index);

const formatTime = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const minuteText = minutes.toString().padStart(2, "0");
  return { displayHour, minuteText, period };
};

const formatTimer = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const formatStopwatch = (totalMilliseconds) => {
  const minutes = Math.floor(totalMilliseconds / 60000);
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const centiseconds = Math.floor((totalMilliseconds % 1000) / 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
};

const formatFullDate = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

const REPEAT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatAlarmTime = ({ hour, minute, period }) => {
  const safeHour = Math.max(1, Math.min(12, hour));
  const safeMinute = Math.max(0, Math.min(59, minute));
  const paddedHour = safeHour.toString().padStart(2, "0");
  const paddedMinute = safeMinute.toString().padStart(2, "0");
  return `${paddedHour}:${paddedMinute} ${period}`;
};

const determineNextAlarmTemplate = (existingCount) => {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const roundedMinutes = Math.ceil(totalMinutes / 5) * 5 + (existingCount + 1) * 5;
  const wrapMinutes = roundedMinutes % (24 * 60);
  const hours24 = Math.floor(wrapMinutes / 60);
  const minutes = wrapMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = ((hours24 + 11) % 12) + 1;

  return {
    id: null,
    label: `New alarm ${existingCount + 1}`,
    repeatDays: [],
    hour: hour12,
    minute: minutes,
    period,
    active: true
  };
};

const toggleListValue = (list, value) => {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }
  return [...list, value];
};

const to24Hour = (hour, period) => {
  const normalizedHour = ((hour % 12) + 12) % 12;
  if (period === "AM") {
    return normalizedHour === 12 ? 0 : normalizedHour;
  }
  return normalizedHour === 12 ? 12 : normalizedHour + 12;
};

const alarmMinutesValue = (alarm) =>
  to24Hour(alarm.hour, alarm.period) * 60 + alarm.minute;

const sortAlarms = (alarms) =>
  [...alarms].sort((a, b) => {
    const diff = alarmMinutesValue(a) - alarmMinutesValue(b);
    if (diff !== 0) return diff;
    return a.label.localeCompare(b.label);
  });

const INITIAL_ALARMS = [
  {
    id: "alarm-1",
    label: "Morning Run",
    repeatDays: ["Mon", "Wed", "Fri"],
    hour: 7,
    minute: 0,
    period: "AM",
    active: true
  },
  {
    id: "alarm-2",
    label: "Daily Standup",
    repeatDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    hour: 8,
    minute: 30,
    period: "AM",
    active: true
  },
  {
    id: "alarm-3",
    label: "Wind Down",
    repeatDays: [],
    hour: 10,
    minute: 0,
    period: "PM",
    active: false
  }
];

export default function App() {
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("clock");
  const [alarms, setAlarms] = useState(INITIAL_ALARMS);
  const [alarmEditorState, setAlarmEditorState] = useState(null);
  const [accentHue] = useState(() => Math.floor(Math.random() * 360));
  const { width } = useWindowDimensions();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clockSize = Math.min(width * 0.85, 320);
  const clockRadius = clockSize / 2;
  const hourHandLength = clockRadius * 0.45;
  const minuteHandLength = clockRadius * 0.68;
  const secondHandLength = clockRadius * 0.75;

  const { hoursAngle, minutesAngle, secondsAngle } = useMemo(() => {
    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const secondsAngleValue = seconds * 6;
    const minutesAngleValue = minutes * 6 + seconds * 0.1;
    const hoursAngleValue = hours * 30 + minutes * 0.5 + seconds * (0.5 / 60);

    return {
      hoursAngle: hoursAngleValue,
      minutesAngle: minutesAngleValue,
      secondsAngle: secondsAngleValue
    };
  }, [time]);

  const { displayHour, minuteText, period } = useMemo(
    () => formatTime(time),
    [time]
  );

  const formattedDate = useMemo(() => formatFullDate(time), [time]);

  const handleToggleAlarm = useCallback((alarmId) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm.id === alarmId ? { ...alarm, active: !alarm.active } : alarm
      )
    );
  }, []);

  const handleAddAlarm = useCallback(() => {
    setAlarmEditorState({
      mode: "create",
      alarm: determineNextAlarmTemplate(alarms.length)
    });
  }, [alarms.length]);

  const handleEditAlarm = useCallback((alarmId) => {
    setAlarmEditorState((prev) => {
      const target = alarms.find((alarm) => alarm.id === alarmId);
      if (!target) {
        return prev;
      }
      return {
        mode: "edit",
        alarm: {
          ...target,
          repeatDays: [...target.repeatDays]
        }
      };
    });
  }, [alarms]);

  const handleDismissAlarmEditor = useCallback(() => {
    setAlarmEditorState(null);
  }, []);

  const handleSaveAlarm = useCallback(
    (updatedAlarm) => {
      setAlarms((prev) => {
        if (alarmEditorState?.mode === "edit") {
          const nextAlarms = prev.map((alarm) =>
            alarm.id === updatedAlarm.id ? updatedAlarm : alarm
          );
          return sortAlarms(nextAlarms);
        }
        const newAlarm = { ...updatedAlarm, id: `alarm-${Date.now()}` };
        return sortAlarms([...prev, newAlarm]);
      });
      setAlarmEditorState(null);
    },
    [alarmEditorState?.mode]
  );

  const renderActiveContent = useMemo(() => {
    switch (activeTab) {
      case "alarm":
        return (
          <View style={styles.surfaceCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Alarm schedule</Text>
              <Text style={styles.cardSubtitle}>
                Fine-tune the moments that matter
              </Text>
            </View>
            <AlarmTab
              alarms={alarms}
              onToggleAlarm={handleToggleAlarm}
              onAddAlarm={handleAddAlarm}
              onEditAlarm={handleEditAlarm}
            />
          </View>
        );
      case "clock":
        return (
          <AuroraClockCard
            time={time}
            clockRadius={clockRadius}
            clockSize={clockSize}
            hourHandLength={hourHandLength}
            minuteHandLength={minuteHandLength}
            secondHandLength={secondHandLength}
            hoursAngle={hoursAngle}
            minutesAngle={minutesAngle}
            secondsAngle={secondsAngle}
            displayHour={displayHour}
            minuteText={minuteText}
            period={period}
            accentHue={accentHue}
          />
        );
      case "timer":
        return (
          <View style={styles.surfaceCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Countdown timer</Text>
              <Text style={styles.cardSubtitle}>
                Stay on track without distractions
              </Text>
            </View>
            <TimerTab />
          </View>
        );
      case "stopwatch":
        return (
          <View style={styles.surfaceCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Stopwatch</Text>
              <Text style={styles.cardSubtitle}>
                Measure each lap with clarity
              </Text>
            </View>
            <StopwatchTab />
          </View>
        );
      default:
        return null;
    }
  }, [
    activeTab,
    alarms,
    clockRadius,
    clockSize,
    displayHour,
    hourHandLength,
    hoursAngle,
    minuteHandLength,
    minutesAngle,
    handleAddAlarm,
    handleEditAlarm,
    handleToggleAlarm,
    minuteText,
    period,
    secondHandLength,
    secondsAngle,
    accentHue,
    time
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.backgroundLayer}>
        <View style={[styles.backgroundShape, styles.backgroundShapeTop]} />
        <View style={[styles.backgroundShape, styles.backgroundShapeBottom]} />
      </View>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.tag}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText}>On schedule</Text>
          </View>
          <Text style={styles.pageTitle}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </Text>
          <Text style={styles.pageSubtitle}>{formattedDate}</Text>
        </View>

        <View style={styles.contentSection}>{renderActiveContent}</View>

        <View style={styles.navWrapper}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveTab(item.key)}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                <View
                  style={[
                    styles.navActiveIconCircle,
                    !isActive && styles.navIconPlaceholder
                  ]}
                >
                  <Text
                    style={[
                      styles.navIcon,
                      isActive ? styles.navIconActive : styles.navIconInactive
                    ]}
                  >
                    {item.icon}
                  </Text>
                </View>
                <Text
                  style={[styles.navLabel, isActive && styles.navLabelActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <AlarmEditorModal
        visible={!!alarmEditorState}
        mode={alarmEditorState?.mode || "create"}
        initialAlarm={alarmEditorState?.alarm}
        onDismiss={handleDismissAlarmEditor}
        onSave={handleSaveAlarm}
        onToggleDay={(day) => {
          setAlarmEditorState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              alarm: {
                ...prev.alarm,
                repeatDays: toggleListValue(prev.alarm.repeatDays, day)
              }
            };
          });
        }}
        onUpdateTemporal={(next) => {
          setAlarmEditorState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              alarm: {
                ...prev.alarm,
                ...next
              }
            };
          });
        }}
        onUpdateLabel={(nextLabel) => {
          setAlarmEditorState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              alarm: {
                ...prev.alarm,
                label: nextLabel
              }
            };
          });
        }}
        onToggleActive={(nextActive) => {
          setAlarmEditorState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              alarm: {
                ...prev.alarm,
                active: nextActive
              }
            };
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: "none"
  },
  backgroundShape: {
    position: "absolute"
  },
  backgroundShapeTop: {
    top: -140,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(180, 190, 255, 0.25)"
  },
  backgroundShapeBottom: {
    bottom: -160,
    left: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(255, 255, 255, 0.45)"
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: "stretch",
    zIndex: 1
  },
  header: {
    width: "100%",
    gap: 12,
    marginBottom: 12
  },
  tag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(107, 123, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY_ACCENT,
    marginRight: 6
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY_ACCENT,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  pageSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: TEXT_MUTED
  },
  contentSection: {
    flex: 1,
    width: "100%",
    paddingTop: 12,
    paddingBottom: 32,
    justifyContent: "center"
  },
  surfaceCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#c0caea",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.14)",
    gap: 16
  },
  clockCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#c0caea",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.14)",
    gap: 16
  },
  cardHeader: {
    width: "100%",
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT_SUBTLE
  },
  clockFace: {
    backgroundColor: CLOCK_FACE_COLOR,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d2daf3",
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.16)"
  },
  clockOuterWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24
  },
  clockGlow: {
    position: "absolute",
    backgroundColor: CLOCK_GLOW_PRIMARY
  },
  clockInnerRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(92, 108, 255, 0.22)",
    backgroundColor: CLOCK_FACE_COLOR
  },
  auroraCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 32,
    paddingHorizontal: 26,
    paddingVertical: 30,
    overflow: "hidden",
    gap: 24,
    shadowColor: "#b4bedf",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.18)"
  },
  auroraGlowLayer: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.35
  },
  auroraGlowLeft: {
    top: -120,
    left: -140,
    transform: [{ rotate: "15deg" }]
  },
  auroraGlowRight: {
    bottom: -160,
    right: -120,
    transform: [{ rotate: "-18deg" }]
  },
  auroraHeader: {
    width: "100%",
    gap: 4
  },
  auroraTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  auroraSubtitle: {
    fontSize: 14,
    color: TEXT_SUBTLE
  },
  auroraClockShell: {
    alignItems: "center",
    justifyContent: "center"
  },
  auroraDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(120, 132, 173, 0.22)"
  },
  auroraInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  auroraMetaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_SUBTLE,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  auroraMetaValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "600",
    color: ACCENT_COLOR
  },
  auroraBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(92, 108, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(92, 108, 255, 0.28)"
  },
  auroraBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_ACCENT
  },
  tick: {
    position: "absolute",
    width: 2,
    borderRadius: 2,
    left: "50%",
    marginLeft: -1
  },
  hourTick: {
    height: 24,
    width: 3,
    backgroundColor: CLOCK_LINE_COLOR,
    marginLeft: -1.5
  },
  minuteTick: {
    height: 12,
    backgroundColor: "rgba(27, 34, 64, 0.18)"
  },
  hourLabel: {
    position: "absolute",
    fontSize: 18,
    fontWeight: "600",
    color: ACCENT_COLOR,
    textAlign: "center",
    lineHeight: 20
  },
  handContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  hand: {
    width: 6,
    borderRadius: 6
  },
  hourHand: {
    width: 6,
    backgroundColor: CLOCK_LINE_COLOR
  },
  minuteHand: {
    width: 4
  },
  secondHand: {
    width: 2
  },
  centerOuter: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8
  },
  centerInner: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BACKGROUND_COLOR,
    borderWidth: 1
  },
  digitalWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.16)",
    marginTop: 12
  },
  digitalHour: {
    fontSize: 52,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  digitalSeparator: {
    fontSize: 46,
    fontWeight: "600",
    color: ACCENT_COLOR,
    marginHorizontal: 4,
    marginBottom: 4
  },
  digitalMinute: {
    fontSize: 52,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  digitalPeriod: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_ACCENT,
    marginBottom: 10
  },
  navWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: NAV_BACKGROUND,
    borderRadius: 32,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#aeb6d6",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 32,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.18)",
    marginTop: 20
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 8,
    borderRadius: 24
  },
  navItemActive: {
    backgroundColor: "rgba(92, 108, 255, 0.18)",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(92, 108, 255, 0.28)"
  },
  navActiveIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginBottom: 6,
    shadowColor: PRIMARY_ACCENT,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(92, 108, 255, 0.25)"
  },
  navIconPlaceholder: {
    backgroundColor: "transparent"
  },
  navIcon: {
    fontSize: 18,
    color: "#98a2c8",
    marginBottom: 4
  },
  navIconActive: {
    color: PRIMARY_ACCENT
  },
  navIconInactive: {
    color: TEXT_MUTED
  },
  navLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9aa3c9"
  },
  navLabelActive: {
    color: PRIMARY_ACCENT
  },
  tabContainer: {
    width: "100%",
    alignItems: "stretch",
    gap: 16
  },
  alarmCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#c9d2f0",
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.18)",
    gap: 16
  },
  alarmDetails: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4
  },
  alarmTime: {
    fontSize: 28,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  alarmLabel: {
    marginTop: 4,
    fontSize: 14,
    color: TEXT_SUBTLE
  },
  alarmRepeat: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: TEXT_MUTED
  },
  alarmEmpty: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 20,
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.14)",
    shadowColor: "#d3dbf4",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 4
  },
  alarmEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  alarmEmptyCopy: {
    fontSize: 14,
    color: TEXT_SUBTLE,
    lineHeight: 20
  },
  addAlarmButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: PRIMARY_ACCENT,
    shadowColor: "#c7d0ef",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 4
  },
  addAlarmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff"
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 21, 46, 0.25)",
    zIndex: 0
  },
  modalCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#c6d0ec",
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.16)",
    gap: 20,
    zIndex: 1
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(92, 108, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_ACCENT
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_SUBTLE,
    lineHeight: 20
  },
  modalSection: {
    gap: 12
  },
  modalSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalSectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: ACCENT_COLOR
  },
  modalHint: {
    fontSize: 12,
    color: TEXT_SUBTLE
  },
  timeSetterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  stepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(92, 108, 255, 0.08)",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ccd3ef",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 3
  },
  stepperSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_ACCENT
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: "700",
    color: ACCENT_COLOR,
    minWidth: 32,
    textAlign: "center"
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(92, 108, 255, 0.1)",
    padding: 4,
    borderRadius: 18,
    gap: 6
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14
  },
  periodChipActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#ccd3ef",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 3
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_MUTED
  },
  periodChipTextActive: {
    color: PRIMARY_ACCENT
  },
  labelInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.16)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: ACCENT_COLOR,
    backgroundColor: "rgba(255, 255, 255, 0.92)"
  },
  repeatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  repeatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(92, 108, 255, 0.1)"
  },
  repeatChipActive: {
    backgroundColor: PRIMARY_ACCENT
  },
  repeatChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED
  },
  repeatChipTextActive: {
    color: "#ffffff"
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8
  },
  modalActionButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  modalActionPrimary: {
    backgroundColor: PRIMARY_ACCENT
  },
  modalActionPrimaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  modalActionSecondary: {
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.18)",
    backgroundColor: "#ffffff"
  },
  modalActionSecondaryText: {
    color: PRIMARY_ACCENT,
    fontSize: 16,
    fontWeight: "600"
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: "700",
    color: ACCENT_COLOR,
    textAlign: "center",
    marginBottom: 12
  },
  stopwatchDisplay: {
    fontSize: 48,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    color: ACCENT_COLOR,
    textAlign: "center",
    marginBottom: 12
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%"
  },
  ctaButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(92, 108, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(92, 108, 255, 0.18)"
  },
  primaryButton: {
    backgroundColor: PRIMARY_ACCENT,
    shadowColor: "#c7d0ef",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4
  },
  ctaText: {
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: "600"
  },
  ctaTextOnDark: {
    color: "#ffffff"
  },
  timerHint: {
    marginTop: 16,
    fontSize: 13,
    color: TEXT_SUBTLE,
    textAlign: "center"
  },
  splitList: {
    marginTop: 24,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(120, 132, 173, 0.14)"
  },
  splitEntry: {
    fontSize: 14,
    color: TEXT_MUTED
  }
});

const AuroraClockCard = ({
  time,
  clockRadius,
  clockSize,
  hourHandLength,
  minuteHandLength,
  secondHandLength,
  hoursAngle,
  minutesAngle,
  secondsAngle,
  displayHour,
  minuteText,
  period,
  accentHue
}) => {
  const accentPrimary = `hsl(${accentHue}, 72%, 58%)`;
  const accentSecondary = `hsl(${(accentHue + 30) % 360}, 68%, 52%)`;
  const glowPrimary = `hsla(${accentHue}, 82%, 72%, 0.28)`;
  const glowSecondary = `hsla(${(accentHue + 20) % 360}, 78%, 70%, 0.24)`;
  const innerRingColor = `hsla(${accentHue}, 70%, 72%, 0.22)`;
  const minuteTickColor = "rgba(27, 34, 64, 0.2)";

  const dateLabel = formatFullDate(time);
  const offsetMinutes = time.getTimezoneOffset();
  const offsetSign = offsetMinutes <= 0 ? "+" : "-";
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60)
    .toString()
    .padStart(2, "0");
  const offsetRemainder = (Math.abs(offsetMinutes) % 60)
    .toString()
    .padStart(2, "0");
  const offsetText = `UTC${offsetSign}${offsetHours}:${offsetRemainder}`;

  return (
    <View style={styles.auroraCard}>
      <View
        style={[
          styles.auroraGlowLayer,
          styles.auroraGlowLeft,
          { backgroundColor: glowPrimary }
        ]}
      />
      <View
        style={[
          styles.auroraGlowLayer,
          styles.auroraGlowRight,
          { backgroundColor: glowSecondary }
        ]}
      />

      <View style={styles.auroraHeader}>
        <Text style={styles.auroraTitle}>Current time</Text>
        <Text style={styles.auroraSubtitle}>
          Sync across your workspaces
        </Text>
      </View>

      <View style={styles.auroraClockShell}>
        <AnalogClock
          clockRadius={clockRadius}
          clockSize={clockSize}
          hourHandLength={hourHandLength}
          minuteHandLength={minuteHandLength}
          secondHandLength={secondHandLength}
          hoursAngle={hoursAngle}
          minutesAngle={minutesAngle}
          secondsAngle={secondsAngle}
          accentColor={accentPrimary}
          glowColor={glowPrimary}
          innerRingColor={innerRingColor}
          minuteTickColor={minuteTickColor}
          minuteHandColor={accentPrimary}
          secondHandColor={accentSecondary}
        />
      </View>

      <View style={styles.digitalWrapper}>
        <Text style={styles.digitalHour}>{displayHour}</Text>
        <Text style={styles.digitalSeparator}>:</Text>
        <Text style={styles.digitalMinute}>{minuteText}</Text>
        <Text
          style={[
            styles.digitalPeriod,
            { color: accentPrimary }
          ]}
        >
          {period}
        </Text>
      </View>

      <View style={styles.auroraDivider} />

      <View style={styles.auroraInfoRow}>
        <View>
          <Text style={styles.auroraMetaLabel}>Today</Text>
          <Text style={styles.auroraMetaValue}>{dateLabel}</Text>
        </View>
        <View style={styles.auroraBadge}>
          <Text style={styles.auroraBadgeText}>{offsetText}</Text>
        </View>
      </View>
    </View>
  );
};

const AnalogClock = ({
  clockRadius,
  clockSize,
  hourHandLength,
  minuteHandLength,
  secondHandLength,
  hoursAngle,
  minutesAngle,
  secondsAngle,
  accentColor = PRIMARY_ACCENT,
  glowColor = CLOCK_GLOW_PRIMARY,
  innerRingColor = "rgba(255, 255, 255, 0.16)",
  minuteTickColor = "rgba(27, 34, 64, 0.2)",
  hourHandColor = CLOCK_LINE_COLOR,
  minuteHandColor = PRIMARY_ACCENT,
  secondHandColor = SECOND_HAND_COLOR
}) => {
  const glowSize = clockSize + 56;
  const glowRadius = glowSize / 2;
  const innerSize = clockSize - 36;
  const innerRadius = innerSize / 2;

  return (
    <View
      style={[
        styles.clockOuterWrapper,
        { width: glowSize, height: glowSize, borderRadius: glowRadius }
      ]}
    >
      <View
        style={[
          styles.clockGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowRadius,
            backgroundColor: glowColor
          }
        ]}
      />
      <View
        style={[
          styles.clockFace,
          {
            width: clockSize,
            height: clockSize,
            borderRadius: clockRadius
          }
        ]}
      >
        <View
          style={[
            styles.clockInnerRing,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerRadius,
              borderColor: innerRingColor
            }
          ]}
        />
        {TICK_MARKS.map((mark) => {
          const isHourMark = mark % 5 === 0;
          return (
            <View
              key={`tick-${mark}`}
              style={[
                styles.tick,
                isHourMark ? styles.hourTick : styles.minuteTick,
                !isHourMark && { backgroundColor: minuteTickColor },
                {
                  transform: [
                    { rotate: `${mark * 6}deg` },
                    {
                      translateY: -clockRadius + (isHourMark ? 32 : 28)
                    }
                  ]
                }
              ]}
            />
          );
        })}

        {HOUR_LABELS.map(({ label, angle }) => {
          const angleInRadians = (angle * Math.PI) / 180;
          const distanceFromCenter = clockRadius - 46;
          const x =
            clockRadius + Math.cos(angleInRadians) * distanceFromCenter;
          const y =
            clockRadius + Math.sin(angleInRadians) * distanceFromCenter;
          const labelWidth = label.length > 1 ? 32 : 24;
          const labelHeight = 24;

          return (
            <Text
              key={`label-${label}`}
              style={[
                styles.hourLabel,
                {
                  left: x - labelWidth / 2,
                  top: y - labelHeight / 2,
                  width: labelWidth
                }
              ]}
            >
              {label}
            </Text>
          );
        })}

        <View
          style={[
            styles.handContainer,
            { transform: [{ rotate: `${hoursAngle}deg` }] }
          ]}
        >
          <View
            style={[
              styles.hand,
              styles.hourHand,
              {
                height: hourHandLength,
                backgroundColor: hourHandColor,
                transform: [{ translateY: -hourHandLength / 2 }]
              }
            ]}
          />
        </View>

        <View
          style={[
            styles.handContainer,
            { transform: [{ rotate: `${minutesAngle}deg` }] }
          ]}
        >
          <View
            style={[
              styles.hand,
              styles.minuteHand,
              {
                height: minuteHandLength,
                backgroundColor: minuteHandColor,
                transform: [{ translateY: -minuteHandLength / 2 }]
              }
            ]}
          />
        </View>

        <View
          style={[
            styles.handContainer,
            { transform: [{ rotate: `${secondsAngle}deg` }] }
          ]}
        >
          <View
            style={[
              styles.hand,
              styles.secondHand,
              {
                height: secondHandLength,
                backgroundColor: secondHandColor,
                transform: [{ translateY: -secondHandLength / 2 }]
              }
            ]}
          />
        </View>

        <View
          style={[
            styles.centerOuter,
            { backgroundColor: accentColor }
          ]}
        />
        <View
          style={[
            styles.centerInner,
            { borderColor: accentColor }
          ]}
        />
      </View>
    </View>
  );
};

const AlarmEditorModal = ({
  visible,
  mode,
  initialAlarm,
  onDismiss,
  onSave,
  onToggleDay,
  onUpdateTemporal,
  onUpdateLabel,
  onToggleActive
}) => {
  if (!visible || !initialAlarm) {
    return null;
  }

  const { hour, minute, period, label, repeatDays, active } = initialAlarm;

  const adjustHour = (delta) => {
    const next = hour + delta;
    if (next < 1) {
      onUpdateTemporal({ hour: 12 });
    } else if (next > 12) {
      onUpdateTemporal({ hour: 1 });
    } else {
      onUpdateTemporal({ hour: next });
    }
  };

  const adjustMinute = (delta) => {
    const next = (minute + delta + 60) % 60;
    onUpdateTemporal({ minute: next });
  };

  const handleSave = () => {
    const trimmedLabel = label.trim();
    onSave({
      ...initialAlarm,
      label: trimmedLabel.length > 0 ? trimmedLabel : "Alarm"
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onDismiss} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {mode === "edit" ? "Edit alarm" : "New alarm"}
            </Text>
            <Pressable onPress={onDismiss} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.modalSubtitle}>
            Set the time and how often you want this reminder.
          </Text>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionLabel}>Time</Text>
            <View style={styles.timeSetterRow}>
              <View style={styles.stepperGroup}>
                <Pressable
                  onPress={() => adjustHour(-1)}
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperSymbol}>-</Text>
                </Pressable>
                <Text style={styles.stepperValue}>
                  {hour.toString().padStart(2, "0")}
                </Text>
                <Pressable
                  onPress={() => adjustHour(1)}
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperSymbol}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.stepperGroup}>
                <Pressable
                  onPress={() => adjustMinute(-1)}
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperSymbol}>-</Text>
                </Pressable>
                <Text style={styles.stepperValue}>
                  {minute.toString().padStart(2, "0")}
                </Text>
                <Pressable
                  onPress={() => adjustMinute(1)}
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperSymbol}>+</Text>
                </Pressable>
              </View>
              <View style={styles.periodToggle}>
                {["AM", "PM"].map((item) => {
                  const isActive = period === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => onUpdateTemporal({ period: item })}
                      style={[
                        styles.periodChip,
                        isActive && styles.periodChipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.periodChipText,
                          isActive && styles.periodChipTextActive
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionLabel}>Label</Text>
            <TextInput
              style={styles.labelInput}
              value={label}
              onChangeText={onUpdateLabel}
              placeholder="Alarm label"
              placeholderTextColor={TEXT_SUBTLE}
            />
          </View>

          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Text style={styles.modalSectionLabel}>Repeat</Text>
              <Text style={styles.modalHint}>Tap to toggle days</Text>
            </View>
            <View style={styles.repeatRow}>
              {REPEAT_DAYS.map((day) => {
                const isSelected = repeatDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => onToggleDay(day)}
                    style={[
                      styles.repeatChip,
                      isSelected && styles.repeatChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        isSelected && styles.repeatChipTextActive
                      ]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.modalSection}>
            <View style={styles.modalSectionHeader}>
              <Text style={styles.modalSectionLabel}>Status</Text>
              <Text style={styles.modalHint}>
                {active ? "Alarm is enabled" : "Alarm is paused"}
              </Text>
            </View>
            <Switch
              value={active}
              onValueChange={onToggleActive}
              thumbColor={active ? "#ffffff" : "#f0f2ff"}
              trackColor={{ false: SWITCH_TRACK_OFF, true: PRIMARY_ACCENT }}
              ios_backgroundColor={SWITCH_TRACK_OFF}
            />
          </View>

          <View style={styles.modalActions}>
            <Pressable
              onPress={onDismiss}
              style={[styles.modalActionButton, styles.modalActionSecondary]}
            >
              <Text style={styles.modalActionSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.modalActionButton, styles.modalActionPrimary]}
            >
              <Text style={styles.modalActionPrimaryText}>
                {mode === "edit" ? "Save" : "Add alarm"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AlarmTab = ({ alarms, onToggleAlarm, onAddAlarm, onEditAlarm }) => {
  const hasAlarms = alarms && alarms.length > 0;

  return (
    <View style={styles.tabContainer}>
      {hasAlarms ? (
        alarms.map((alarm) => {
          const repeatLabel =
            alarm.repeatDays && alarm.repeatDays.length > 0
              ? alarm.repeatDays.join(" · ")
              : "One-time alarm";
          const timeLabel = formatAlarmTime(alarm);

          return (
            <View key={alarm.id} style={styles.alarmCard}>
              <Pressable
                onPress={() => onEditAlarm?.(alarm.id)}
                style={styles.alarmDetails}
              >
                <Text style={styles.alarmTime}>{timeLabel}</Text>
                <Text style={styles.alarmLabel}>{alarm.label}</Text>
                <Text style={styles.alarmRepeat}>{repeatLabel}</Text>
              </Pressable>
              <Switch
                value={alarm.active}
                onValueChange={() => onToggleAlarm?.(alarm.id)}
                thumbColor={alarm.active ? "#ffffff" : "#f0f2ff"}
                trackColor={{ false: SWITCH_TRACK_OFF, true: PRIMARY_ACCENT }}
                ios_backgroundColor={SWITCH_TRACK_OFF}
              />
            </View>
          );
        })
      ) : (
        <View style={styles.alarmEmpty}>
          <Text style={styles.alarmEmptyTitle}>No alarms scheduled</Text>
          <Text style={styles.alarmEmptyCopy}>
            Tap below to create your first reminder.
          </Text>
        </View>
      )}
      <Pressable
        style={styles.addAlarmButton}
        onPress={() => onAddAlarm?.()}
        accessibilityRole="button"
      >
        <Text style={styles.addAlarmButtonText}>+ Add alarm</Text>
      </Pressable>
    </View>
  );
};

const TimerTab = () => {
  const [secondsRemaining, setSecondsRemaining] = useState(5 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(prev - 1, 0));
      }, 1000);
    }

    if (secondsRemaining === 0) {
      clearTimer();
      setIsRunning(false);
    }

    return clearTimer;
  }, [clearTimer, isRunning, secondsRemaining]);

  const handleStartPause = () => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(5 * 60);
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    clearTimer();
    setSecondsRemaining(5 * 60);
    setIsRunning(false);
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.timerDisplay}>{formatTimer(secondsRemaining)}</Text>
      <View style={styles.buttonRow}>
        <Pressable
          onPress={handleStartPause}
          style={[styles.ctaButton, styles.primaryButton]}
        >
          <Text style={[styles.ctaText, styles.ctaTextOnDark]}>
            {isRunning ? "Pause" : "Start"}
          </Text>
        </Pressable>
        <Pressable onPress={handleReset} style={styles.ctaButton}>
          <Text style={styles.ctaText}>Reset</Text>
        </Pressable>
      </View>
      <Text style={styles.timerHint}>Tap Start to begin the countdown</Text>
    </View>
  );
};

const StopwatchTab = () => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const clearStopwatch = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 10);
      }, 10);
    }
    return clearStopwatch;
  }, [clearStopwatch, isRunning]);

  const handleStartPause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    clearStopwatch();
    setElapsed(0);
    setIsRunning(false);
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.stopwatchDisplay}>{formatStopwatch(elapsed)}</Text>
      <View style={styles.buttonRow}>
        <Pressable
          onPress={handleStartPause}
          style={[styles.ctaButton, styles.primaryButton]}
        >
          <Text style={[styles.ctaText, styles.ctaTextOnDark]}>
            {isRunning ? "Pause" : "Start"}
          </Text>
        </Pressable>
        <Pressable onPress={handleReset} style={styles.ctaButton}>
          <Text style={styles.ctaText}>Reset</Text>
        </Pressable>
      </View>
      <View style={styles.splitList}>
        <Text style={styles.splitEntry}>Lap tracking arrives soon</Text>
      </View>
    </View>
  );
};
