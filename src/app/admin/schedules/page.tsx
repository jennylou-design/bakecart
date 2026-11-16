
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Package,
  Plus,
  Pencil,
  X,
  Save,
  RefreshCw,
  Loader2,
} from "lucide-react";

type FulfillmentType = "pickup" | "delivery";

type FulfillmentSlot = {
  id: string;
  fulfillment_type: FulfillmentType;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_orders: number;
  is_available: boolean;
};

type ScheduleForm = {
  fulfillment_type: FulfillmentType;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_orders: number;
};

const emptyForm: ScheduleForm = {
  fulfillment_type: "pickup",
  slot_date: "",
  start_time: "09:00",
  end_time: "10:00",
  max_orders: 5,
};

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminSchedulesPage() {
  const supabase = createClient();

  const [slots, setSlots] = useState<FulfillmentSlot[]>([]);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadSlots() {
    setLoading(true);

    const { data, error } = await supabase
      .from("fulfillment_slots")
      .select("*")
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Schedule loading error:", error);
      toast.error("Unable to load schedules.");
      setLoading(false);
      return;
    }

    setSlots((data ?? []) as FulfillmentSlot[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSlots();
    // Load schedules when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNewForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      slot_date: getToday(),
    });
    setShowForm(true);
  }

  function openEditForm(slot: FulfillmentSlot) {
    setEditingId(slot.id);

    setForm({
      fulfillment_type: slot.fulfillment_type,
      slot_date: slot.slot_date,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      max_orders: slot.max_orders,
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.slot_date) {
      toast.error("Please select a schedule date.");
      return;
    }

    if (form.slot_date < getToday()) {
      toast.error("Please select today or a future date.");
      return;
    }

    if (form.end_time <= form.start_time) {
      toast.error("End time must be later than start time.");
      return;
    }

    if (!Number.isInteger(Number(form.max_orders)) || form.max_orders < 1) {
      toast.error("Maximum orders must be at least 1.");
      return;
    }

    setSaving(true);

    const scheduleData = {
      fulfillment_type: form.fulfillment_type,
      slot_date: form.slot_date,
      start_time: form.start_time,
      end_time: form.end_time,
      max_orders: Number(form.max_orders),
    };

    const result = editingId
      ? await supabase
          .from("fulfillment_slots")
          .update(scheduleData)
          .eq("id", editingId)
      : await supabase
          .from("fulfillment_slots")
          .insert(scheduleData);

    if (result.error) {
      console.error("Schedule save error:", result.error);

      if (result.error.code === "23505") {
        toast.error("This schedule already exists.");
      } else {
        toast.error(result.error.message || "Unable to save schedule.");
      }

      setSaving(false);
      return;
    }

    toast.success(
      editingId
        ? "Schedule updated successfully!"
        : "Schedule created successfully!"
    );

    closeForm();
    await loadSlots();
    setSaving(false);
  }

  async function toggleAvailability(slot: FulfillmentSlot) {
    setUpdatingId(slot.id);

    const { error } = await supabase
      .from("fulfillment_slots")
      .update({ is_available: !slot.is_available })
      .eq("id", slot.id);

    if (error) {
      console.error("Schedule update error:", error);
      toast.error("Unable to update schedule availability.");
      setUpdatingId(null);
      return;
    }

    setSlots((current) =>
      current.map((item) =>
        item.id === slot.id
          ? { ...item, is_available: !item.is_available }
          : item
      )
    );

    toast.success(
      slot.is_available
        ? "Schedule disabled."
        : "Schedule enabled."
    );

    setUpdatingId(null);
  }

  const pickupCount = slots.filter(
    (slot) => slot.fulfillment_type === "pickup"
  ).length;

  const deliveryCount = slots.filter(
    (slot) => slot.fulfillment_type === "delivery"
  ).length;

  const activeCount = slots.filter(
    (slot) => slot.is_available
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-primary">
            BAKECART MANAGEMENT
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Schedule Management
          </h1>

          <p className="mt-2 text-sm text-muted">
            Manage available pickup and delivery schedules.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={18} />
          Add Schedule
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Total Schedules</p>
            <CalendarDays className="text-primary" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{slots.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Pickup Schedules</p>
            <Package className="text-primary" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{pickupCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Available Schedules</p>
            <Clock className="text-primary" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold">{activeCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Available Time Slots</h2>
            <p className="mt-1 text-sm text-muted">
              {deliveryCount} delivery schedules · {pickupCount} pickup schedules
            </p>
          </div>

          <button
            onClick={loadSlots}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-xl bg-[#f8f5f1] px-5 py-16 text-center">
            <CalendarDays className="mx-auto text-muted" size={36} />
            <h3 className="mt-4 font-semibold">No schedules yet</h3>
            <p className="mt-2 text-sm text-muted">
              Create your first pickup or delivery schedule.
            </p>
            <button
              onClick={openNewForm}
              className="mt-5 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Create First Schedule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-border p-5 md:flex-row md:items-center"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-primary">
                      {slot.fulfillment_type}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        slot.is_available
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {slot.is_available ? "Available" : "Disabled"}
                    </span>
                  </div>

                  <h3 className="font-semibold">
                    {formatDate(slot.slot_date)}
                  </h3>

                  <div className="flex flex-wrap gap-4 text-sm text-muted">
                    <span className="flex items-center gap-2">
                      <Clock size={15} />
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </span>

                    <span className="flex items-center gap-2">
                      <Package size={15} />
                      Maximum {slot.max_orders} orders
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditForm(slot)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-secondary"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    onClick={() => toggleAvailability(slot)}
                    disabled={updatingId === slot.id}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                      slot.is_available
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {updatingId === slot.id
                      ? "Updating..."
                      : slot.is_available
                        ? "Disable"
                        : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Schedule" : "Create Schedule"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Configure a new fulfillment time slot.
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-secondary"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Fulfillment Type
                </label>

                <select
                  value={form.fulfillment_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fulfillment_type: e.target.value as FulfillmentType,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Schedule Date
                </label>

                <input
                  type="date"
                  required
                  min={getToday()}
                  value={form.slot_date}
                  onChange={(e) =>
                    setForm({ ...form, slot_date: e.target.value })
                  }
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Start Time
                  </label>

                  <input
                    type="time"
                    required
                    value={form.start_time}
                    onChange={(e) =>
                      setForm({ ...form, start_time: e.target.value })
                    }
                    className="w-full rounded-lg border border-border px-3 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    End Time
                  </label>

                  <input
                    type="time"
                    required
                    value={form.end_time}
                    onChange={(e) =>
                      setForm({ ...form, end_time: e.target.value })
                    }
                    className="w-full rounded-lg border border-border px-3 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Maximum Orders
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.max_orders}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      max_orders: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm outline-none focus:border-primary"
                />

                <p className="mt-1 text-xs text-muted">
                  Maximum number of orders accepted during this time slot.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
