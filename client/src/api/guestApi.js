import axiosClient from './axiosClient';

export const createGuestSummaryApi = async (url) =>
  (await axiosClient.post('/guest/summary', { url })).data;

export const askGuestVideoApi = async ({ sessionId, query }) =>
  (await axiosClient.post('/guest/ask', { sessionId, query })).data;
