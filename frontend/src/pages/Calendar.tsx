import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";

// ==========================================
// INTERFACES (Sesuai Struktur JSON Backend)
// ==========================================
interface BackendAssignee {
  id: string;
  name: string;
  avatar: string | null;
}

interface BackendRelation {
  id: string;
  name: string;
}

interface BackendTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  campaign: BackendRelation | null;
  board: BackendRelation | null;
  assignees: BackendAssignee[];
}

interface BackendDayData {
  total: number;
  tasks: BackendTask[];
}

interface BackendApiResponse {
  month: string;
  summary: {
    total_tasks: number;
    active_days: number;
  };
  days: Record<string, BackendDayData>; // Mapping tanggal "YYYY-MM-DD" ke data tugas
}

// Extends EventInput milik FullCalendar secara aman
interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    status: string;
    campaign: BackendRelation | null;
    board: BackendRelation | null;
    assignees: BackendAssignee[];
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toISOString().split("T")[0].substring(0, 7) // Format awal: "YYYY-MM"
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const statusColors: Record<string, string> = {
    todo: "primary",
    "in-progress": "warning",
    completed: "success",
    backlog: "danger",
  };

const fetchCalendarData = async (monthStr: string) => {
    setIsLoading(true);
    try {
      // Pastikan URL mengarah ke endpoint Laravel yang benar
      const response = await fetch(`/api/calendar?month=${monthStr}`, {
        headers: {
          "Accept": "application/json",
          // "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data: BackendApiResponse = await response.json();

      if (data && data.days) {
        const formattedEvents: CalendarEvent[] = [];
        
        // Loop map key tanggal "2026-07-31"
        Object.entries(data.days).forEach(([dateStr, dayData]) => {
          if (dayData && Array.isArray(dayData.tasks)) {
            dayData.tasks.forEach((task) => {
              // SOLUSI: Langsung gunakan dateStr dari key induk sebagai tanggal start kalender 
              // untuk menjamin FullCalendar bisa merendernya dengan tepat di tanggal tersebut.
              formattedEvents.push({
                id: task.id,
                title: task.title,
                start: dateStr, // Menggunakan "2026-07-31"
                allDay: true,
                extendedProps: {
                  status: task.status,
                  campaign: task.campaign,
                  board: task.board,
                  assignees: task.assignees,
                },
              });
            });
          }
        });

        console.log("Formatted Events untuk FullCalendar:", formattedEvents); // Debug check
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error("Gagal memuat data kalender:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData(currentMonth);
  }, [currentMonth]);

  // Handler dinamis pendeteksi perpindahan bulan/view aktif pada FullCalendar
const handleDatesSet = (dateInfo: { view: { currentStart: Date } }) => {
    const currentViewDate = dateInfo.view.currentStart;
    const year = currentViewDate.getFullYear();
    
    // FullCalendar view terkadang mengambil tanggal akhir bulan sebelumnya sebagai start grid.
    // Kita ambil amannya dengan mendeteksi bulan di tengah-tengah rentang view (ditambah 10 hari).
    const midViewDate = new Date(currentViewDate.getTime() + 10 * 24 * 60 * 60 * 1000);
    const month = String(midViewDate.getMonth() + 1).padStart(2, "0");
    const newMonthStr = `${year}-${month}`;
    
    if (newMonthStr !== currentMonth) {
      setCurrentMonth(newMonthStr);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    // Casting aman karena kita tahu struktur object event kita sendiri
    const clickedEvent = clickInfo.event.toPlainObject() as unknown as CalendarEvent;
    setSelectedEvent(clickedEvent);
    openModal();
  };

  const handleCloseModal = () => {
    closeModal();
    setSelectedEvent(null);
  };

  return (
    <>
      <PageMeta
        title="React.js Calendar Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Calendar Dashboard page for TailAdmin"
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        {isLoading && (
          <div className="text-sm text-gray-500 mb-2 animate-pulse">
            Memuat data tugas...
          </div>
        )}
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "dayGridMonth,timeGridWeek",
            }}
            events={events}
            selectable={false}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            eventContent={(eventInfo) => {
              const extendedProps = eventInfo.event.extendedProps as CalendarEvent["extendedProps"];
              const status = extendedProps?.status || "todo";
              const colorKey = statusColors[status.toLowerCase()] || "primary";
              const colorClass = `fc-bg-${colorKey}`;

              return (
                <div className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm w-full overflow-hidden`}>
                  <div className="fc-daygrid-event-dot"></div>
                  <div className="fc-event-title text-xs truncate">{eventInfo.event.title}</div>
                </div>
              );
            }}
          />
        </div>

        {/* Modal Tampilan Detail (Read-Only) */}
        <Modal
          isOpen={isOpen}
          onClose={handleCloseModal}
          className="max-w-[600px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs rounded-full font-medium uppercase bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  Status: {selectedEvent?.extendedProps.status}
                </span>
              </div>
              <h5 className="mb-2 font-semibold text-gray-800 text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent?.title}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detail informasi kartu tugas yang terintegrasi dari Board.
              </p>
            </div>
            
            <div className="mt-6 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div>
                <span className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">Campaign</span>
                <span className="text-sm text-gray-800 dark:text-white/90">
                  {selectedEvent?.extendedProps.campaign?.name || "Tidak ada Campaign"}
                </span>
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">Board</span>
                <span className="text-sm text-gray-800 dark:text-white/90">
                  {selectedEvent?.extendedProps.board?.name || "Tidak ada Board"}
                </span>
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-2">Assignees</span>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent?.extendedProps.assignees && selectedEvent.extendedProps.assignees.length > 0 ? (
                    selectedEvent.extendedProps.assignees.map((user) => (
                      <div key={user.id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-gray-700 dark:text-gray-300">{user.name}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">Belum ada assignee</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 modal-footer">
              <button
                onClick={handleCloseModal}
                type="button"
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Calendar;