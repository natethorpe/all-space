// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\Calendar.jsx
// File Description:
// - Purpose: Wrapper component for SponsorCalendar (sponsorCalander.jsx) in the Woodkey Festival and Hi-Way Drive-In CRM, processes sponsor data into calendar events and passes interactivity handlers.
// - Functionality:
//   - Converts sponsor schedule data into calendar events (title, date, description).
//   - Renders SponsorCalendar with processed events and interactivity handlers (dateClick, eventClick).
//   - Displays a loading state while sponsor data is being fetched.
// - Structure:
//   - Takes sponsors, loading state, and handler props from Dashboard.jsx.
//   - Maps sponsor schedules into events array for FullCalendar.
//   - Renders SponsorCalendar with events and handlers.
// - Connections:
//   - Parent: Dashboard.jsx (passes sponsors, loading, and handlers).
//   - Child: SponsorCalendar (sponsorCalander.jsx) (renders the calendar).
//   - Props:
//     - sponsors: Array of sponsor objects with schedule data.
//     - loading: Boolean indicating if sponsor data is being fetched.
//     - handleDateClick: Handler for date clicks (opens event creation modal).
//     - handleEventClick: Handler for event clicks (opens event edit modal).
//   - Dependencies:
//     - sponsorCalander.jsx (FullCalendar component for rendering events).
//   - Styles: Uses FullCalendar’s default styles; can be customized via app.css.
// - Current Features:
//   - Displays sponsor events in a monthly calendar view.
//   - Supports interactivity via dateClick and eventClick handlers.
//   - Shows loading state while fetching sponsor data.
// - Status:
//   - As of 04/03/2025, integrated with Dashboard.jsx and sponsorCalander.jsx, rendering events correctly.
// - Updates (04/03/2025):
//   - Added loading state display to improve user experience.
//   - Ensured events are processed correctly from sponsor schedules.
//   - Why: Provides a seamless integration between Dashboard.jsx and sponsorCalander.jsx.
//   - How: Maps sponsor schedules to events, passes handlers to SponsorCalendar.
// - Future Enhancements:
//   - AI Integration:
//     - Use ai.js to suggest optimal event dates based on sponsor availability (predictive scheduling).
//   - Scalability:
//     - Implement lazy loading for events to handle large datasets (e.g., thousands of events).
//   - User Experience:
//     - Add event tooltips on hover to show more details without clicking.
//     - Support drag-and-drop to reschedule events (requires FullCalendar interaction plugin).
//   - Styling:
//     - Customize event colors based on sponsor tier (e.g., Very High: gold, High: silver).
// - Next Steps:
//   - Test event rendering with large datasets.
//   - Verify dateClick and eventClick handlers open modals correctly in Dashboard.jsx.
//   - Check for any z-index or overflow issues in the calendar.

import React from 'react';
import { Spin, Card } from 'antd';
import SponsorCalendar from '@/modules/sponsorModule/sponsorCalander';

const Calendar = ({ sponsors, loading, handleDateClick, handleEventClick }) => {
  console.log('Calendar rendering with sponsors:', sponsors);

  // Process sponsor schedules into calendar events
  const events = sponsors
    .filter(sponsor => sponsor.schedule && Array.isArray(sponsor.schedule))
    .flatMap(sponsor =>
      sponsor.schedule.map(event => ({
        id: `${sponsor._id}-${event.date}`,
        title: event.title,
        date: event.date,
        description: event.description,
        extendedProps: { description: event.description },
      }))
    );

  console.log('Processed events for calendar:', events);

  if (loading) {
    return (
      <Card title="Sponsor Calendar" style={{ marginBottom: '16px' }}>
        <Spin tip="Loading events..." />
      </Card>
    );
  }

  return (
    <Card title="Sponsor Calendar" style={{ marginBottom: '16px', width: '100%' }}>
      <SponsorCalendar
        events={events}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
      />
    </Card>
  );
};

export default Calendar;
