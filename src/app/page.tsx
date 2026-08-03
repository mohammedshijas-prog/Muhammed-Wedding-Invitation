"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

const WEDDING_DATE = new Date("2027-03-31T00:00:00+04:00").getTime();

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

function downloadCalendarInvite() {
  const event = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Invitation//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:wedding-31-03-27@wedding-invitation.local",
    "DTSTAMP:20260803T000000Z",
    "DTSTART;VALUE=DATE:20270331",
    "DTEND;VALUE=DATE:20270401",
    "SUMMARY:Wedding Reception",
    "LOCATION:The Ritz-Carlton, Amman",
    "DESCRIPTION:We are getting married and would love to share this moment with you.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const file = new Blob([event], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = "wedding-reception-31-03-27.ics";
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
      return;
    }

    try {
      await videoRef.current?.play();
      await audioRef.current?.play();
      setHasStarted(true);
    } catch {
      // Keep the poster frame visible if playback fails for any reason.
    }
  };

  const handleScreenTap = () => {
    if (!hasStarted) {
      void startMedia();
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

      if (sceneRef.current === 1) {
        setScene2Finished(false);
        shouldPlaySceneRef.current = true;
        setActiveScene(2);
      } else {
        setScene2Finished(true);
      }
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
          muted
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
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

        {!hasStarted ? <p className="tap-hint">Tap to start</p> : null}
      </section>

      <section className="desktop-message" aria-label="Desktop notice">
        <div className="desktop-card">
          <p className="desktop-eyebrow">Mobile Experience Only</p>
          <h2>Open this invitation on a mobile device.</h2>
          <p>
            This wedding invitation is designed as a full-screen vertical video
            experience.
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
            <p className="save-date">Save The Date</p>
            <h1>31.03.27</h1>
            <p className="intro-copy">
              We are getting married and we could not be happier to share this
              moment with you. Here you&apos;ll find the full wedding details:
              the schedule,
            </p>

            <div className="countdown" aria-label="Wedding countdown">
              <div>
                <strong>{countdown.days}</strong>
                <span>days</span>
              </div>
              <div>
                <strong>{padTime(countdown.hours)}</strong>
                <span>hours</span>
              </div>
              <div>
                <strong>{padTime(countdown.minutes)}</strong>
                <span>minutes</span>
              </div>
              <div>
                <strong>{padTime(countdown.seconds)}</strong>
                <span>seconds</span>
              </div>
            </div>

            <button
              className="calendar-button"
              type="button"
              onClick={downloadCalendarInvite}
            >
              Add to Calendar
            </button>
          </div>

          <div className="venue-section">
            <h2>
              Recaption
              <span>Venue</span>
            </h2>
            <p className="venue-name">Ritz Carlton, Amman</p>
            <iframe
              className="venue-map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3384.995842272909!2d35.8820578!3d31.9610095!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151ca051615155a1%3A0x4c2b19aef5c97126!2sThe%20Ritz-Carlton%2C%20Amman!5e0!3m2!1sen!2sae!4v1785765807372!5m2!1sen!2sae"
              title="The Ritz-Carlton, Amman map"
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
            <p>Your presence would be the greatest gift we could receive!</p>
          </div>
        </div>
      </section>
    </main>
  );
}
