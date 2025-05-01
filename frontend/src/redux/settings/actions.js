// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\settings\actions.js

import * as actionTypes from './types';
import request from '@/request';

const dispatchSettingsData = (datas) => {
  console.log('dispatchSettingsData called with:', datas);
  const settingsCategory = {};
  datas.map((data) => {
    settingsCategory[data.settingCategory] = {
      ...settingsCategory[data.settingCategory],
      [data.settingKey]: data.settingValue,
    };
  });
  console.log('Processed settingsCategory:', settingsCategory);
  return settingsCategory;
};

export const settingsAction = {
  resetState: () => (dispatch) => {
    console.log('resetState action dispatched');
    dispatch({
      type: actionTypes.RESET_STATE,
    });
  },

  updateCurrency: ({ data }) => async (dispatch) => {
    console.log('updateCurrency called with data:', data);
    dispatch({
      type: actionTypes.UPDATE_CURRENCY,
      payload: data,
    });
  },

  update: ({ entity, settingKey, jsonData }) => async (dispatch) => {
    console.log('update called with:', { entity, settingKey, jsonData });
    dispatch({ type: actionTypes.REQUEST_LOADING });

    let data = await request.patch({
      entity: entity + '/updateBySettingKey/' + settingKey,
      jsonData,
    });
    console.log('Patch response:', data);

    if (data.success === true) {
      console.log('Patch successful, fetching updated settings');
      dispatch({ type: actionTypes.REQUEST_LOADING });

      let listData = await request.listAll({ entity });
      console.log('listAll response in update:', listData);

      if (listData.success === true) {
        const payload = dispatchSettingsData(listData.result);
        window.localStorage.setItem('settings', JSON.stringify(payload));
        console.log('Settings saved to localStorage:', payload);
        dispatch({
          type: actionTypes.REQUEST_SUCCESS,
          payload,
        });
      } else {
        console.log('listAll failed in update:', listData);
        dispatch({ type: actionTypes.REQUEST_FAILED });
      }
    } else {
      console.log('Patch failed:', data);
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  },

  updateMany: ({ entity, jsonData }) => async (dispatch) => {
    console.log('updateMany called with:', { entity, jsonData });
    dispatch({ type: actionTypes.REQUEST_LOADING });

    let data = await request.patch({
      entity: entity + '/updateManySetting',
      jsonData,
    });
    console.log('Patch response in updateMany:', data);

    if (data.success === true) {
      console.log('Patch successful in updateMany, fetching updated settings');
      dispatch({ type: actionTypes.REQUEST_LOADING });

      let listData = await request.listAll({ entity });
      console.log('listAll response in updateMany:', listData);

      if (listData.success === true) {
        const payload = dispatchSettingsData(listData.result);
        window.localStorage.setItem('settings', JSON.stringify(payload));
        console.log('Settings saved to localStorage in updateMany:', payload);
        dispatch({
          type: actionTypes.REQUEST_SUCCESS,
          payload,
        });
      } else {
        console.log('listAll failed in updateMany:', listData);
        dispatch({ type: actionTypes.REQUEST_FAILED });
      }
    } else {
      console.log('Patch failed in updateMany:', data);
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  },

  list: ({ entity }) => async (dispatch) => {
    console.log('list called with entity:', entity);
    dispatch({ type: actionTypes.REQUEST_LOADING });

    try {
      let data = await request.listAll({ entity });
      console.log('listAll raw response:', data);
      console.log('listAll success:', data.success, 'result length:', data.result?.length || 0);

      if (data.success === true || (data.success === false && data.message === 'Collection is Empty')) {
        const payload = dispatchSettingsData(data.result || []);
        window.localStorage.setItem('settings', JSON.stringify(payload));
        console.log('Settings saved to localStorage in list:', payload);
        dispatch({
          type: actionTypes.REQUEST_SUCCESS,
          payload,
        });
      } else {
        console.error('listAll failed in list:', data);
        dispatch({ type: actionTypes.REQUEST_FAILED, payload: data.message });
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
      dispatch({ type: actionTypes.REQUEST_FAILED, payload: error.message });
    }
  },

  upload: ({ entity, settingKey, jsonData }) => async (dispatch) => {
    console.log('upload called with:', { entity, settingKey, jsonData });
    dispatch({ type: actionTypes.REQUEST_LOADING });

    let data = await request.upload({
      entity: entity,
      id: settingKey,
      jsonData,
    });
    console.log('Upload response:', data);

    if (data.success === true) {
      console.log('Upload successful, fetching updated settings');
      dispatch({ type: actionTypes.REQUEST_LOADING });

      let listData = await request.listAll({ entity });
      console.log('listAll response in upload:', listData);

      if (listData.success === true) {
        const payload = dispatchSettingsData(listData.result);
        window.localStorage.setItem('settings', JSON.stringify(payload));
        console.log('Settings saved to localStorage in upload:', payload);
        dispatch({
          type: actionTypes.REQUEST_SUCCESS,
          payload,
        });
      } else {
        console.log('listAll failed in upload:', listData);
        dispatch({ type: actionTypes.REQUEST_FAILED });
      }
    } else {
      console.log('Upload failed:', data);
      dispatch({ type: actionTypes.REQUEST_FAILED });
    }
  },
};
