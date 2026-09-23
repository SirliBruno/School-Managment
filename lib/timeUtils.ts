/**
 * دوال مساعدة لحساب الفارق الزمني بين وقتين وتنسيقه باللغة العربية بالساعات والدقائق
 */

export interface TimeDifferenceResult {
  totalMinutes: number;
  hours: number;
  minutes: number;
  formattedDuration: string;
  detailedText: string;
  isValid: boolean;
  error?: string;
}

/**
 * حساب الفارق بين وقتين بصيغة HH:MM
 * @param fromTime وقت البداية مثل "08:00"
 * @param toTime وقت النهاية مثل "10:00"
 */
export function calculateTimeDifference(
  fromTime: string,
  toTime: string
): TimeDifferenceResult {
  if (!fromTime || !toTime) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      formattedDuration: "—",
      detailedText: "",
      isValid: false,
      error: "يرجى تحديد وقت البداية ووقت النهاية",
    };
  }

  const [fromH, fromM] = fromTime.split(":").map(Number);
  const [toH, toM] = toTime.split(":").map(Number);

  if (
    isNaN(fromH) ||
    isNaN(fromM) ||
    isNaN(toH) ||
    isNaN(toM) ||
    fromH < 0 ||
    fromH > 23 ||
    toH < 0 ||
    toH > 23 ||
    fromM < 0 ||
    fromM > 59 ||
    toM < 0 ||
    toM > 59
  ) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      formattedDuration: "—",
      detailedText: "",
      isValid: false,
      error: "صيغة الوقت غير صالحة",
    };
  }

  const fromTotalMinutes = fromH * 60 + fromM;
  const toTotalMinutes = toH * 60 + toM;

  const diffMinutes = toTotalMinutes - fromTotalMinutes;

  if (diffMinutes <= 0) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      formattedDuration: "0 دقيقة",
      detailedText: "وقت النهاية يجب أن يكون بعد وقت البداية",
      isValid: false,
      error: "وقت النهاية يجب أن يكون بعد وقت البداية",
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  // تنسيق لغوي عربي سليم
  let formattedDuration = "";

  if (hours === 0) {
    formattedDuration = `${minutes} دقيقة`;
  } else if (minutes === 0) {
    if (hours === 1) formattedDuration = "ساعة واحدة";
    else if (hours === 2) formattedDuration = "ساعتان";
    else if (hours >= 3 && hours <= 10) formattedDuration = `${hours} ساعات`;
    else formattedDuration = `${hours} ساعة`;
  } else {
    let hourPart = "";
    if (hours === 1) hourPart = "ساعة واحدة";
    else if (hours === 2) hourPart = "ساعتان";
    else if (hours >= 3 && hours <= 10) hourPart = `${hours} ساعات`;
    else hourPart = `${hours} ساعة`;

    formattedDuration = `${hourPart} و ${minutes} دقيقة`;
  }

  const detailedText = `${hours} ساعة و ${minutes} دقيقة (${formattedDuration})`;

  return {
    totalMinutes: diffMinutes,
    hours,
    minutes,
    formattedDuration,
    detailedText,
    isValid: true,
  };
}
