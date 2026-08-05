"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { push, ref, serverTimestamp } from "firebase/database";
import { database } from "@/lib/firebase";

const SCENES = {
  1: {
    src: "/wedding-scene-1.mp4",
    poster: "/wedding-poster.jpg",
  },
  2: {
    src: "/wedding-scene-2.mp4",
    poster: "/wedding-poster-2.jpg",
  },
} as const;

type Scene = keyof typeof SCENES;
type AttendanceStatus = "attending" | "declined";

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
    "LOCATION:ريتز كارلتون، عمّان",
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

function slowScrollTo(element: HTMLElement, duration = 5200) {
  const start = window.scrollY;
  const end = element.getBoundingClientRect().top + window.scrollY;
  const distance = end - start;
  const startTime = performance.now();

  const easeInOut = (progress: number) =>
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    window.scrollTo(0, start + distance * easeInOut(progress));

    if (progress < 1) {
      window.requestAnimationFrame(animate);
    }
  };

  window.requestAnimationFrame(animate);
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const sceneRef = useRef<Scene>(1);
  const shouldPlaySceneRef = useRef(false);
  const rewindToSceneEndRef = useRef(false);
  const [activeScene, setActiveScene] = useState<Scene>(1);
  const [hasStarted, setHasStarted] = useState(false);
  const [scene2Finished, setScene2Finished] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown);
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [attendance, setAttendance] = useState<AttendanceStatus>("attending");
  const [guestCount, setGuestCount] = useState(1);
  const [guestMessage, setGuestMessage] = useState("");
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpMessage, setRsvpMessage] = useState("");

  useEffect(() => {
    const autoplayIntro = async () => {
      try {
        await videoRef.current?.play();
        setHasStarted(true);
      } catch {
        // Keep the first frame visible if a browser blocks autoplay.
      }

      try {
        await audioRef.current?.play();
      } catch {
        // iOS may require user interaction before audio can start.
      }
    };

    void autoplayIntro();
  }, []);

  useEffect(() => {
    sceneRef.current = activeScene;

    if (!shouldPlaySceneRef.current) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    shouldPlaySceneRef.current = false;
    video.currentTime = 0;
    void video.play();
  }, [activeScene]);

  useEffect(() => {
    document.documentElement.style.overflow = scene2Finished ? "" : "hidden";
    document.body.style.overflow = scene2Finished ? "" : "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [scene2Finished]);

  useEffect(() => {
    if (!scene2Finished) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      if (detailsRef.current) {
        slowScrollTo(detailsRef.current);
      }
    }, 1200);

    return () => window.clearTimeout(scrollTimer);
  }, [scene2Finished]);

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, []);

  const startMedia = async () => {
    if (hasStarted) {
      try {
        await audioRef.current?.play();
      } catch {
        // Audio may remain blocked until a valid user gesture.
      }
      return;
    }

    try {
      await videoRef.current?.play();
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

  const handleScreenTap = () => {
    if (!hasStarted) {
      void startMedia();
    }
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
      setRsvpMessage("Please enter your name.");
      return;
    }

    setIsSubmittingRsvp(true);
    setRsvpMessage("");

    try {
      await push(ref(database, "rsvps"), {
        name: guestName.trim(),
        attendance,
        guests: attendance === "attending" ? guestCount : 0,
        message: guestMessage.trim(),
        createdAt: serverTimestamp(),
      });

      setRsvpMessage("Thank you. Your RSVP has been saved.");
      setGuestName("");
      setAttendance("attending");
      setGuestCount(1);
      setGuestMessage("");

      window.setTimeout(() => {
        setIsRsvpOpen(false);
        setRsvpMessage("");
      }, 1100);
    } catch {
      setRsvpMessage("Could not save RSVP. Please try again.");
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const holdLastFrame = () => {
    window.setTimeout(() => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      if (Number.isFinite(video.duration)) {
        video.currentTime = Math.max(video.duration - 0.05, 0);
      }

      video.pause();

      setScene2Finished(true);
    }, 1000);
  };

  const scrubVideo = (deltaY: number) => {
    const video = videoRef.current;

    if (!video || !hasStarted || !Number.isFinite(video.duration)) {
      return;
    }

    if (scene2Finished && deltaY < 0) {
      setScene2Finished(false);
    }

    const nextTime = Math.min(
      Math.max(video.currentTime + deltaY * 0.003, 0),
      video.duration,
    );

    if (activeScene === 2 && deltaY < 0 && nextTime <= 0.05) {
      rewindToSceneEndRef.current = true;
      setActiveScene(1);
      return;
    }

    video.pause();
    video.currentTime = nextTime;
  };

  const scene = SCENES[activeScene];

  return (
    <main className="page-shell">
      <section
        className="mobile-invitation"
        aria-label="Wedding invitation video"
        onClick={handleScreenTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleScreenTap();
          }
        }}
        onWheel={(event) => {
          scrubVideo(event.deltaY);
        }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(event) => {
          const currentY = event.touches[0]?.clientY;
          const previousY = touchStartYRef.current;

          if (currentY == null || previousY == null) {
            return;
          }

          scrubVideo(previousY - currentY);
          touchStartYRef.current = currentY;
        }}
        role="button"
        tabIndex={0}
      >
        <video
          key={activeScene}
          ref={videoRef}
          className="background-video"
          src={scene.src}
          poster={scene.poster}
          autoPlay
          muted
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          onPlay={() => {
            setHasStarted(true);
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current;

            if (
              !video ||
              !rewindToSceneEndRef.current ||
              !Number.isFinite(video.duration)
            ) {
              return;
            }

            rewindToSceneEndRef.current = false;
            video.currentTime = Math.max(video.duration - 0.05, 0);
            video.pause();
          }}
          onCanPlay={() => {
            if (shouldPlaySceneRef.current) {
              shouldPlaySceneRef.current = false;
              void videoRef.current?.play();
            }
          }}
          onEnded={holdLastFrame}
        />

        {!hasStarted && !scene2Finished ? (
          <Image
            className="video-poster-overlay"
            src="/wedding-poster.jpg"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority
            quality={100}
            unoptimized
          />
        ) : null}

        <audio ref={audioRef} preload="auto" loop>
          <source src="/wedding-music.mp3" type="audio/mpeg" />
        </audio>

        {scene2Finished ? (
          <Image
            className="last-frame"
            src="/wedding-last-frame-2.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority
            quality={100}
            unoptimized
          />
        ) : null}

      </section>

      <section className="desktop-message" aria-label="Desktop notice">
        <div className="desktop-card">
          <p className="desktop-eyebrow">تجربة مخصصة للجوال</p>
          <h2>افتح الدعوة من جهاز جوال.</h2>
          <p>
            صُممت هذه الدعوة كتجربة عمودية كاملة الشاشة لتناسب الهاتف.
          </p>
        </div>
      </section>

      <section
        ref={detailsRef}
        className="invitation-details"
        aria-label="Wedding invitation details"
      >
        <div className="details-card">
          <div className="hero-details">
            <p className="save-date">احفظوا التاريخ</p>
            <h1>{toArabicDigits("28.08.26")}</h1>
            <p className="intro-copy">
              بكل حب وفرح، يسعدنا أن نشارككم لحظة زفافنا. تجدون هنا تفاصيل
              الحفل كاملة وجدول المناسبة.
            </p>

            <div className="countdown" aria-label="Wedding countdown">
              <div>
                <strong>{toArabicDigits(countdown.days)}</strong>
                <span>يوم</span>
              </div>
              <div>
                <strong>{toArabicDigits(padTime(countdown.hours))}</strong>
                <span>ساعة</span>
              </div>
              <div>
                <strong>{toArabicDigits(padTime(countdown.minutes))}</strong>
                <span>دقيقة</span>
              </div>
              <div>
                <strong>{toArabicDigits(padTime(countdown.seconds))}</strong>
                <span>ثانية</span>
              </div>
            </div>

            <button
              className="calendar-button"
              type="button"
              onClick={downloadCalendarInvite}
            >
              أضف إلى التقويم
            </button>

            <button
              className="rsvp-open-button"
              type="button"
              onClick={() => setIsRsvpOpen(true)}
            >
              Confirm Attendance
            </button>
          </div>

          <div className="venue-section">
            <h2>
              مكان
              <span>الحفل</span>
            </h2>
            <p className="venue-name">ريتز كارلتون، عمّان</p>
            <iframe
              className="venue-map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3384.995842272909!2d35.8820578!3d31.9610095!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151ca051615155a1%3A0x4c2b19aef5c97126!2sThe%20Ritz-Carlton%2C%20Amman!5e0!3m2!1sen!2sae!4v1785765807372!5m2!1sen!2sae"
              title="خريطة ريتز كارلتون، عمّان"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="closing-section" aria-label="Closing message">
            <Image
              className="closing-icon"
              src="/closing-rings.png"
              alt=""
              width={72}
              height={58}
              aria-hidden="true"
              unoptimized
            />
            <p>حضوركم هو أجمل هدية يمكن أن نتلقاها!</p>
          </div>
        </div>
      </section>

      {isRsvpOpen ? (
        <div className="rsvp-overlay" role="dialog" aria-modal="true">
          <form className="rsvp-modal" onSubmit={submitRsvp}>
            <button
              className="rsvp-close"
              type="button"
              aria-label="Close RSVP"
              onClick={closeRsvp}
            >
              ×
            </button>

            <h2>Confirm your attendance</h2>
            <p className="rsvp-intro">
              Your presence would be an honor. Please RSVP so we can prepare
              the warmest welcome for you.
            </p>

            <label className="rsvp-field">
              <span>Your name</span>
              <input
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
              />
            </label>

            <div className="rsvp-field">
              <span>Will you attend?</span>
              <div className="rsvp-options">
                <button
                  className={`rsvp-option attend${
                    attendance === "attending" ? " selected" : ""
                  }`}
                  type="button"
                  onClick={() => setAttendance("attending")}
                >
                  <span className="option-icon">✓</span>
                  <span>I will attend</span>
                </button>

                <button
                  className={`rsvp-option decline${
                    attendance === "declined" ? " selected" : ""
                  }`}
                  type="button"
                  onClick={() => setAttendance("declined")}
                >
                  <span className="option-icon">×</span>
                  <span>Sorry, I can&apos;t make it</span>
                </button>
              </div>
            </div>

            {attendance === "attending" ? (
              <div className="guest-count-row">
                <span>Number of guests (including you)</span>
                <div className="guest-stepper">
                  <button
                    type="button"
                    onClick={() => setGuestCount((count) => Math.max(1, count - 1))}
                  >
                    −
                  </button>
                  <strong>{guestCount}</strong>
                  <button
                    type="button"
                    onClick={() => setGuestCount((count) => Math.min(10, count + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}

            <label className="rsvp-field">
              <span>Message to the couple</span>
              <textarea
                value={guestMessage}
                onChange={(event) => setGuestMessage(event.target.value)}
                placeholder="Leave a note (optional)"
              />
            </label>

            {rsvpMessage ? <p className="rsvp-status">{rsvpMessage}</p> : null}

            <button
              className="rsvp-confirm"
              type="submit"
              disabled={isSubmittingRsvp || !guestName.trim()}
            >
              {isSubmittingRsvp ? "Saving..." : "Confirm"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
