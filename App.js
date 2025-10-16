import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

const BACKGROUND_COLOR = "#f4f5fb";
const CLOCK_FACE_COLOR = "#ffffff";
const CLOCK_LINE_COLOR = "#1a2147";
const ACCENT_COLOR = "#1a2147";
const SECOND_HAND_COLOR = "#ff6b6b";
const NAV_BACKGROUND = "#ffffff";
const PRIMARY_ACCENT = "#5c6cff";
const TEXT_MUTED = "#7c8098";
const TEXT_SUBTLE = "#a0a6bf";
const CARD_ACCENT = "#e9edff";

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

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const formatFullDate = (date) => {
  const day = DAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  const dayOfMonth = date.getDate();

  return `${day}, ${month} ${dayOfMonth}`;
};

export default function App() {
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("clock");
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
            <AlarmTab />
          </View>
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
        return (
          <View style={styles.clockCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current time</Text>
              <Text style={styles.cardSubtitle}>
                Sync across your workspaces
              </Text>
            </View>
            <AnalogClock
              clockRadius={clockRadius}
              clockSize={clockSize}
              hourHandLength={hourHandLength}
              minuteHandLength={minuteHandLength}
              secondHandLength={secondHandLength}
              hoursAngle={hoursAngle}
              minutesAngle={minutesAngle}
              secondsAngle={secondsAngle}
            />
            <View style={styles.digitalWrapper}>
              <Text style={styles.digitalHour}>{displayHour}</Text>
              <Text style={styles.digitalSeparator}>:</Text>
              <Text style={styles.digitalMinute}>{minuteText}</Text>
              <Text style={styles.digitalPeriod}>{period}</Text>
            </View>
          </View>
        );
    }
  }, [
    activeTab,
    clockRadius,
    clockSize,
    displayHour,
    hourHandLength,
    hoursAngle,
    minuteHandLength,
    minutesAngle,
    minuteText,
    period,
    secondHandLength,
    secondsAngle
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
    position: "absolute",
    backgroundColor: CARD_ACCENT,
    opacity: 0.55
  },
  backgroundShapeTop: {
    top: -140,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160
  },
  backgroundShapeBottom: {
    bottom: -120,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130
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
    backgroundColor: CARD_ACCENT,
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
    backgroundColor: NAV_BACKGROUND,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#0b1033",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    gap: 16
  },
  clockCard: {
    width: "100%",
    backgroundColor: NAV_BACKGROUND,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#0b1033",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
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
    borderWidth: 1,
    borderColor: "#dbe2ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#0b1033",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  tick: {
    position: "absolute",
    width: 2,
    height: 12,
    backgroundColor: CLOCK_LINE_COLOR,
    left: "50%"
  },
  hourTick: {
    height: 18,
    width: 3
  },
  hourLabel: {
    position: "absolute",
    fontSize: 18,
    fontWeight: "600",
    color: ACCENT_COLOR
  },
  handContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  hand: {
    width: 6,
    borderRadius: 6,
    backgroundColor: CLOCK_LINE_COLOR
  },
  hourHand: {
    width: 6
  },
  minuteHand: {
    width: 4
  },
  secondHand: {
    width: 2,
    backgroundColor: SECOND_HAND_COLOR
  },
  centerOuter: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: CLOCK_LINE_COLOR
  },
  centerInner: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff"
  },
  digitalWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8
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
    marginBottom: 2
  },
  digitalMinute: {
    fontSize: 52,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  digitalPeriod: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginLeft: 8,
    marginBottom: 10
  },
  navWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: NAV_BACKGROUND,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#0b1033",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    marginTop: 16
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20
  },
  navItemActive: {
    backgroundColor: CARD_ACCENT,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  navActiveIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_ACCENT,
    marginBottom: 4
  },
  navIconPlaceholder: {
    backgroundColor: "transparent"
  },
  navIcon: {
    fontSize: 18,
    color: TEXT_MUTED,
    marginBottom: 4
  },
  navIconActive: {
    color: "#ffffff"
  },
  navIconInactive: {
    color: TEXT_MUTED
  },
  navLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: TEXT_MUTED
  },
  navLabelActive: {
    color: ACCENT_COLOR
  },
  tabContainer: {
    width: "100%",
    alignItems: "stretch",
    gap: 16
  },
  alarmCard: {
    width: "100%",
    backgroundColor: "#f7f8ff",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0b1033",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  alarmTime: {
    fontSize: 28,
    fontWeight: "700",
    color: ACCENT_COLOR
  },
  alarmLabel: {
    marginTop: 4,
    fontSize: 14,
    color: TEXT_MUTED
  },
  alarmToggle: {
    width: 56,
    height: 30,
    borderRadius: 15,
    backgroundColor: CARD_ACCENT,
    justifyContent: "center",
    paddingHorizontal: 4
  },
  alarmToggleActive: {
    backgroundColor: PRIMARY_ACCENT
  },
  alarmToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    alignSelf: "flex-start"
  },
  alarmToggleKnobActive: {
    alignSelf: "flex-end"
  },
  alarmFooter: {
    marginTop: 4,
    alignSelf: "flex-start"
  },
  alarmFooterText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_ACCENT
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
    backgroundColor: CARD_ACCENT,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButton: {
    backgroundColor: PRIMARY_ACCENT
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
    backgroundColor: CARD_ACCENT,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    width: "100%",
    alignItems: "center"
  },
  splitEntry: {
    fontSize: 14,
    color: TEXT_SUBTLE
  }
});

const AnalogClock = ({
  clockRadius,
  clockSize,
  hourHandLength,
  minuteHandLength,
  secondHandLength,
  hoursAngle,
  minutesAngle,
  secondsAngle
}) => (
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
    {TICK_MARKS.map((mark) => {
      const isHourMark = mark % 5 === 0;
      return (
        <View
          key={`tick-${mark}`}
          style={[
            styles.tick,
            isHourMark && styles.hourTick,
            {
              transform: [
                { rotate: `${mark * 6}deg` },
                {
                  translateY: -clockRadius + (isHourMark ? 26 : 22)
                }
              ]
            }
          ]}
        />
      );
    })}

    {HOUR_LABELS.map(({ label, angle }) => {
      const angleInRadians = (angle * Math.PI) / 180;
      const distanceFromCenter = clockRadius - 36;
      const x = clockRadius + Math.cos(angleInRadians) * distanceFromCenter;
      const y = clockRadius + Math.sin(angleInRadians) * distanceFromCenter;

      return (
        <Text
          key={`label-${label}`}
          style={[
            styles.hourLabel,
            {
              left: x - 11,
              top: y - 14
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
            transform: [{ translateY: -secondHandLength / 2 }]
          }
        ]}
      />
    </View>

    <View style={styles.centerOuter} />
    <View style={styles.centerInner} />
  </View>
);

const AlarmTab = () => {
  const alarms = [
    { time: "07:00 AM", label: "Morning Run", active: true },
    { time: "08:30 AM", label: "Standup", active: true },
    { time: "10:00 PM", label: "Wind Down", active: false }
  ];

  return (
    <View style={styles.tabContainer}>
      {alarms.map((alarm) => (
        <View key={alarm.time} style={styles.alarmCard}>
          <View>
            <Text style={styles.alarmTime}>{alarm.time}</Text>
            <Text style={styles.alarmLabel}>{alarm.label}</Text>
          </View>
          <View
            style={[
              styles.alarmToggle,
              alarm.active && styles.alarmToggleActive
            ]}
          >
            <View
              style={[
                styles.alarmToggleKnob,
                alarm.active && styles.alarmToggleKnobActive
              ]}
            />
          </View>
        </View>
      ))}
      <View style={styles.alarmFooter}>
        <Text style={styles.alarmFooterText}>Add new alarm</Text>
      </View>
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
