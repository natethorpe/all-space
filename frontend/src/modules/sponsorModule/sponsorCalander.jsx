import React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const SponsorCalendar = ({ events, onDateClick, onEventClick }) => {
  return (
    <div className="sponsor-calendar-container">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="start" // Assuming events are single-day for simplicity
        style={{ height: 500 }}
        onSelectSlot={(slotInfo) => onDateClick(slotInfo.start.toISOString().split('T')[0])}
        onSelectEvent={onEventClick}
        selectable
        defaultDate={new Date(2025, 3, 2)} // April 2, 2025 (month is 0-based)
      />
      <style jsx>{`
        .sponsor-calendar-container :global(.rbc-calendar) {
          font-family: 'Arial', sans-serif;
        }
        .sponsor-calendar-container :global(.rbc-header) {
          background-color: #f5f5f5;
          padding: 8px;
        }
        .sponsor-calendar-container :global(.rbc-event) {
          background-color: #1890ff;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default SponsorCalendar;