// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\pages\utils.js
// Description:
// - Purpose: Contains utility functions for mapping data in Dashboard.jsx.
// - Functionality: Maps sponsors to events and pending notifications for calendar and notifications sections.
// - Updates (04/02/2025): Created to extract mapping logic from Dashboard.jsx (Nate’s instruction).
// - Connections:
//   - Components: Dashboard.jsx (imports these utilities).
// - Next Steps: Test utilities in Dashboard.jsx, ensure calendar and notifications render correctly.

export const mapEvents = (filteredSponsors) => {
    return filteredSponsors.flatMap(sponsor => sponsor.schedule?.map(event => ({
      id: `${sponsor._id}-${event._id}`,
      title: `${sponsor.name} - ${event.title}`,
      start: new Date(event.date).toISOString(),
      description: event.description || 'No description',
    })) || []);
  };
  
  export const mapPendingNotifications = (filteredSponsors) => {
    return filteredSponsors.flatMap(sponsor => sponsor.email_tasks?.filter(task => task.status === 'Pending').map(task => ({
      message: `${sponsor.name} - Email due: ${task.subject || 'Untitled'} (Due: ${new Date(task.due_date || task.created).toLocaleDateString()})`,
      type: 'warning',
      sponsorId: sponsor._id,
      taskId: task._id,
    })) || []);
  };
  