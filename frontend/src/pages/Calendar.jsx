/*
 * File: Calendar.jsx
 * Path: frontend/src/pages/Calendar.jsx
 * Purpose: Displays sponsor events in a calendar view in IDURAR ERP CRM.
 * Functionality:
 *   - Renders a FullCalendar with sponsor events.
 *   - Supports clicking dates/events to trigger modals.
 * Structure:
 *   - React component using FullCalendar with dayGrid and interaction plugins.
 * Dependencies:
 *   - @fullcalendar/react, dayGridPlugin, interactionPlugin: Calendar UI and interactivity.
 * Connections:
 *   - Depends on: Dashboard.jsx (passes sponsors, handlers).
 *   - Used by: Dashboard.jsx (child component).
 * Updates:
 *   - 04/07/2025: Fixed event mapping with sponsor.schedule.
 *   - 04/07/2025 (Grok 3): Updated to use sponsor.events instead of schedule.
 *     - Why: Events added but not showing—backend uses events array, not schedule.
 *     - How: Changed mapping to sponsor.events, kept _id fallback.
 *     - Impact: Displays events added via POST /sponsors/:id/schedule.
 * Future Enhancements:
 *   - Add event creation via Grok prompt.
 *   - Support drag-and-drop rescheduling.
 * Known Issues:
 *   - None post-04/07 fix; previously looked for wrong array (schedule).
 */

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const Calendar = ({ sponsors, loading, handleDateClick, handleEventClick }) => {
  if (loading) return <div>Loading calendar...</div>;

  const events = sponsors.flatMap((sponsor) =>
    (sponsor.events || []).map((event) => ({
      title: `${sponsor.name} - ${event.title}`,
      start: new Date(event.date),
      id: `${sponsor._id}-${event._id || event.title}`, // Use _id, fallback to title
      description: event.description || 'No description',
    }))
  );

  console.log('Calendar events:', events);

  return (
    <div style={{ padding: '16px' }}>
      <h3>Sponsor Events Calendar</h3>
      {events.length === 0 && <p>No events to display.</p>}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
      />
    </div>
  );
};

export default Calendar;
