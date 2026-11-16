"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("id, notification_type, title, message, is_read, created_at")
        .eq("user_id", user.id)
        .eq("channel", "in_app")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!active) return;

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((item) => !item.is_read).length);
      }

      setLoading(false);
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  async function markAsRead(id: string) {
    const supabase = createClient();

    const { error } = await supabase.rpc("mark_notification_as_read", {
      p_notification_id: id,
    });

    if (error) {
      console.error("Failed to mark notification as read:", error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    );

    setUnreadCount((current) => Math.max(0, current - 1));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#7a5443] transition-colors hover:bg-[#f3e5d8]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#a86f52] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-[60] w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-[#eadfd5] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#eadfd5] px-5 py-4">
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#3d3029]">
                Notifications
              </h3>
              <p className="mt-0.5 text-xs text-[#8b7b70]">
                {unreadCount} unread notifications
              </p>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-[#8b7b70]">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-2xl">🔔</p>
                <p className="mt-3 text-sm font-medium text-[#3d3029]">
                  You're all caught up!
                </p>
                <p className="mt-1 text-xs text-[#8b7b70]">
                  Your notifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.is_read) markAsRead(item.id);
                  }}
                  className={`block w-full border-b border-[#f3e5d8] px-5 py-4 text-left transition-colors hover:bg-[#fffaf5] ${
                    !item.is_read ? "bg-[#fffaf5]" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.is_read ? "bg-transparent" : "bg-[#a86f52]"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#3d3029]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#8b7b70]">
                        {item.message}
                      </p>
                      <p className="mt-2 text-[10px] text-[#a89a90]">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-[#eadfd5] px-5 py-3">
            <p className="text-center text-xs text-[#8b7b70]">
              Showing your 10 most recent notifications
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
