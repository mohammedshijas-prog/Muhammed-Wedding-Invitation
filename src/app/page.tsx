"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { push, ref, serverTimestamp } from "firebase/database";
import { database } from "@/lib/firebase";

const VIDEOS = {
  ar: {
    src: "/wedding-scene-1.mp4",
    poster: "/wedding-poster.jpg",
  },
  en: {
    src: "/wedding-scene-en.mp4",
    poster: "/wedding-poster-en.jpg",
  },
} as const;

type AttendanceStatus = "attending" | "declined";
type Language = "ar" | "en";

const CONTENT = {
  ar: {
    direction: "rtl",
    desktopEyebrow: "تجربة مخصصة للجوال",
    desktopTitle: "افتح الدعوة من جهاز جوال.",
    desktopCopy: "صُممت هذه الدعوة كتجربة عمودية كاملة الشاشة لتناسب الهاتف.",
    chooseLanguage: "اختر اللغة",
    arabic: "العربية",
    english: "English",
    replay: "إعادة التشغيل",
    saveDate: "احفظوا التاريخ",
    intro: "إلى كل غالٍ ومحب، تكتمل فرحتنا بحضوركم",
    blessing: "بارك الله لكما وبارك عليكما وجمع بينكما في خير",
    datePoem: "لحظات الفرح اختارت من العمر موعدًا، ليلة يعلوها الفرح والسرور والرضا",
    countdown: {
      days: "يوم",
      hours: "ساعة",
      minutes: "دقيقة",
      seconds: "ثانية",
    },
    rsvpButton: "تأكيد الحضور",
    calendarButton: "أضف إلى التقويم",
    venueTitle: "قاعة الاستقبال",
    venueSubtitle: "",
    venueName: "فور سيزونز عمّان",
    venueMapTitle: "خريطة فور سيزونز عمّان",
    closingLead: "إلى أعزاء الروح وأحباب القلب",
    closingSmall: "تشرّف",
    closingName: "عواطف الجهني",
    rsvp: {
      title: "تأكيد الحضور",
      close: "إغلاق نموذج تأكيد الحضور",
      name: "الاسم",
      namePlaceholder: "اكتب اسمك",
      attendQuestion: "هل ستحضر؟",
      attend: "سأحضر",
      decline: "نعتذر، لن أتمكن من الحضور",
      guests: "عدد الضيوف (يشملك)",
      submit: "تأكيد",
      saving: "جاري الحفظ...",
      missingName: "يرجى كتابة الاسم.",
      success: "شكرًا لكم، تم حفظ تأكيد الحضور.",
      error: "تعذر حفظ الرد. يرجى المحاولة مرة أخرى.",
    },
  },
  en: {
    direction: "ltr",
    desktopEyebrow: "Mobile experience",
    desktopTitle: "Open the invitation on a mobile device.",
    desktopCopy:
      "This invitation is designed as a full-screen vertical mobile experience.",
    chooseLanguage: "Choose language",
    arabic: "العربية",
    english: "English",
    replay: "Play again",
    saveDate: "Save The Date",
    intro:
      "To every dear heart, our joy is complete with your presence.",
    blessing: "May Allah bless you both and gather you in goodness.",
    datePoem:
      "A joyful night chosen from a lifetime of memories, filled with love, happiness, and grace.",
    countdown: {
      days: "days",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds",
    },
    rsvpButton: "Confirm Attendance",
    calendarButton: "Add to Calendar",
    venueTitle: "Reception Venue",
    venueSubtitle: "",
    venueName: "Four Seasons Hotel Amman",
    venueMapTitle: "Map of Four Seasons Hotel Amman",
    closingLead: "To our dearest family and friends",
    closingSmall: "honored by",
    closingName: "Awatif Al-Juhani",
    rsvp: {
      title: "Confirm your attendance",
      close: "Close RSVP form",
      name: "Your name",
      namePlaceholder: "Enter your name",
      attendQuestion: "Will you attend?",
      attend: "I will attend",
      decline: "Sorry, I can't make it",
      guests: "Number of guests (including you)",
      submit: "Confirm",
      saving: "Saving...",
      missingName: "Please enter your name.",
      success: "Thank you. Your RSVP has been saved.",
      error: "Could not save RSVP. Please try again.",
    },
  },
} as const;

const WEDDING_DATE = new Date("2026-08-28T00:00:00+04:00").getTime();

function getCountdown() {
  const distance = Math.max(WEDDING_DATE - Date.now(), 0);
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  const minute = 1000 * 60;

  return {
    days: Math.floor(distance / day),
    hours: Math.floor((distance % day) / hour),
    minutes: Math.floor((distance % hour) / minute),
    seconds: Math.floor((distance % minute) / 1000),
  };
}

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function toArabicDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

function downloadCalendarInvite() {
  const event = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//دعوة زفاف//AR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:wedding-28-08-26@wedding-invitation.local",
    "DTSTAMP:20260803T000000Z",
    "DTSTART;VALUE=DATE:20260828",
    "DTEND;VALUE=DATE:20260829",
    "SUMMARY:حفل زفاف محمد وديانا",
    "LOCATION:Four Seasons Hotel Amman",
    "DESCRIPTION:يسعدنا أن تشاركونا فرحتنا في هذا اليوم المميز.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const file = new Blob([event], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = "دعوة-زفاف-٢٨-٠٨-٢٠٢٦.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldPlaySelectedVideoRef = useRef(false);
  const [language, setLanguage] = useState<Language>("ar");
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [scene2Finished, setScene2Finished] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown);
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [attendance, setAttendance] = useState<AttendanceStatus>("attending");
  const [guestCount, setGuestCount] = useState(1);
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpMessage, setRsvpMessage] = useState("");

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, []);

  const copy = CONTENT[language];
  const isArabic = language === "ar";
  const formatValue = (value: number | string) =>
    isArabic ? toArabicDigits(value) : String(value);

  const startMedia = async ({ reset = false } = {}) => {
    if (hasStarted && !reset) {
      try {
        await audioRef.current?.play();
      } catch {
        // Audio may remain blocked until a valid user gesture.
      }
      return;
    }

    setScene2Finished(false);

    try {
      const video = videoRef.current;

      if (video && reset) {
        if (Number.isFinite(video.duration)) {
          video.currentTime = 0;
        }
      }

      await video?.play();
      setHasStarted(true);
    } catch {
      // Keep the poster frame visible if playback fails for any reason.
    }

    try {
      await audioRef.current?.play();
    } catch {
      // Audio may remain blocked until a valid user gesture.
    }
  };

  const selectLanguage = (nextLanguage: Language) => {
    shouldPlaySelectedVideoRef.current = true;
    setLanguage(nextLanguage);
    setHasSelectedLanguage(true);
    setHasStarted(false);
    setScene2Finished(false);

    try {
      void audioRef.current?.play();
    } catch {
      // Audio may remain blocked until a valid user gesture.
    }

    if (nextLanguage === language) {
      shouldPlaySelectedVideoRef.current = false;
      void startMedia({ reset: true });
    }
  };

  const replayVideo = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    void startMedia({ reset: true });
  };

  const closeRsvp = () => {
    if (isSubmittingRsvp) {
      return;
    }

    setIsRsvpOpen(false);
    setRsvpMessage("");
  };

  const submitRsvp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!guestName.trim()) {
      setRsvpMessage(copy.rsvp.missingName);
      return;
    }

    setIsSubmittingRsvp(true);
    setRsvpMessage("");

    try {
      await push(ref(database, "rsvps"), {
        name: guestName.trim(),
        attendance,
        guests: attendance === "attending" ? guestCount : 0,
        createdAt: serverTimestamp(),
      });

      setRsvpMessage(copy.rsvp.success);
      setGuestName("");
      setAttendance("attending");
      setGuestCount(1);

      window.setTimeout(() => {
        setIsRsvpOpen(false);
        setRsvpMessage("");
      }, 1100);
    } catch {
      setRsvpMessage(copy.rsvp.error);
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const holdLastFrame = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (Number.isFinite(video.duration)) {
      video.currentTime = Math.max(video.duration - 0.05, 0);
    }

    video.pause();

    setScene2Finished(true);
  };

  const selectedVideo = VIDEOS[language];

  return (
    <main className="page-shell" dir={copy.direction} lang={language}>
      <section
        className="mobile-invitation"
        aria-label="Wedding invitation video"
      >
        <video
          key={language}
          ref={videoRef}
          className="background-video"
          src={selectedVideo.src}
          poster={selectedVideo.poster}
          autoPlay={hasSelectedLanguage}
          muted
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          onPlay={() => {
            setHasStarted(true);
          }}
          onCanPlay={() => {
            if (!shouldPlaySelectedVideoRef.current) {
              return;
            }

            shouldPlaySelectedVideoRef.current = false;
            void startMedia({ reset: true });
          }}
          onEnded={holdLastFrame}
        />

        <button
          className="language-toggle-button"
          type="button"
          onClick={() => selectLanguage(isArabic ? "en" : "ar")}
        >
          {isArabic ? copy.english : copy.arabic}
        </button>

        <audio ref={audioRef} preload="auto" loop>
          <source src="/wedding-music.mp3" type="audio/mpeg" />
        </audio>

        {scene2Finished ? (
          <>
            <button
              className="replay-video-button"
              type="button"
              onClick={replayVideo}
            >
              {copy.replay}
            </button>
          </>
        ) : null}

      </section>

      <section className="desktop-message" aria-label="Desktop notice">
        <div className="desktop-card">
          <p className="desktop-eyebrow">{copy.desktopEyebrow}</p>
          <h2>{copy.desktopTitle}</h2>
          <p>{copy.desktopCopy}</p>
        </div>
      </section>

      <section
        className="invitation-details"
        aria-label="Wedding invitation details"
      >
        <div className="details-card">
          <div className="hero-details">
            <p className="intro-copy">{copy.intro}</p>
            {isArabic ? (
              <Image
                className="arabic-blessing-image"
                src="/arabic-blessing-frame.png"
                alt={copy.blessing}
                width={1024}
                height={263}
                priority
                unoptimized
              />
            ) : (
              <p className="blessing-copy">{copy.blessing}</p>
            )}
            <Image
              className="save-date-ornament"
              src="/figma-after-scroll-ornament.png"
              alt=""
              width={105}
              height={64}
              aria-hidden="true"
              unoptimized
            />
            <p className="save-date">{copy.saveDate}</p>
            <h1>{formatValue("28.08.26")}</h1>
            <p className="date-poem">{copy.datePoem}</p>

            <div className="countdown" aria-label="Wedding countdown">
              <div>
                <strong>{formatValue(countdown.days)}</strong>
                <span>{copy.countdown.days}</span>
              </div>
              <div>
                <strong>{formatValue(padTime(countdown.hours))}</strong>
                <span>{copy.countdown.hours}</span>
              </div>
              <div>
                <strong>{formatValue(padTime(countdown.minutes))}</strong>
                <span>{copy.countdown.minutes}</span>
              </div>
              <div>
                <strong>{formatValue(padTime(countdown.seconds))}</strong>
                <span>{copy.countdown.seconds}</span>
              </div>
            </div>

            <button
              className="rsvp-open-button"
              type="button"
              onClick={() => setIsRsvpOpen(true)}
            >
              {copy.rsvpButton}
            </button>

            <button
              className="calendar-button"
              type="button"
              onClick={downloadCalendarInvite}
            >
              {copy.calendarButton}
            </button>
          </div>

          <div className="venue-section">
            <h2>
              {copy.venueTitle}
              {copy.venueSubtitle ? <span>{copy.venueSubtitle}</span> : null}
            </h2>
            <p className="venue-name">{copy.venueName}</p>
            <a
              className="venue-map-link"
              href="https://www.google.com/maps/search/?api=1&query=Four%20Seasons%20Hotel%20Amman"
              target="_blank"
              rel="noreferrer"
              aria-label={copy.venueMapTitle}
            >
              <Image
                className="venue-map-image"
                src="/figma-after-scroll-map.png"
                alt={copy.venueMapTitle}
                fill
                sizes="270px"
                unoptimized
              />
            </a>
          </div>

          <div className="closing-section" aria-label="Closing message">
            <Image
              className="closing-icon"
              src="/figma-after-scroll-rings.png"
              alt=""
              width={45}
              height={43}
              aria-hidden="true"
              unoptimized
            />
            <p className="closing-lead">{copy.closingLead}</p>
            <span>{copy.closingSmall}</span>
            <p className="closing-name">{copy.closingName}</p>
          </div>
        </div>
      </section>

      {isRsvpOpen ? (
        <div className="rsvp-overlay" role="dialog" aria-modal="true">
          <form className="rsvp-modal" onSubmit={submitRsvp}>
            <button
              className="rsvp-close"
              type="button"
              aria-label={copy.rsvp.close}
              onClick={closeRsvp}
            >
              ×
            </button>

            <h2>{copy.rsvp.title}</h2>

            <label className="rsvp-field">
              <span>{copy.rsvp.name}</span>
              <input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder={copy.rsvp.namePlaceholder}
                autoComplete="name"
              />
            </label>

            <div className="rsvp-field">
              <span>{copy.rsvp.attendQuestion}</span>
              <div className="rsvp-options">
                <button
                  className={`rsvp-option attend${
                    attendance === "attending" ? " selected" : ""
                  }`}
                  type="button"
                  onClick={() => setAttendance("attending")}
                >
                  <span className="option-icon">✓</span>
                  <span>{copy.rsvp.attend}</span>
                </button>

                <button
                  className={`rsvp-option decline${
                    attendance === "declined" ? " selected" : ""
                  }`}
                  type="button"
                  onClick={() => setAttendance("declined")}
                >
                  <span className="option-icon">×</span>
                  <span>{copy.rsvp.decline}</span>
                </button>
              </div>
            </div>

            {attendance === "attending" ? (
              <div className="guest-count-row">
                <span>{copy.rsvp.guests}</span>
                <div className="guest-stepper">
                  <button
                    type="button"
                    onClick={() => setGuestCount((count) => Math.max(1, count - 1))}
                  >
                    −
                  </button>
                  <strong>{formatValue(guestCount)}</strong>
                  <button
                    type="button"
                    onClick={() => setGuestCount((count) => Math.min(10, count + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}

            {rsvpMessage ? <p className="rsvp-status">{rsvpMessage}</p> : null}

            <button
              className="rsvp-confirm"
              type="submit"
              disabled={isSubmittingRsvp}
            >
              {isSubmittingRsvp ? copy.rsvp.saving : copy.rsvp.submit}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
