"use client";

import { onValue, ref, remove } from "firebase/database";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { database } from "@/lib/firebase";

type AttendanceStatus = "attending" | "declined";

type RsvpRecord = {
  id: string;
  name: string;
  attendance: AttendanceStatus;
  guests: number;
  message: string;
  createdAt?: number;
};

function formatDate(timestamp?: number) {
  if (!timestamp) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function AdminPage() {
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const rsvpsRef = ref(database, "rsvps");

    return onValue(
      rsvpsRef,
      (snapshot) => {
        const value = snapshot.val() as
          | Record<string, Omit<RsvpRecord, "id">>
          | null;

        const records = Object.entries(value ?? {})
          .map(([id, record]) => ({
            id,
            name: record.name ?? "",
            attendance: record.attendance ?? "attending",
            guests: Number(record.guests ?? 0),
            message: record.message ?? "",
            createdAt: record.createdAt,
          }))
          .sort((first, second) => (second.createdAt ?? 0) - (first.createdAt ?? 0));

        setRsvps(records);
        setLoadError("");
        setIsLoading(false);
      },
      () => {
        setLoadError("Unable to load RSVPs. Check Firebase Realtime Database rules.");
        setIsLoading(false);
      },
    );
  }, []);

  const stats = useMemo(() => {
    const attending = rsvps.filter((rsvp) => rsvp.attendance === "attending");
    const declined = rsvps.filter((rsvp) => rsvp.attendance === "declined");

    return {
      total: rsvps.length,
      attending: attending.length,
      declined: declined.length,
      guests: attending.reduce((total, rsvp) => total + rsvp.guests, 0),
    };
  }, [rsvps]);

  const downloadCsv = () => {
    const rows = [
      ["Name", "Attendance", "Guests", "Message", "Submitted at"],
      ...rsvps.map((rsvp) => [
        rsvp.name,
        rsvp.attendance === "attending" ? "Will attend" : "Cannot attend",
        rsvp.guests,
        rsvp.message,
        formatDate(rsvp.createdAt),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");
    const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = "wedding-rsvps.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const deleteRsvp = async (rsvp: RsvpRecord) => {
    const shouldDelete = window.confirm(`Delete RSVP for ${rsvp.name}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingId(rsvp.id);
    setLoadError("");

    try {
      await remove(ref(database, `rsvps/${rsvp.id}`));
    } catch {
      setLoadError("Unable to delete RSVP. Check Firebase Realtime Database rules.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">Wedding Admin</p>
          <h1>RSVP Dashboard</h1>
          <p>
            View every confirmation saved from the invitation form in Firebase.
          </p>
        </div>

        <div className="admin-actions">
          <Link className="admin-secondary-link" href="/">
            View Invitation
          </Link>
          <button type="button" onClick={downloadCsv} disabled={!rsvps.length}>
            Download CSV
          </button>
        </div>
      </section>

      <section className="admin-stats" aria-label="RSVP totals">
        <article>
          <span>Total RSVPs</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Attending</span>
          <strong>{stats.attending}</strong>
        </article>
        <article>
          <span>Total Guests</span>
          <strong>{stats.guests}</strong>
        </article>
        <article>
          <span>Not Attending</span>
          <strong>{stats.declined}</strong>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>Guest Responses</h2>
          <p>{isLoading ? "Loading RSVPs..." : `${rsvps.length} responses`}</p>
        </div>

        {loadError ? <p className="admin-error">{loadError}</p> : null}

        {!isLoading && !rsvps.length && !loadError ? (
          <div className="admin-empty">No RSVP responses yet.</div>
        ) : null}

        {rsvps.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Guests</th>
                    <th>Message</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map((rsvp) => (
                    <tr key={rsvp.id}>
                      <td>{rsvp.name}</td>
                      <td>
                        <span className={`admin-badge ${rsvp.attendance}`}>
                          {rsvp.attendance === "attending"
                            ? "Will attend"
                            : "Cannot attend"}
                        </span>
                      </td>
                      <td>{rsvp.attendance === "attending" ? rsvp.guests : "-"}</td>
                      <td>{rsvp.message || "-"}</td>
                      <td>{formatDate(rsvp.createdAt)}</td>
                      <td>
                        <button
                          className="admin-delete-button"
                          type="button"
                          onClick={() => void deleteRsvp(rsvp)}
                          disabled={deletingId === rsvp.id}
                        >
                          {deletingId === rsvp.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-card-list">
              {rsvps.map((rsvp) => (
                <article className="admin-response-card" key={rsvp.id}>
                  <div>
                    <h3>{rsvp.name}</h3>
                    <span className={`admin-badge ${rsvp.attendance}`}>
                      {rsvp.attendance === "attending"
                        ? "Will attend"
                        : "Cannot attend"}
                    </span>
                  </div>
                  <p>
                    <strong>Guests:</strong>{" "}
                    {rsvp.attendance === "attending" ? rsvp.guests : "-"}
                  </p>
                  <p>
                    <strong>Message:</strong> {rsvp.message || "-"}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {formatDate(rsvp.createdAt)}
                  </p>
                  <button
                    className="admin-delete-button"
                    type="button"
                    onClick={() => void deleteRsvp(rsvp)}
                    disabled={deletingId === rsvp.id}
                  >
                    {deletingId === rsvp.id ? "Deleting..." : "Delete"}
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
