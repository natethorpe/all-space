/*
 * File: handlers.js
 * Path: frontend/src/pages/handlers.js
 * Purpose: Handler functions for sponsor-related actions in IDURAR ERP CRM.
 * Functionality:
 *   - Handles email sending, event addition, sponsor creation, and updates.
 * Structure:
 *   - Async functions using api from request.js, Redux dispatch for updates.
 * Dependencies:
 *   - request/request: API utility (api).
 *   - redux/sponsors/actions: updateSponsor action.
 * Connections:
 *   - Used by: Dashboard.jsx (event add, sponsor add), SponsorHub.jsx (edit).
 * Updates:
 *   - 04/08/2025: Swapped static message for messageApi.
 *   - 04/07/2025 (Grok 3): No changes—verified alignment with new backend routes.
 *     - Why: Edit/add event/add sponsor 404s fixed by backend POST/PUT.
 *     - How: Confirmed api.post/put calls match coreApi.js routes.
 *     - Impact: CRUD fully functional with backend updates.
 * Future Enhancements:
 *   - Add email template previews.
 *   - Batch event updates.
 * Known Issues:
 *   - None post-backend fixes; previously blocked by missing routes.
 */

import api from '@/request/request';
import { updateSponsor } from '@/redux/sponsors/actions';

export const handleEmailSend = async (emailData, setEmailModalVisible, messageApi) => {
  try {
    const response = await api.post(`/sponsors/${emailData.sponsorId}/email`, emailData);
    setEmailModalVisible(false);
    messageApi.success({
      content: 'Email sent successfully!',
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    return response.data;
  } catch (error) {
    messageApi.error({
      content: 'Failed to send email: ' + error.message,
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    throw error;
  }
};

export const handleEventAdd = async (eventData, setEventModalVisible, messageApi) => {
  try {
    const { sponsorId, title, date, description } = eventData;
    const payload = { title, date, description };
    console.log('handleEventAdd - Payload before API call:', payload);
    const response = await api.post(`/sponsors/${sponsorId}/schedule`, payload);
    console.log('handleEventAdd - Response:', response.data);
    setEventModalVisible(false);
    messageApi.success({
      content: 'Event added successfully!',
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    return response.data;
  } catch (error) {
    console.error('handleEventAdd - Error:', error.response?.data || error.message);
    messageApi.error({
      content: 'Failed to add event: ' + error.message,
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    throw error;
  }
};

export const handleAddSponsor = async (sponsorData, setAddModalVisible, messageApi, form) => {
  try {
    const response = await api.post('/sponsors', sponsorData);
    setAddModalVisible(false);
    if (form && form.resetFields) form.resetFields();
    messageApi.success({
      content: 'Sponsor added successfully!',
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    return response.data;
  } catch (error) {
    messageApi.error({
      content: 'Failed to add sponsor: ' + error.message,
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    throw error;
  }
};

export const handleEditSponsor = async (sponsorData, setEditModalVisible, messageApi, form, dispatch) => {
  try {
    const response = await dispatch(updateSponsor(sponsorData)).unwrap();
    setEditModalVisible(false);
    if (form && form.resetFields) form.resetFields();
    messageApi.success({
      content: 'Sponsor updated successfully!',
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    return response;
  } catch (error) {
    messageApi.error({
      content: 'Failed to update sponsor: ' + error.message,
      duration: 3,
      style: { marginTop: '20px', zIndex: 10000 },
    });
    throw error;
  }
};
